import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
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

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // ── 1. Get authenticated user from Supabase session ──
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to run an analysis.' },
        { status: 401 }
      )
    }

    // ── 2. Load their profile from database ──
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Profile might not exist yet — create it on the fly
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          tier: 'free',
          daily_analyses_used: 0,
          home_currency: 'ZAR',
          default_trading_currency: 'GBP',
          account_type: 'micro',
          account_balance: 0,
        })
        .select()
        .single()

      if (createError || !newProfile) {
        return NextResponse.json(
          { error: 'Could not load your profile. Please try logging out and back in.' },
          { status: 404 }
        )
      }

      // Use the newly created profile
      return await runAnalysis(request, supabase, user.id, newProfile as UserProfile)
    }

    return await runAnalysis(request, supabase, user.id, profile as UserProfile)

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function runAnalysis(
  request: NextRequest,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  profile: UserProfile
) {
  // ── 3. Check daily limit based on their tier ──
  const tier = profile.tier as Tier
  const limit = TIER_LIMITS[tier]
  const today = new Date().toISOString().split('T')[0]

  let dailyUsed = profile.daily_analyses_used
  if (profile.last_analysis_date !== today) {
    dailyUsed = 0 // Reset counter — new day
  }

  if (dailyUsed >= limit) {
    return NextResponse.json(
      {
        error: `You've used all ${limit} analyses for today. Upgrade your plan to get more.`,
        limit,
        used: dailyUsed,
        tier,
      },
      { status: 429 }
    )
  }

  // ── 4. Parse and validate the request ──
  const body = await request.json()
  const { imageBase64, imageType, settings, additionalImages } = body as {
    imageBase64: string
    imageType: string
    settings: AnalysisSettings
    additionalImages?: { imageBase64: string; imageType: string; label: string }[]
  }

  if (!imageBase64 || !settings) {
    return NextResponse.json(
      { error: 'Missing chart image or settings.' },
      { status: 400 }
    )
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    return NextResponse.json(
      { error: 'Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.' },
      { status: 400 }
    )
  }

  // Validate image size
  if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json(
      { error: `Image is too large. Please upload an image under ${MAX_IMAGE_SIZE_MB}MB.` },
      { status: 400 }
    )
  }

  // ── 5. Build the AI prompt using their real profile data ──
  const enrichedSettings: AnalysisSettings = {
    ...settings,
    homeCurrency: profile.home_currency as AnalysisSettings['homeCurrency'],
    accountType: profile.account_type as AnalysisSettings['accountType'],
    accountBalance: profile.account_balance || settings.accountBalance,
  }

  const prompt = buildAnalysisPrompt(enrichedSettings)

  // ── 6. Build image content array — primary chart + optional MTF charts ──
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
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: imageBlocks }],
  })

  // ── 8. Parse the AI response ──
  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
  let result: AnalysisResult

  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse AI response:', rawText)
    return NextResponse.json(
      { error: 'The AI returned an unexpected response. Please try again.' },
      { status: 500 }
    )
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
    result.fundamental     = ''
    result.setupQuality    = ''
    result.confluenceScore = 0
    result.killZone        = ''
    result.psychLevels     = ''
    result.patternProbability  = ''
    result.tradeManagement     = ''
    result.alternativeScenario = ''
  }

  if (!isPlatinumPlus) {
    // Premium users: no macro, SMC, or liquidity context
    result.macro            = ''
    result.smc              = ''
    result.liquidityContext = ''
  }

  // ── 9. Save the analysis record ──
  const { data: savedAnalysis } = await supabase
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
    .single()

  // ── 10. Auto-create a journal entry so the trade shows up in the Journal tab ──
  if (savedAnalysis?.id) {
    await supabase.from('journal_entries').insert({
      user_id: userId,
      analysis_id: savedAnalysis.id,
      asset: result.asset,
      bias: result.bias,
      strategy: enrichedSettings.strategy || 'Auto Select',
      entry_price: result.entry,
      home_currency: enrichedSettings.homeCurrency,
      outcome: 'live',
      taken_trade: true,
    })
  }

  // ── 11. Update their daily usage counter ──
  await supabase
    .from('profiles')
    .update({
      daily_analyses_used: dailyUsed + 1,
      last_analysis_date: today,
    })
    .eq('id', userId)

  // ── 12. Send back the result ──
  return NextResponse.json({
    result: { ...result, id: savedAnalysis?.id },
    dailyUsed: dailyUsed + 1,
    limit,
    tier,
  })
}