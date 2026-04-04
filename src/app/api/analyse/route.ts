import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildAnalysisPrompt } from '@/lib/prompt'
import { TIER_LIMITS, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BASE64_LENGTH, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import type { AnalysisSettings, AnalysisResult, Tier } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface UserProfile {
  id: string
  tier: string
  daily_analyses_used: number
  last_analysis_date: string | null
  home_currency: string
  default_trading_currency: string
  account_type: string
  account_balance: number
}

/**
 * Creates a Supabase server client that injects the user's access token as the
 * Authorization header on every PostgREST request. This ensures RLS policies
 * (which check auth.uid()) work correctly in Route Handlers regardless of whether
 * the session cookies have been refreshed by middleware.
 */
function createAuthedClient(accessToken: string) {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )
}

function send(writer: WritableStreamDefaultWriter<Uint8Array>, payload: object) {
  writer.write(new TextEncoder().encode(JSON.stringify(payload) + '\n\n'))
}

export async function POST(request: NextRequest) {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  // Run the analysis logic in the background, writing to the stream
  ;(async () => {
    try {
      // ── 1. Extract and verify the Bearer token ──
      send(writer, { type: 'progress', step: 'Verifying session...' })

      const authHeader = request.headers.get('Authorization')
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

      if (!bearerToken) {
        send(writer, { type: 'error', status: 401, message: 'You must be logged in to run an analysis.' })
        return
      }

      // Verify the token with Supabase Auth (checks it hasn't been tampered with / revoked)
      const cookieStore = cookies()
      const anonClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: () => {},
          },
        }
      )
      const { data: { user }, error: authError } = await anonClient.auth.getUser(bearerToken)

      if (authError || !user) {
        send(writer, { type: 'error', status: 401, message: 'You must be logged in to run an analysis.' })
        return
      }

      // Build an authed client that passes the JWT on all DB requests so RLS works
      const supabase = createAuthedClient(bearerToken)

      // ── 2. Load their profile from database ──
      send(writer, { type: 'progress', step: 'Loading your profile...' })

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // PGRST116 = no rows found (profile genuinely missing)
        // Any other error = DB/RLS issue — treat as server error, not missing profile
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError)
          send(writer, { type: 'error', status: 500, message: 'Could not load your profile. Please try again.' })
          return
        }
        send(writer, { type: 'error', status: 409, message: 'PROFILE_MISSING' })
        return
      }

      await runAnalysis(request, supabase, user.id, profile as UserProfile, writer)

    } catch (error) {
      console.error('Analysis error:', error)
      send(writer, { type: 'error', status: 500, message: 'Internal server error' })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, { headers })
}

