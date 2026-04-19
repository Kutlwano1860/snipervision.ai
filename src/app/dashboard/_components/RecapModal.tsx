'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getCurrency } from '@/lib/constants'

type RecapPeriod = 'weekly' | 'monthly' | 'yearly'

interface TradeEntry {
  id: string
  created_at: string
  outcome: string
  pnl_home_currency: number
  asset: string
  strategy: string
  bias: string
  entry_price: string
  exit_price: string
  mode: string
}

// ── Donut Chart ────────────────────────────────
function DonutChart({ wins, losses, breakevens }: { wins: number; losses: number; breakevens: number }) {
  const total = wins + losses + breakevens
  if (total === 0) return (
    <div className="flex items-center justify-center w-[110px] h-[110px] rounded-full border-4 border-[var(--border2)]">
      <span className="text-[10px] text-[#555] font-mono-tv">No data</span>
    </div>
  )

  const R = 42; const cx = 55; const cy = 55
  const circ = 2 * Math.PI * R

  function slice(value: number, offset: number, color: string, label: string) {
    if (value === 0) return null
    const pct = value / total
    const dash = pct * circ
    const gap  = circ - dash
    return (
      <circle key={label} cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    )
  }

  const winDash   = (wins / total) * circ
  const lossDash  = (losses / total) * circ
  const beDash    = (breakevens / total) * circ

  const winPct = Math.round((wins / total) * 100)

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <svg width="110" height="110" className="-rotate-90">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border2)" strokeWidth="14" />
          {/* Losses (red) — first */}
          {losses > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--red)" strokeWidth="14"
              strokeDasharray={`${lossDash} ${circ - lossDash}`}
              strokeDashoffset={0} />
          )}
          {/* Breakevens (amber) — after losses */}
          {breakevens > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--amber)" strokeWidth="14"
              strokeDasharray={`${beDash} ${circ - beDash}`}
              strokeDashoffset={-lossDash} />
          )}
          {/* Wins (green) — after losses + BEs */}
          {wins > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--green)" strokeWidth="14"
              strokeDasharray={`${winDash} ${circ - winDash}`}
              strokeDashoffset={-(lossDash + beDash)} />
          )}
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[17px] font-extrabold font-mono-tv" style={{ color: winPct >= 50 ? 'var(--green)' : 'var(--red)' }}>
            {winPct}%
          </div>
          <div className="text-[7px] text-[#555] font-mono-tv">WIN RATE</div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5 text-[11px]">
        {[
          { label: 'Wins',        count: wins,       color: 'var(--green)' },
          { label: 'Losses',      count: losses,     color: 'var(--red)'   },
          { label: 'Break-even',  count: breakevens, color: 'var(--amber)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
            <span className="text-[#aaa]">{l.label}</span>
            <span className="font-bold font-mono-tv ml-auto pl-4" style={{ color: l.color }}>{l.count}</span>
          </div>
        ))}
        <div className="pt-1 border-t border-[var(--border)] flex items-center justify-between text-[10px]">
          <span className="text-[#555]">Total</span>
          <span className="font-bold text-white">{total}</span>
        </div>
      </div>
    </div>
  )
}

