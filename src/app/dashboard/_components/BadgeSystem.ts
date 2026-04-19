// ─────────────────────────────────────────────
// SniperVision — Badge System
// Runs after each journal save to check & award badges
// ─────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export interface BadgeDef {
  id: string
  name: string
  icon: string
  description: string
  category: 'challenge' | 'performance' | 'prop' | 'platform'
}

export const BADGES: BadgeDef[] = [
  // Challenge
  { id: 'first_blood',    name: 'First Blood',     icon: '🩸', description: 'Complete your first challenge day with a profit',          category: 'challenge' },
  { id: 'on_fire',        name: 'On Fire',          icon: '🔥', description: '5 consecutive green challenge days',                       category: 'challenge' },
  { id: 'compounder',     name: 'Compounder',       icon: '📈', description: '10 consecutive green challenge days',                      category: 'challenge' },
  { id: 'diamond_hands',  name: 'Diamond Hands',    icon: '💎', description: 'Complete a 30-day challenge',                             category: 'challenge' },
  { id: 'century',        name: 'Century',          icon: '💯', description: 'Complete a 100-day challenge',                            category: 'challenge' },
  { id: 'to_the_moon',    name: 'To The Moon',      icon: '🚀', description: 'Double your account in any challenge',                    category: 'challenge' },
  { id: 'sniper_badge',   name: 'Sniper',           icon: '⚡', description: 'Hit daily target with only 1 trade',                      category: 'challenge' },
  // Performance
  { id: 'consistent',     name: 'Consistent',       icon: '🎖️', description: 'Win rate above 60% for a full month (min 10 trades)',     category: 'performance' },
  { id: 'sharp_shooter',  name: 'Sharp Shooter',    icon: '🎯', description: 'Win rate above 75% for a week (min 5 trades)',             category: 'performance' },
  { id: 'risk_manager',   name: 'Risk Manager',     icon: '🛡️', description: '20+ trades taken with a positive win rate',               category: 'performance' },
  { id: 'clean_sheet',    name: 'Clean Sheet',      icon: '✅', description: '5 wins in a row with zero losses',                        category: 'performance' },
  // Prop
  { id: 'funded_ready',   name: 'Funded Ready',     icon: '🏆', description: 'Zero rule violations for 10+ prop mode trades',           category: 'prop' },
  { id: 'rule_keeper',    name: 'Rule Keeper',       icon: '📋', description: '20+ prop mode trades without a daily DD breach',         category: 'prop' },
  // Platform
  { id: 'early_adopter',  name: 'Early Adopter',    icon: '🌱', description: 'Account created in 2025',                                 category: 'platform' },
  { id: 'veteran',        name: 'Veteran',          icon: '🎗️', description: 'Active on platform for 6+ months',                       category: 'platform' },
]

export async function checkAndAwardBadges(userId: string, supabase: SupabaseClient) {
  // Load existing badges
  const { data: existing } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId)
  const earned = new Set((existing || []).map((b: any) => b.badge_id))

  // Load all journal entries
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('created_at,outcome,mode,pnl_home_currency,taken_trade')
    .eq('user_id', userId)
    .in('outcome', ['win', 'loss', 'breakeven', 'skipped'])
    .order('created_at')
  if (!entries) return []

  const closed    = entries.filter(e => e.outcome === 'win' || e.outcome === 'loss')
  const wins      = closed.filter(e => e.outcome === 'win')
  const losses    = closed.filter(e => e.outcome === 'loss')
  const challenge = entries.filter(e => e.mode === 'challenge')
  const prop      = entries.filter(e => e.mode === 'prop')

  const newBadges: string[] = []

  async function award(id: string) {
    if (earned.has(id)) return
    const { error } = await supabase.from('user_badges').insert({ user_id: userId, badge_id: id })
    if (!error) { earned.add(id); newBadges.push(id) }
  }

  // ── Challenge badges ─────────────────────────

  // first_blood: first challenge trade that's a win
  if (challenge.some(e => e.outcome === 'win')) await award('first_blood')

  // Consecutive green challenge days
  if (challenge.length > 0) {
    // Group by day
    const dayMap: Record<string, number> = {}
    challenge.forEach(e => {
      const day = e.created_at?.split('T')[0] || ''
      dayMap[day] = (dayMap[day] || 0) + (e.pnl_home_currency || 0)
    })
    const days = Object.values(dayMap)
    let streak = 0; let maxStreak = 0
    days.forEach(v => { if (v > 0) { streak++; maxStreak = Math.max(maxStreak, streak) } else streak = 0 })
    if (maxStreak >= 5)  await award('on_fire')
    if (maxStreak >= 10) await award('compounder')
  }

  // sniper_badge: any challenge day with exactly 1 trade that hit target (profit > 0)
  if (challenge.length > 0) {
    const dayTrades: Record<string, typeof challenge> = {}
    challenge.forEach(e => {
      const day = e.created_at?.split('T')[0] || ''
      if (!dayTrades[day]) dayTrades[day] = []
      dayTrades[day].push(e)
    })
    const sniperDay = Object.values(dayTrades).some(ts => ts.length === 1 && (ts[0].pnl_home_currency || 0) > 0)
    if (sniperDay) await award('sniper_badge')
  }

  // to_the_moon: challenge account doubled (compute from challenge_sessions)
  const { data: sessions } = await supabase
    .from('challenge_sessions')
    .select('start_balance,current_balance')
    .eq('user_id', userId)
  if (sessions?.some((s: any) => s.current_balance >= s.start_balance * 2)) await award('to_the_moon')

  // diamond_hands / century: completed challenges
  const { data: completedSessions } = await supabase
    .from('challenge_sessions')
    .select('total_days,status')
    .eq('user_id', userId)
    .eq('status', 'completed')
  if (completedSessions) {
    if (completedSessions.some((s: any) => s.total_days >= 30))  await award('diamond_hands')
    if (completedSessions.some((s: any) => s.total_days >= 100)) await award('century')
  }

  // ── Performance badges ───────────────────────

  // clean_sheet: 5 consecutive wins
  let consec = 0; let maxConsec = 0
  closed.forEach(e => { if (e.outcome === 'win') { consec++; maxConsec = Math.max(maxConsec, consec) } else consec = 0 })
  if (maxConsec >= 5) await award('clean_sheet')

  // risk_manager: 20+ closed trades with positive win rate
  if (closed.length >= 20 && wins.length > losses.length) await award('risk_manager')

  // sharp_shooter: win rate >75% in any rolling 5-trade window
  if (closed.length >= 5) {
    for (let i = 0; i <= closed.length - 5; i++) {
      const window = closed.slice(i, i + 5)
      if (window.filter(e => e.outcome === 'win').length >= 4) { await award('sharp_shooter'); break }
    }
  }

  // consistent: win rate >60% in last month (min 10 trades)
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
  const monthTrades = closed.filter(e => new Date(e.created_at) >= monthAgo)
  if (monthTrades.length >= 10 && monthTrades.filter(e => e.outcome === 'win').length / monthTrades.length > 0.6) {
    await award('consistent')
  }

  // ── Prop badges ──────────────────────────────
  if (prop.length >= 10) await award('funded_ready')
  if (prop.length >= 20) await award('rule_keeper')

  // ── Platform badges ──────────────────────────
  const { data: profileRow } = await supabase.from('profiles').select('created_at').eq('id', userId).single()
  if (profileRow?.created_at) {
    const created = new Date(profileRow.created_at)
    if (created.getFullYear() <= 2025) await award('early_adopter')
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (created < sixMonthsAgo) await award('veteran')
  }

  return newBadges
}
