'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { CURRENCIES } from '@/lib/constants'
import toast from 'react-hot-toast'
import type { Currency } from '@/types'

interface ChallengeSession {
  id: string
  label: string
  start_balance: number
  daily_target_pct: number
  total_days: number
  current_day: number
  current_balance: number
  currency: string
  risk_per_trade: number | null
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  started_at: string
}

function targetBalance(start: number, pct: number, day: number) {
  return start * Math.pow(1 + pct / 100, day)
}

// ── Compound Curve SVG ─────────────────────────
function CompoundChart({
  session,
  actualByDay,
}: {
  session: ChallengeSession
  actualByDay: number[]  // cumulative actual balance per day (index 0 = day 0)
}) {
  const W = 100; const H = 60
  const days = session.total_days
  const pct  = session.daily_target_pct
  const start = session.start_balance

  const targets = Array.from({ length: days + 1 }, (_, d) => targetBalance(start, pct, d))
  const allVals  = [...targets, ...actualByDay].filter(v => v > 0)
  const minV = Math.min(...allVals) * 0.97
  const maxV = Math.max(...allVals) * 1.03
  const range = maxV - minV || 1

  function toX(day: number) { return (day / days) * W }
  function toY(val: number) { return H - ((val - minV) / range) * H }

  function buildPath(vals: number[], maxIdx?: number) {
    const pts = vals.slice(0, (maxIdx ?? vals.length - 1) + 1)
    return pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  }

  const targetPath = buildPath(targets)
  const actualPath = actualByDay.length > 1 ? buildPath(actualByDay) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      {/* Target line */}
      <path d={targetPath} fill="none" stroke="rgba(245,158,11,0.6)" strokeWidth="0.8" strokeDasharray="2,1.5" />
      {/* Actual line */}
      {actualPath && (
        <path d={actualPath} fill="none" stroke="var(--green)" strokeWidth="1.2" strokeLinecap="round" />
      )}
      {/* Today dot */}
      {actualByDay.length > 1 && (() => {
        const lastIdx = actualByDay.length - 1
        const x = toX(lastIdx); const y = toY(actualByDay[lastIdx])
        return <circle cx={x} cy={y} r="1.8" fill="var(--green)" />
      })()}
    </svg>
  )
}

