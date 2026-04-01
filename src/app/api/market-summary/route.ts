import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'


export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Module-level cache — resets on server restart, refreshes every hour
let cache: { data: object; ts: number } | null = null
const TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.ts < TTL) {
    return NextResponse.json(cache.data)
  }

  const utcHour = new Date().getUTCHours()
  let session = 'Asian'
  if (utcHour >= 7  && utcHour < 9)  session = 'London Open'
  else if (utcHour >= 9  && utcHour < 12) session = 'London / NY Overlap'
  else if (utcHour >= 12 && utcHour < 17) session = 'New York'
  else if (utcHour >= 17 && utcHour < 20) session = 'NY Close'

  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })

  const prompt = `You are a senior forex and multi-market analyst producing a daily session brief for active traders.
Date: ${new Date().toUTCString()} | Session: ${session} | Day: ${day}

Return ONLY a single valid JSON object — no markdown, no backticks, no extra text:
{
  "session": "${session}",
  "sentiment": "RISK-ON" | "RISK-OFF" | "MIXED",
  "headline": "one punchy sentence, max 12 words, on the dominant macro theme today",
  "outlook": "2-3 sentences describing what traders should expect this session — key drivers, likely direction",
  "watchlist": ["PAIR1", "PAIR2", "PAIR3"],
  "keyTheme": "the single most important thing to watch today, max 10 words",
  "caution": "one specific risk or trap to be aware of right now, max 15 words",
  "dxyBias": "BULLISH" | "BEARISH" | "NEUTRAL"
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.3,
      system: 'You are a professional market analyst. Respond ONLY with valid JSON, no markdown, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text
    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    const data  = JSON.parse(text.slice(start, end + 1))
    const result = { ...data, generatedAt: new Date().toISOString() }

    cache = { data: result, ts: now }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Market summary error:', e)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