// ── Bar Chart (P&L per bar) ────────────────────
function BarChart({ bars }: { bars: { label: string; pnl: number }[] }) {
  if (bars.length === 0 || bars.every(b => b.pnl === 0)) return (
    <div className="flex items-center justify-center h-[100px] text-[11px] text-[#555]">No data for this period</div>
  )

  const maxAbs = Math.max(...bars.map(b => Math.abs(b.pnl)), 0.01)
  const W = 100; const H = 60; const barW = (W / bars.length) * 0.65
  const gap  = (W / bars.length) * 0.35
  const midY = H / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }} preserveAspectRatio="none">
      {/* Zero line */}
      <line x1="0" y1={midY} x2={W} y2={midY} stroke="var(--border2)" strokeWidth="0.4" />

      {bars.map((b, i) => {
        const x     = i * (W / bars.length) + gap / 2
        const ratio = Math.abs(b.pnl) / maxAbs
        const barH  = ratio * (H / 2 - 4)
        const isPos = b.pnl >= 0
        const y     = isPos ? midY - barH : midY
        const color = b.pnl > 0 ? 'var(--green)' : b.pnl < 0 ? 'var(--red)' : 'var(--border2)'

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 0.5)} fill={color} rx="0.8" opacity="0.85" />
            {/* Label */}
            <text x={x + barW / 2} y={H - 1} textAnchor="middle" fontSize="3.5" fill="#555" fontFamily="monospace">
              {b.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Trade Table ────────────────────────────────
function TradeTable({ trades, symbol }: { trades: TradeEntry[]; symbol: string }) {
  if (trades.length === 0) return (
    <div className="text-center py-6 text-[#555] text-[12px]">No trades in this period.</div>
  )

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11px] min-w-[480px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {['DATE', 'ASSET', 'BIAS', 'STRATEGY', 'OUTCOME', `P&L (${symbol})`].map(h => (
              <th key={h} className="text-left text-[8px] font-mono-tv font-bold tracking-widest text-[#555] pb-2 pr-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(e => {
            const pnl = e.pnl_home_currency || 0
            const outcomeColor =
              e.outcome === 'win'       ? 'var(--green)' :
              e.outcome === 'loss'      ? 'var(--red)'   :
              e.outcome === 'breakeven' ? 'var(--amber)'  : '#777'
            const outcomeLabel =
              e.outcome === 'win'       ? '✓ WIN'   :
              e.outcome === 'loss'      ? '✗ LOSS'  :
              e.outcome === 'breakeven' ? '➡ BE'    : e.outcome

            return (
              <tr key={e.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)] transition-colors">
                <td className="py-2 pr-3 text-[#777] font-mono-tv whitespace-nowrap">
                  {e.created_at?.substring(0, 10)}
                </td>
                <td className="py-2 pr-3 font-bold font-mono-tv whitespace-nowrap">{e.asset || '—'}</td>
                <td className={`py-2 pr-3 font-bold text-[10px] ${e.bias === 'BULLISH' ? 'text-[var(--green)]' : e.bias === 'BEARISH' ? 'text-[var(--red)]' : 'text-[#777]'}`}>
                  {e.bias === 'BULLISH' ? '▲' : e.bias === 'BEARISH' ? '▼' : '—'}
                </td>
                <td className="py-2 pr-3 text-[#777] whitespace-nowrap">{e.strategy || '—'}</td>
                <td className="py-2 pr-3">
                  <span className="font-bold font-mono-tv text-[10px]" style={{ color: outcomeColor }}>
                    {outcomeLabel}
                  </span>
                </td>
                <td className="py-2 font-bold font-mono-tv" style={{ color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : '#777' }}>
                  {pnl !== 0 ? `${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────
export default function RecapModal({ onClose }: { onClose: () => void }) {
  const { profile, activeMode } = useAppStore()
  const supabase = createClient()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [period, setPeriod] = useState<RecapPeriod>('weekly')
  const [entries, setEntries] = useState<TradeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { dialogRef.current?.showModal() }, [])

  const homeCurr = getCurrency((profile?.home_currency || 'ZAR') as any)

  const MODE_LABELS: Record<string, string> = {
    normal: 'Normal', prop: 'Prop Firm', challenge: 'Challenge',
  }
  const MODE_ICONS: Record<string, string> = {
    normal: '📊', prop: '🏢', challenge: '⚔️',
  }

  useEffect(() => {
    async function load() {
      if (!profile) return
      setLoading(true)
      const since = new Date(); since.setFullYear(since.getFullYear() - 1)
      // Only pull trades that belong to the current active mode
      const q = supabase
        .from('journal_entries')
        .select('id,created_at,outcome,pnl_home_currency,asset,strategy,bias,entry_price,exit_price,mode')
        .eq('user_id', profile.id)
        .in('outcome', ['win', 'loss', 'breakeven'])
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      // Normal mode = entries with mode = 'normal' OR no mode set (legacy)
      if (activeMode === 'normal') {
        q.or('mode.eq.normal,mode.is.null')
      } else {
        q.eq('mode', activeMode)
      }

      const { data } = await q
      setEntries((data || []) as TradeEntry[])
      setLoading(false)
    }
    load()
  }, [profile, activeMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Period filters ──────────────────────────
  const now = new Date()

  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
  const yearAgo  = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  const periodEntries = entries.filter(e => {
    const d = new Date(e.created_at)
    if (period === 'weekly')  return d >= weekAgo
    if (period === 'monthly') return d >= monthAgo
    return d >= yearAgo
  })

  const closed      = periodEntries.filter(e => e.outcome === 'win' || e.outcome === 'loss' || e.outcome === 'breakeven')
  const wins        = closed.filter(e => e.outcome === 'win')
  const losses      = closed.filter(e => e.outcome === 'loss')
  const breakevens  = closed.filter(e => e.outcome === 'breakeven')
  const totalPnl    = closed.reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
  const winRate     = wins.length + losses.length > 0 ? ((wins.length / (wins.length + losses.length)) * 100) : 0
  const profitFactor = (() => {
    const gp = wins.reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
    const gl = Math.abs(losses.reduce((s, e) => s + (e.pnl_home_currency || 0), 0))
    return gl > 0 ? gp / gl : gp > 0 ? 999 : 0
  })()
  const avgWin  = wins.length  > 0 ? wins.reduce((s, e)   => s + (e.pnl_home_currency || 0), 0) / wins.length   : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, e) => s + (e.pnl_home_currency || 0), 0)) / losses.length : 0
  const bestTrade  = closed.length > 0 ? closed.reduce((a, b) => (a.pnl_home_currency || 0) > (b.pnl_home_currency || 0) ? a : b) : null
  const worstTrade = closed.length > 0 ? closed.reduce((a, b) => (a.pnl_home_currency || 0) < (b.pnl_home_currency || 0) ? a : b) : null

  // ── Bar chart data ──────────────────────────
  function getBars(): { label: string; pnl: number }[] {
    if (period === 'weekly') {
      // Last 7 days
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6 - i))
        const dayStr = d.toISOString().split('T')[0]
        const pnl = closed
          .filter(e => e.created_at?.startsWith(dayStr))
          .reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
        return { label: d.toLocaleDateString('en-GB', { weekday: 'short' }).substring(0, 2), pnl }
      })
    }
    if (period === 'monthly') {
      // 4 weeks
      return Array.from({ length: 4 }, (_, i) => {
        const start = new Date(now); start.setDate(start.getDate() - (27 - i * 7))
        const end   = new Date(start); end.setDate(end.getDate() + 6)
        const pnl = closed
          .filter(e => { const d = new Date(e.created_at); return d >= start && d <= end })
          .reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
        return { label: `W${i + 1}`, pnl }
      })
    }
    // Yearly — 12 months
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const pnl = closed
        .filter(e => { const dt = new Date(e.created_at); return dt >= d && dt <= end })
        .reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
      return { label: d.toLocaleDateString('en-GB', { month: 'short' }).substring(0, 3), pnl }
    })
  }

  const bars = getBars()
  const periodLabel = period === 'weekly' ? 'Last 7 Days' : period === 'monthly' ? 'Last 30 Days' : 'Last 12 Months'
  const overallStatus = totalPnl > 0 ? '✅ Profitable' : totalPnl < 0 ? '❌ Loss Period' : '⚠️ Break-even'
  const statusColors = totalPnl > 0
    ? 'text-[var(--green)] border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)]'
    : totalPnl < 0
      ? 'text-[var(--red)] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]'
      : 'text-[var(--amber)] border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]'

  return (
    <dialog ref={dialogRef} className="max-w-[680px]"
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      onCancel={onClose}>

        {/* ── Header ── */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between rounded-t-[20px] z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">{MODE_ICONS[activeMode] || '📊'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-extrabold tracking-tight">Performance Recap</h2>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border font-mono-tv text-[#aaa] border-[var(--border2)] bg-[var(--surface2)]">
                  {MODE_LABELS[activeMode] || 'Normal'}
                </span>
              </div>
              <p className="text-[9px] text-[#777] font-mono-tv">{periodLabel} · {closed.length} trades</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border)] text-[#777] hover:text-white text-xs flex-shrink-0">
            ✕
          </button>
        </div>

        {/* ── Period tabs ── */}
        <div className="px-5 pt-4 pb-2 overflow-x-auto">
          <div className="flex gap-1 bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] p-0.5 w-fit min-w-max">
            {(['weekly', 'monthly', 'yearly'] as RecapPeriod[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-[6px] text-[11px] font-bold transition-all capitalize
                  ${period === p ? 'bg-[var(--surface3)] text-white border border-[var(--border2)]' : 'text-[#666] hover:text-white'}`}>
                {p === 'weekly' ? '7 Days' : p === 'monthly' ? '30 Days' : '12 Months'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-5 mt-1">

            {/* ── Status pill ── */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold">{periodLabel}</span>
              <span className={`text-[10px] font-mono-tv px-2 py-0.5 rounded-full border ${statusColors}`}>
                {overallStatus}
              </span>
            </div>

            {/* ── Top stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'CLOSED TRADES', val: String(closed.length), color: '#fff' },
                {
                  label: 'TOTAL P&L',
                  val: closed.length > 0
                    ? `${totalPnl >= 0 ? '+' : ''}${homeCurr.symbol}${Math.abs(totalPnl).toFixed(2)}`
                    : '—',
                  color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                },
                {
                  label: 'WIN RATE',
                  val: wins.length + losses.length > 0 ? `${winRate.toFixed(1)}%` : '—',
                  color: winRate >= 50 ? 'var(--green)' : 'var(--red)',
                },
                {
                  label: 'PROFIT FACTOR',
                  val: closed.length > 0
                    ? profitFactor >= 999 ? '∞' : profitFactor.toFixed(2)
                    : '—',
                  color: profitFactor >= 1.5 ? 'var(--green)' : profitFactor >= 1 ? 'var(--amber)' : 'var(--red)',
                },
              ].map(s => (
                <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono-tv font-bold tracking-wider text-[#555] mb-1">{s.label}</div>
                  <div className="text-[14px] font-extrabold font-mono-tv" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* ── Charts row: Donut + Bar ── */}
            {closed.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Donut */}
                <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[12px] p-4">
                  <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-3">OUTCOME BREAKDOWN</div>
                  <DonutChart wins={wins.length} losses={losses.length} breakevens={breakevens.length} />
                </div>

                {/* Bar chart */}
                <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[12px] p-4">
                  <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">P&amp;L PER {period === 'weekly' ? 'DAY' : period === 'monthly' ? 'WEEK' : 'MONTH'}</div>
                  <BarChart bars={bars} />
                  {/* Bar chart legend */}
                  <div className="flex items-center gap-3 mt-1 text-[8px] font-mono-tv text-[#555]">
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--green)]"/>Profit</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--red)]"/>Loss</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Secondary stats ── */}
            {closed.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'AVG WIN', val: wins.length > 0 ? `+${homeCurr.symbol}${avgWin.toFixed(2)}` : '—', color: 'var(--green)' },
                  { label: 'AVG LOSS', val: losses.length > 0 ? `-${homeCurr.symbol}${avgLoss.toFixed(2)}` : '—', color: 'var(--red)' },
                  { label: 'BEST TRADE', val: bestTrade ? `${homeCurr.symbol}${Math.abs(bestTrade.pnl_home_currency || 0).toFixed(2)}` : '—', color: 'var(--green)' },
                  { label: 'WORST TRADE', val: worstTrade ? `-${homeCurr.symbol}${Math.abs(worstTrade.pnl_home_currency || 0).toFixed(2)}` : '—', color: 'var(--red)' },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-center">
                    <div className="text-[8px] font-mono-tv font-bold tracking-wider text-[#555] mb-1">{s.label}</div>
                    <div className="text-[13px] font-extrabold font-mono-tv" style={{ color: s.color }}>{s.val}</div>
                    {s.label === 'BEST TRADE'  && bestTrade  && <div className="text-[8px] text-[#555] truncate">{bestTrade.asset}</div>}
                    {s.label === 'WORST TRADE' && worstTrade && <div className="text-[8px] text-[#555] truncate">{worstTrade.asset}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ── Strategy breakdown (monthly/yearly) ── */}
            {period !== 'weekly' && closed.length > 0 && (() => {
              const stratMap: Record<string, { wins: number; losses: number; be: number; pnl: number }> = {}
              closed.forEach(e => {
                const s = e.strategy || 'Unknown'
                if (!stratMap[s]) stratMap[s] = { wins: 0, losses: 0, be: 0, pnl: 0 }
                if (e.outcome === 'win')       stratMap[s].wins++
                else if (e.outcome === 'loss') stratMap[s].losses++
                else                           stratMap[s].be++
                stratMap[s].pnl += e.pnl_home_currency || 0
              })
              const strats = Object.entries(stratMap)
                .map(([name, v]) => ({ name, ...v, total: v.wins + v.losses + v.be, wr: v.wins + v.losses > 0 ? (v.wins / (v.wins + v.losses)) * 100 : 0 }))
                .sort((a, b) => b.wr - a.wr)
              return (
                <div>
                  <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-2">STRATEGY BREAKDOWN</div>
                  <div className="space-y-1.5">
                    {strats.map(s => (
                      <div key={s.name} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-3 py-2 flex items-center gap-3">
                        <span className="text-[11px] font-semibold flex-1 truncate">{s.name}</span>
                        <span className="text-[9px] text-[#555] font-mono-tv whitespace-nowrap">{s.wins}W / {s.losses}L</span>
                        <div className="w-16 h-1.5 bg-[var(--border2)] rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full" style={{ width: `${s.wr}%`, background: s.wr >= 60 ? 'var(--green)' : s.wr >= 40 ? 'var(--amber)' : 'var(--red)' }} />
                        </div>
                        <span className="text-[11px] font-bold font-mono-tv w-8 text-right flex-shrink-0" style={{ color: s.wr >= 60 ? 'var(--green)' : s.wr >= 40 ? 'var(--amber)' : 'var(--red)' }}>
                          {s.wr.toFixed(0)}%
                        </span>
                        <span className="text-[10px] font-mono-tv w-16 text-right flex-shrink-0" style={{ color: s.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {s.pnl >= 0 ? '+' : ''}{homeCurr.symbol}{Math.abs(s.pnl).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Trade table ── */}
            <div>
              <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-2">
                ALL TRADES — {periodLabel.toUpperCase()} ({closed.length})
              </div>
              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[12px] p-3">
                <TradeTable trades={closed} symbol={homeCurr.symbol} />
              </div>
            </div>

          </div>
        )}
    </dialog>
  )
}