// ── Setup Form ─────────────────────────────────
function ChallengeSetup({ onCreated }: { onCreated: () => void }) {
  const { profile } = useAppStore()
  const supabase = createClient()
  const [label, setLabel]   = useState('My Challenge')
  const [balance, setBalance] = useState('')
  const [dailyPct, setDailyPct] = useState(2)
  const [customPct, setCustomPct] = useState('')
  const [days, setDays] = useState(30)
  const [customDays, setCustomDays] = useState('')
  const [currency, setCurrency] = useState<Currency>((profile?.home_currency as Currency) || 'USD')
  const [riskPct, setRiskPct] = useState('1')
  const [saving, setSaving] = useState(false)

  const PCT_PRESETS = [1, 2, 3, 5]
  const DAY_PRESETS = [10, 20, 30, 60, 90]
  const finalPct  = customPct  ? parseFloat(customPct)  : dailyPct
  const finalDays = customDays ? parseInt(customDays)   : days

  const previewEnd = balance ? targetBalance(parseFloat(balance), finalPct, finalDays) : null
  const curr = CURRENCIES.find(c => c.code === currency)

  async function create() {
    if (!profile) return
    if (!balance || isNaN(parseFloat(balance))) { toast.error('Enter a starting balance'); return }
    if (finalPct <= 0 || finalDays <= 0) { toast.error('Check daily % and days'); return }
    setSaving(true)
    const start = parseFloat(balance)
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + finalDays)

    const { error } = await supabase.from('challenge_sessions').insert({
      user_id:          profile.id,
      label,
      start_balance:    start,
      daily_target_pct: finalPct,
      total_days:       finalDays,
      current_day:      0,
      current_balance:  start,
      currency,
      risk_per_trade:   riskPct ? parseFloat(riskPct) : null,
      status:           'active',
      ends_at:          endsAt.toISOString(),
    })
    setSaving(false)
    if (error) { toast.error('Could not start challenge'); return }
    toast.success('Challenge started! Let\'s go 🚀')
    onCreated()
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2.5">
        <span className="text-[18px]">⚔️</span>
        <h2 className="text-[14px] font-extrabold tracking-tight flex-1">Start a Challenge</h2>
        <span className="text-[9px] font-mono-tv text-[var(--green)] bg-[var(--green-dim)] px-2 py-0.5 rounded-full">CHALLENGE MODE</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Label */}
        <div>
          <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">CHALLENGE NAME</div>
          <input className="tv-input" value={label} onChange={e => setLabel(e.target.value)} placeholder="My 30-Day Challenge" maxLength={50} />
        </div>

        {/* Balance + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">STARTING BALANCE</div>
            <input className="tv-input" type="number" min="1" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 1000" />
          </div>
          <div>
            <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">CURRENCY</div>
            <select className="tv-select" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
          </div>
        </div>

        {/* Daily % */}
        <div>
          <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">DAILY TARGET %</div>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
            {PCT_PRESETS.map(p => (
              <button key={p}
                onClick={() => { setDailyPct(p); setCustomPct('') }}
                className={`py-2 sm:py-1.5 sm:px-3 rounded-[8px] text-[12px] font-bold border transition-all
                  ${dailyPct === p && !customPct
                    ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                    : 'border-[var(--border2)] text-[#777] hover:text-white'}`}>
                {p}%
              </button>
            ))}
            <input
              className="tv-input text-[12px] py-1.5 col-span-3 sm:w-[90px] sm:col-auto"
              type="number" min="0.1" max="100" step="0.1"
              placeholder="Custom %"
              value={customPct}
              onChange={e => setCustomPct(e.target.value)}
            />
          </div>
        </div>

        {/* Days */}
        <div>
          <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">NUMBER OF DAYS</div>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
            {DAY_PRESETS.map(d => (
              <button key={d}
                onClick={() => { setDays(d); setCustomDays('') }}
                className={`py-2 sm:py-1.5 sm:px-3 rounded-[8px] text-[12px] font-bold border transition-all
                  ${days === d && !customDays
                    ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                    : 'border-[var(--border2)] text-[#777] hover:text-white'}`}>
                {d}d
              </button>
            ))}
            <input
              className="tv-input text-[12px] py-1.5 col-span-3 sm:w-[90px] sm:col-auto"
              type="number" min="1" max="365"
              placeholder="Custom days"
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
            />
          </div>
        </div>

        {/* Risk per trade */}
        <div>
          <div className="text-[10px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">RISK PER TRADE %</div>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
            {['0.5','1','2'].map(r => (
              <button key={r}
                onClick={() => setRiskPct(r)}
                className={`py-2 sm:py-1.5 sm:px-3 rounded-[8px] text-[12px] font-bold border transition-all
                  ${riskPct === r
                    ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                    : 'border-[var(--border2)] text-[#777] hover:text-white'}`}>
                {r}%
              </button>
            ))}
            <input
              className="tv-input text-[12px] py-1.5 col-span-3 sm:w-[90px] sm:col-auto"
              type="number" min="0.1" max="10" step="0.1"
              placeholder="Custom %"
              value={!['0.5','1','2'].includes(riskPct) ? riskPct : ''}
              onChange={e => setRiskPct(e.target.value)}
            />
          </div>
        </div>

        {/* Preview */}
        {previewEnd && balance && (
          <div className="bg-[var(--surface2)] border border-[var(--border2)] rounded-[10px] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono-tv text-[#777] mb-0.5">TARGET AFTER {finalDays} DAYS</div>
              <div className="text-[18px] font-extrabold text-[var(--green)]">
                {curr?.symbol}{previewEnd.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-mono-tv text-[#777] mb-0.5">TOTAL GROWTH</div>
              <div className="text-[14px] font-bold text-[var(--amber)]">
                +{((previewEnd / parseFloat(balance) - 1) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button
          onClick={create}
          disabled={saving || !balance}
          className="btn-primary w-full py-3 rounded-[10px] text-[14px] disabled:opacity-50">
          {saving ? 'Starting...' : '🚀 Start Challenge →'}
        </button>
      </div>
    </div>
  )
}

// ── Challenge Dashboard ────────────────────────
function ChallengeDashboard({ session, onAbandon }: { session: ChallengeSession; onAbandon: () => void }) {
  const supabase = createClient()
  const { profile } = useAppStore()
  const [actualByDay, setActualByDay] = useState<number[]>([session.start_balance])
  const [actualBalance, setActualBalance] = useState(session.start_balance)
  const [currentDay, setCurrentDay] = useState(0)
  const [open, setOpen] = useState(true)
  const [abandoning, setAbandoning] = useState(false)

  const curr = CURRENCIES.find(c => c.code === session.currency)
  const todayTarget = targetBalance(session.start_balance, session.daily_target_pct, currentDay + 1)
  const finalTarget = targetBalance(session.start_balance, session.daily_target_pct, session.total_days)
  const daysLeft = session.total_days - currentDay
  const variance = actualBalance - todayTarget
  const varPct   = ((actualBalance / session.start_balance - 1) * 100)
  const progressPct = Math.min(100, (currentDay / session.total_days) * 100)

  // Status
  const status: 'ON TRACK' | 'AHEAD' | 'BEHIND' | 'FAILED' =
    actualBalance <= session.start_balance * 0.9  ? 'FAILED'
    : actualBalance >= todayTarget * 1.01          ? 'AHEAD'
    : actualBalance >= todayTarget * 0.99          ? 'ON TRACK'
    : 'BEHIND'
  const statusColor =
    status === 'FAILED'   ? 'var(--red)' :
    status === 'AHEAD'    ? 'var(--green)' :
    status === 'ON TRACK' ? 'var(--blue)' : 'var(--amber)'

  // Load journal entries for this challenge period and compute actual balance per day
  useEffect(() => {
    if (!profile) return
    async function load() {
      const { data } = await supabase
        .from('journal_entries')
        .select('created_at,pnl_home_currency,outcome')
        .eq('user_id', profile!.id)
        .eq('mode', 'challenge')
        .gte('created_at', session.started_at)
        .in('outcome', ['win', 'loss', 'breakeven'])
        .order('created_at')
      if (!data || data.length === 0) return

      // Group by day number relative to challenge start
      const startDate = new Date(session.started_at)
      const grouped: Record<number, number> = {}
      data.forEach(e => {
        const d = Math.floor((new Date(e.created_at).getTime() - startDate.getTime()) / 86400000) + 1
        if (!grouped[d]) grouped[d] = 0
        grouped[d] += e.pnl_home_currency || 0
      })

      // Build cumulative actual balance array (day 0 = start)
      const maxDay = Math.max(...Object.keys(grouped).map(Number))
      const arr: number[] = [session.start_balance]
      let running = session.start_balance
      for (let d = 1; d <= Math.min(maxDay, session.total_days); d++) {
        running += grouped[d] || 0
        arr.push(running)
      }
      setActualByDay(arr)
      setActualBalance(running)
      setCurrentDay(maxDay)

      // Auto-complete check
      if (maxDay >= session.total_days && session.status === 'active') {
        const newStatus = running >= session.start_balance ? 'completed' : 'failed'
        await supabase.from('challenge_sessions').update({ status: newStatus, current_balance: running }).eq('id', session.id)
      } else {
        await supabase.from('challenge_sessions').update({ current_day: maxDay, current_balance: running }).eq('id', session.id)
      }
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function abandon() {
    if (!confirm('Abandon this challenge? This cannot be undone.')) return
    setAbandoning(true)
    await supabase.from('challenge_sessions').update({ status: 'abandoned' }).eq('id', session.id)
    toast('Challenge abandoned', { icon: '🏳️' })
    onAbandon()
    setAbandoning(false)
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden mb-5">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface2)] transition-colors text-left border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[18px]">⚔️</span>
          <div className="min-w-0">
            <div className="text-[13px] font-extrabold text-white truncate">{session.label}</div>
            <div className="text-[9px] font-mono-tv text-[#777]">Day {currentDay} / {session.total_days} · {daysLeft}d remaining</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono-tv"
            style={{ color: statusColor, borderColor: statusColor + '44', background: statusColor + '18' }}>
            {status}
          </span>
          <span className="text-[10px] text-[#555]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'CURRENT BALANCE',    val: `${curr?.symbol}${actualBalance.toFixed(2)}`,            color: actualBalance >= session.start_balance ? 'var(--green)' : 'var(--red)' },
              { label: `TODAY'S TARGET`,      val: `${curr?.symbol}${todayTarget.toFixed(2)}`,              color: 'var(--amber)' },
              { label: 'DAYS REMAINING',      val: `${Math.max(0, daysLeft)}d`,                             color: 'var(--blue)' },
              { label: 'GROWTH',              val: `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%`,        color: varPct >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-3 py-2.5">
                <div className="text-[8px] font-mono-tv font-bold tracking-wider text-[#555] mb-1">{s.label}</div>
                <div className="text-[14px] font-extrabold font-mono-tv" style={{ color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Compound curve */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">COMPOUND CURVE</span>
              <div className="flex items-center gap-3 text-[8px] font-mono-tv text-[#555]">
                <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-[rgba(245,158,11,0.6)]"/> Target</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-[var(--green)]"/> Actual</span>
              </div>
            </div>
            <div className="bg-[var(--surface2)] rounded-[10px] p-2 border border-[var(--border)]">
              <CompoundChart session={session} actualByDay={actualByDay} />
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">CHALLENGE PROGRESS</span>
              <span className="text-[9px] font-mono-tv text-[#777]">Day {currentDay}/{session.total_days}</span>
            </div>
            <div className="h-2 bg-[var(--border2)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: statusColor }} />
            </div>
          </div>

          {/* Target on completion */}
          <div className="flex items-center justify-between text-[10px] bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-3 py-2">
            <span className="text-[#777]">Final target ({session.total_days}d)</span>
            <span className="font-bold font-mono-tv text-[var(--amber)]">
              {curr?.symbol}{finalTarget.toFixed(2)}
              <span className="text-[#555] ml-1 font-normal">
                (+{((finalTarget / session.start_balance - 1) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>

          {/* Variance */}
          <div className={`flex items-center justify-between text-[10px] rounded-[8px] px-3 py-2 border
            ${variance >= 0
              ? 'bg-[rgba(34,197,94,0.07)] border-[rgba(34,197,94,0.2)]'
              : 'bg-[rgba(239,68,68,0.07)] border-[rgba(239,68,68,0.2)]'}`}>
            <span className="text-[#777]">vs. today's target</span>
            <span className="font-bold font-mono-tv" style={{ color: variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {variance >= 0 ? '+' : ''}{curr?.symbol}{Math.abs(variance).toFixed(2)}
            </span>
          </div>

          {/* Daily target info */}
          <div className="text-[9px] font-mono-tv text-[#555] flex items-center justify-between">
            <span>Daily target: {session.daily_target_pct}% · Risk/trade: {session.risk_per_trade ? `${session.risk_per_trade}%` : 'not set'}</span>
            <button
              onClick={abandon}
              disabled={abandoning}
              className="text-[var(--red)] hover:underline text-[9px] disabled:opacity-40">
              🏳 Abandon challenge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Export ────────────────────────────────
export default function ChallengeWidget() {
  const { profile, activeMode } = useAppStore()
  const supabase = createClient()
  const [session, setSession] = useState<ChallengeSession | null | undefined>(undefined)

  async function loadSession() {
    if (!profile) return
    const { data } = await supabase
      .from('challenge_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSession(data || null)
  }

  useEffect(() => { if (profile) loadSession() }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (activeMode !== 'challenge') return null
  if (session === undefined) return null // still loading

  if (!session) return <ChallengeSetup onCreated={loadSession} />
  return <ChallengeDashboard session={session} onAbandon={() => setSession(null)} />
}