async function runAnalysis(
  request: NextRequest,
  supabase: ReturnType<typeof createAuthedClient>,
  userId: string,
  profile: UserProfile,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  // ── 3. Check daily limit based on their tier ──
  const tier = profile.tier.toLowerCase() as Tier
  const limit = TIER_LIMITS[tier]
  const today = new Date().toISOString().split('T')[0]

  let dailyUsed = profile.daily_analyses_used
  if (profile.last_analysis_date !== today) {
    dailyUsed = 0 // Reset counter — new day
  }

  if (dailyUsed >= limit) {
    send(writer, {
      type: 'error',
      status: 429,
      message: `You've used all ${limit} analyses for today. Upgrade your plan to get more.`,
      limit,
      used: dailyUsed,
      tier,
    })
    return
  }

  // ── 4. Parse and validate the request ──
  send(writer, { type: 'progress', step: 'Reading chart structure...' })

  const body = await request.json()
  const { imageBase64, imageType, settings, additionalImages } = body as {
    imageBase64: string
    imageType: string
    settings: AnalysisSettings
    additionalImages?: { imageBase64: string; imageType: string; label: string }[]
  }

  if (!imageBase64 || !settings) {
    send(writer, { type: 'error', status: 400, message: 'Missing chart image or settings.' })
    return
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    send(writer, { type: 'error', status: 400, message: 'Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.' })
    return
  }

  // Validate image size
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    send(writer, { type: 'error', status: 400, message: `Image is too large. Please upload an image under ${MAX_IMAGE_SIZE_MB}MB.` })
    return
  }

  // ── 5. Check for live MT4/MT5 balance — takes priority over profile balance ──
  const { data: mt5Account } = await supabase
    .from('mt5_accounts')
    .select('balance, account_currency')
    .eq('user_id', userId)
    .single()

  const liveBalance = mt5Account?.balance || profile.account_balance || settings.accountBalance

  // ── 6. Build the AI prompt using their real profile data ──
  const enrichedSettings: AnalysisSettings = {
    ...settings,
    homeCurrency: profile.home_currency as AnalysisSettings['homeCurrency'],
    accountType: profile.account_type as AnalysisSettings['accountType'],
    accountBalance: liveBalance,
  }

  const prompt = buildAnalysisPrompt(enrichedSettings)

  // ── 7. Build image content array — primary chart + optional MTF charts ──
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } }
  type TextBlock  = { type: 'text'; text: string }

  const imageBlocks: (ImageBlock | TextBlock)[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: imageType as ImageBlock['source']['media_type'], data: imageBase64 },
    },
  ]

  // Attach MTF charts with labels so Claude knows which timeframe each chart is
  if (additionalImages?.length) {
    additionalImages.forEach(img => {
      imageBlocks.push({ type: 'text', text: `--- ${img.label} ---` })
      imageBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: img.imageType as ImageBlock['source']['media_type'], data: img.imageBase64 },
      })
    })
    imageBlocks.push({ type: 'text', text: `You have been provided ${1 + additionalImages.length} charts for multi-timeframe confluence analysis. The first image is the primary entry chart. Analyse ALL charts together and show how they confirm or conflict with each other in the storyline and reasoning fields.` })
  }

  imageBlocks.push({ type: 'text', text: prompt })

  // ── 7. Call Claude — API key is server-side only, never exposed ──
  send(writer, { type: 'progress', step: 'Detecting patterns & key levels...' })

  let rawText = ''
  let stream
  try {
    stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      temperature: 0,
      system: 'You are a professional forex and trading analyst. You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no preamble, no explanation. Your entire response must be parseable by JSON.parse().',
      messages: [{ role: 'user', content: imageBlocks }],
    })
  } catch (err: any) {
    if (err?.status === 429) {
      send(writer, {
        type: 'error',
        status: 429,
        message: 'High demand right now — please try again in 30 seconds.',
      })
      return
    }
    throw err
  }

  // Progress events during Claude processing
  let sentEntryStep = false
  let sentLotStep = false
  let sentCompileStep = false
  let charCount = 0

  try {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        rawText += chunk.delta.text
        charCount += chunk.delta.text.length

        // Send progress milestones based on approximate progress
        if (!sentEntryStep && charCount > 200) {
          send(writer, { type: 'progress', step: 'Computing entry, SL & TP levels...' })
          sentEntryStep = true
        }
        if (!sentLotStep && charCount > 800) {
          send(writer, { type: 'progress', step: 'Calculating lot sizes for your account...' })
          sentLotStep = true
        }
        if (!sentCompileStep && charCount > 1500) {
          send(writer, { type: 'progress', step: 'Compiling full analysis report...' })
          sentCompileStep = true
        }
      }
    }
  } catch (err: any) {
    if (err?.status === 429) {
      send(writer, {
        type: 'error',
        status: 429,
        message: 'High demand right now — please try again in 30 seconds.',
      })
      return
    }
    throw err
  }

  // ── 8. Parse the AI response ──
  // Claude sometimes wraps JSON in backticks or adds a preamble/postamble.
  // Extract the outermost { ... } block to be safe.
  let result: AnalysisResult

  try {
    const start = rawText.indexOf('{')
    const end   = rawText.lastIndexOf('}')
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No JSON object found in response')
    }
    result = JSON.parse(rawText.slice(start, end + 1))
    
  } catch {
    console.error('Failed to parse AI response:\n', rawText)
    send(writer, { type: 'error', status: 500, message: 'The AI returned an unexpected response. Please try again.' })
    return
  }
  // ── 8. Strip tier-gated fields server-side — CSS alone is not enough ──
  const isPremiumPlus  = tier === 'premium'  || tier === 'platinum' || tier === 'diamond'
  const isPlatinumPlus = tier === 'platinum' || tier === 'diamond'

  if (!isPremiumPlus) {
    // Free users: entry + SL + basic analysis only
    result.tp2 = ''
    result.tp3 = ''
    result.rr1 = ''
    result.rr2 = ''
    result.rr3 = ''
    result.lotConservative = ''
    result.lotModerate     = ''
    result.lotScaled       = ''
    result.riskCons        = ''
    result.riskMod         = ''
    result.riskScale       = ''
    result.profitCons      = ''
    result.profitMod       = ''
    result.profitScale     = ''
    result.eventRisk       = ''
    result.setupQuality    = ''
    result.confluenceScore = 0
    result.killZone        = ''
    result.psychLevels     = ''
    result.patternProbability  = ''
    result.tradeManagement     = ''
    result.alternativeScenario = ''
  }

  if (!isPlatinumPlus) {
    // Premium users: no fundamental, macro, SMC, liquidity, trade management, alternative scenario, or storyline
    result.fundamental         = ''
    result.macro               = ''
    result.smc                 = ''
    result.liquidityContext    = ''
    result.tradeManagement     = ''
    result.alternativeScenario = ''
    result.storyline           = ''
  }

  // ── 9. Save the analysis record and update profile in parallel ──
  send(writer, { type: 'progress', step: 'Saving analysis...' })

  const [savedAnalysis] = await Promise.all([
    supabase
      .from('analyses')
      .insert({
        user_id: userId,
        asset: result.asset,
        timeframe: result.timeframe,
        bias: result.bias,
        confidence: result.confidence,
        entry: result.entry,
        stop_loss: result.stopLoss,
        tp1: result.tp1,
        tp2: result.tp2,
        tp3: result.tp3,
        rr1: result.rr1,
        rr2: result.rr2,
        rr3: result.rr3,
        risk_rating: result.riskRating,
        technical: result.technical,
        patterns: result.patterns,
        key_levels: result.keyLevels,
        reasoning: result.reasoning,
        invalidation: result.invalidation,
        fundamental: result.fundamental,
        macro: result.macro,
        smc: result.smc,
        lot_conservative: result.lotConservative,
        lot_moderate: result.lotModerate,
        lot_scaled: result.lotScaled,
        risk_cons: result.riskCons,
        risk_mod: result.riskMod,
        risk_scale: result.riskScale,
        profit_cons: result.profitCons,
        profit_mod: result.profitMod,
        profit_scale: result.profitScale,
        event_risk: result.eventRisk,
        trading_currency: enrichedSettings.tradingCurrency,
        home_currency: enrichedSettings.homeCurrency,
        account_type: enrichedSettings.accountType,
        account_balance: enrichedSettings.accountBalance,
      })
      .select()
      .single(),
    supabase
      .from('profiles')
      .update({
        daily_analyses_used: dailyUsed + 1,
        last_analysis_date: today,
      })
      .eq('id', userId),
  ])

  // ── 10. Auto-create a journal entry so the trade shows up in the Journal tab ──
  if (savedAnalysis.data?.id) {
    await supabase.from('journal_entries').insert({
      user_id: userId,
      analysis_id: savedAnalysis.data.id,
      asset: result.asset,
      bias: result.bias,
      strategy: enrichedSettings.strategy || 'Auto Select',
      entry_price: result.entry,
      home_currency: enrichedSettings.homeCurrency,
      outcome: 'live',
      taken_trade: true,
    })
  }

  // ── 11. Send back the result ──
  send(writer, {
    type: 'result',
    data: {
      result: { ...result, id: savedAnalysis.data?.id },
      dailyUsed: dailyUsed + 1,
      limit,
      tier,
    },
  })
}
