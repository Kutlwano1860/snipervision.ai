'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'

interface AnalysisEntry {
  id: string
  asset: string
  timeframe: string
  bias: string
  confidence: number
  entry: string
  stop_loss: string
  tp1: string
  tp2: string
  tp3: string
  rr1: string
  risk_rating: string
  technical: string
  reasoning: string
  patterns: string[]
  trading_currency: string
  created_at: string
  journal_entries: { outcome: string; taken_trade: boolean }[]
}

export default function HistoryPage() {
  const { profile } = useAppStore()
  const [entries, setEntries] = useState<AnalysisEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'live'>('all')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('analyses')
      .select('*, journal_entries(outcome, taken_trade)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setEntries((data as any) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getOutcome(e: AnalysisEntry) {
    return e.journal_entries?.[0]?.outcome || 'live'
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => getOutcome(e) === filter)

  const outcomeColors: Record<string, string> = {
    win:       'bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.3)]',
    loss:      'bg-[rgba(239,68,68,0.1)] text-[var(--red)] border-[rgba(239,68,68,0.3)]',
    breakeven: 'bg-[rgba(245,158,11,0.1)] text-[var(--amber)] border-[rgba(245,158,11,0.3)]',
    live:      'bg-[rgba(59,130,246,0.1)] text-[var(--blue)] border-[rgba(59,130,246,0.3)]',
  }
  const outcomeLabel: Record<string, string> = {
    win: '✓ WIN', loss: '✗ LOSS', breakeven: '➡ BE', live: '⏳ LIVE',
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight">Setup History</h2>
          <p className="text-[11px] text-[#777] mt-0.5">Every chart you've analysed — review your setups and see what played out</p>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-ghost-green text-[11px] px-3 py-2 rounded-lg disabled:opacity-40">
          ↺ Refresh
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {(['all','win','loss','live'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all
              ${filter === f
                ? f === 'win'  ? 'bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.4)]'
                : f === 'loss' ? 'bg-[rgba(239,68,68,0.1)] text-[var(--red)] border-[rgba(239,68,68,0.4)]'
                : f === 'live' ? 'bg-[rgba(59,130,246,0.1)] text-[var(--blue)] border-[rgba(59,130,246,0.4)]'
                : 'bg-[var(--surface2)] text-white border-[var(--border2)]'
                : 'border-[var(--border)] text-[#777] hover:text-white hover:border-[var(--border2)]'}`}>
            {f === 'all' ? `All (${entries.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 animate-pulse h-[130px]" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[48px] opacity-20 mb-4">📊</div>
          <p className="text-[13px] text-[#777]">No setups found. Run your first analysis to build your history.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map(e => {
          const outcome = getOutcome(e)
          const isOpen  = expanded === e.id
          const biasColor = e.bias === 'BULLISH' ? 'var(--green)' : e.bias === 'BEARISH' ? 'var(--red)' : 'var(--amber)'
          const date = new Date(e.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' })

          return (
            <div key={e.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden hover:border-[var(--border2)] transition-all cursor-pointer"
              onClick={() => setExpanded(isOpen ? null : e.id)}>

              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[15px] font-extrabold tracking-tight font-mono-tv">{e.asset || '—'}</div>
                    <div className="text-[9px] text-[#777] font-mono-tv mt-0.5">{e.timeframe || ''} · {date}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold border ${outcomeColors[outcome] || outcomeColors.live}`}>
                    {outcomeLabel[outcome] || '⏳ LIVE'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-extrabold" style={{ color: biasColor }}>{e.bias}</span>
                  <span className="text-[9px] text-[#555]">·</span>
                  <span className="text-[11px] text-[#777] font-mono-tv">{e.confidence}% conf</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label:'ENTRY', val: e.entry,     color:'var(--blue)' },
                    { label:'SL',    val: e.stop_loss,  color:'var(--red)' },
                    { label:'TP1',   val: e.tp1,        color:'var(--green)' },
                  ].map(lv => (
                    <div key={lv.label} className="bg-[var(--surface2)] rounded-[7px] px-2 py-1.5 text-center">
                      <div className="text-[7px] text-[#555] font-mono-tv font-bold mb-0.5">{lv.label}</div>
                      <div className="text-[10px] font-bold font-mono-tv truncate" style={{ color: lv.color }}>{lv.val || '—'}</div>
                    </div>
                  ))}
                </div>

                {e.patterns?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {e.patterns.slice(0, 3).map(p => (
                      <span key={p} className="tag text-[8px]">{p}</span>
                    ))}
                    {e.patterns.length > 3 && <span className="text-[8px] text-[#555]">+{e.patterns.length - 3}</span>}
                  </div>
                )}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3" onClick={ev => ev.stopPropagation()}>
                  {e.reasoning && (
                    <div>
                      <div className="text-[8px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">REASONING</div>
                      <p className="text-[11px] text-[#aaa] leading-relaxed">{e.reasoning}</p>
                    </div>
                  )}
                  {e.technical && (
                    <div>
                      <div className="text-[8px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">TECHNICAL</div>
                      <p className="text-[11px] text-[#aaa] leading-relaxed">{e.technical}</p>
                    </div>
                  )}
                  {(e.tp2 || e.rr1) && (
                    <div className="grid grid-cols-2 gap-2">
                      {e.tp2 && <div className="bg-[var(--surface2)] rounded-md px-2 py-1.5 text-center">
                        <div className="text-[7px] text-[#555] font-mono-tv">TP2</div>
                        <div className="text-[10px] font-bold font-mono-tv text-[var(--green)]">{e.tp2}</div>
                      </div>}
                      {e.rr1 && <div className="bg-[var(--surface2)] rounded-md px-2 py-1.5 text-center">
                        <div className="text-[7px] text-[#555] font-mono-tv">R:R</div>
                        <div className="text-[10px] font-bold font-mono-tv text-[var(--blue)]">{e.rr1}</div>
                      </div>}
                    </div>
                  )}
                </div>
              )}

              <div className="px-4 pb-2 text-[9px] text-[#555] font-mono-tv">
                {isOpen ? '▲ Collapse' : '▼ Expand details'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
