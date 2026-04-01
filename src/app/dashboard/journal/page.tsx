'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { getCurrency } from '@/lib/constants'
import toast from 'react-hot-toast'

export default function JournalPage() {
  const { profile } = useAppStore()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [exitPrice, setExitPrice] = useState('')
  const [pnlInput, setPnlInput] = useState('')
  const supabase = createClient()
  const homeCurrency = profile?.home_currency || 'ZAR'
  const homeConfig = getCurrency(homeCurrency as any)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateOutcome(id: string, outcome: 'win' | 'loss' | 'breakeven' | 'live' | 'skipped', taken: boolean) {
    setSavingId(id)
    const pnl = outcome === 'breakeven' ? 0 : pnlInput !== '' ? parseFloat(pnlInput) : null
    const updates: Record<string, unknown> = { outcome, taken_trade: taken }
    if (exitPrice !== '') updates.exit_price = exitPrice
    if (pnl !== null) updates.pnl_home_currency = pnl
    const { error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
    if (error) {
      toast.error('Could not save outcome')
    } else {
      toast.success(taken ? `Recorded as ${outcome}` : 'Marked as skipped')
      setEntries(prev => prev.map(e => e.id === id
        ? { ...e, outcome, taken_trade: taken, exit_price: exitPrice || e.exit_price, pnl_home_currency: pnl ?? e.pnl_home_currency }
        : e))
    }
    setSavingId(null)
    setEditingId(null)
    setExitPrice('')
    setPnlInput('')
  }

  const wins    = entries.filter(e => e.outcome === 'win').length
  const losses  = entries.filter(e => e.outcome === 'loss').length
  const live    = entries.filter(e => e.outcome === 'live').length
  const total   = wins + losses
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '—'
  const totalPnl = entries.reduce((sum, e) => sum + (e.pnl_home_currency || 0), 0)

  const strategyStats = entries.reduce<Record<string, { wins: number; losses: number }>>((acc, e) => {
    const key = e.strategy || 'Unknown'
    if (!acc[key]) acc[key] = { wins: 0, losses: 0 }
    if (e.outcome === 'win')  acc[key].wins++
    if (e.outcome === 'loss') acc[key].losses++
    return acc
  }, {})

  function exportCSV() {
    if (entries.length === 0) { return }
    const headers = ['Date', 'Asset', 'Bias', 'Strategy', 'Entry Price', 'Exit Price', `P&L (${homeCurrency})`, 'Outcome']
    const rows = entries.map(e => [
      e.created_at?.substring(0, 10) ?? '',
      e.asset ?? '',
      e.bias ?? '',
      e.strategy ?? '',
      e.entry_price ?? '',
      e.exit_price ?? '',
      e.pnl_home_currency != null ? String(e.pnl_home_currency) : '',
      e.outcome ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `tradevision-journal-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-[20px] font-extrabold tracking-tight">Trade Journal</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="btn-ghost-green text-[11px] px-3 py-2 rounded-lg disabled:opacity-40">
            ↺ Refresh
          </button>
          <button onClick={exportCSV} disabled={entries.length === 0}
            className="btn-outline text-[11px] px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            Export CSV ↓
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'CLOSED TRADES',  value: total.toString(), color:'text-[var(--blue)]' },
          { label:'WIN RATE',       value: total > 0 ? `${winRate}%` : '—', color:'text-[var(--green)]' },
          { label:`P&L (${homeCurrency})`, value: total > 0 ? `${totalPnl >= 0 ? '+' : ''}${homeConfig.symbol}${Math.abs(totalPnl).toLocaleString()}` : '—', color: totalPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]' },
          { label:'OPEN TRADES',    value: live.toString(), color:'text-[var(--amber)]' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 hover:border-[var(--border2)] transition-colors">
            <div className="text-[9px] font-mono-tv font-bold tracking-wider text-[#777] mb-1.5">{s.label}</div>
            <div className={`text-[26px] font-extrabold tracking-tight ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Strategy breakdown */}
      {Object.keys(strategyStats).length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 mb-4">
          <div className="text-[9px] font-mono-tv font-bold tracking-wider text-[#777] mb-3">WIN RATE BY STRATEGY</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(strategyStats).map(([strat, s]) => {
              const t = s.wins + s.losses
              const wr = t > 0 ? Math.round((s.wins / t) * 100) : null
              const color = wr == null ? '#777' : wr >= 60 ? 'var(--green)' : wr >= 40 ? 'var(--amber)' : 'var(--red)'
              return (
                <div key={strat} className="flex items-center gap-2 bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-3 py-2">
                  <div className="text-[10px] font-bold text-white">{strat}</div>
                  <div className="text-[9px] font-mono-tv text-[#777]">{t} trade{t !== 1 ? 's' : ''}</div>
                  {wr != null && (
                    <>
                      <div className="w-px h-3 bg-[var(--border2)]"/>
                      <div className="text-[11px] font-extrabold font-mono-tv" style={{ color }}>{wr}%</div>
                    </>
                  )}
                  {wr == null && <div className="text-[9px] text-[#555]">all live</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] overflow-x-auto">
        <div className="grid grid-cols-[70px_100px_55px_1fr_80px_80px_90px_110px] px-5 py-3 border-b border-[var(--border)] bg-[var(--surface2)]">
          {['DATE','ASSET','BIAS','STRATEGY','ENTRY','EXIT',`P&L (${homeCurrency})`,'RESULT'].map(h => (
            <span key={h} className="text-[8px] font-mono-tv font-bold tracking-widest text-[#777]">{h}</span>
          ))}
        </div>

        {entries.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[40px] opacity-20 mb-3">📒</div>
            <p className="text-[13px] text-[#777]">No trades yet. Run your first analysis to get started.</p>
          </div>
        )}

        {entries.map(e => (
          <div key={e.id} className="border-b border-[var(--border)] last:border-0">
            {/* Main row */}
            <div className="grid grid-cols-[70px_100px_55px_1fr_80px_80px_90px_110px] px-5 py-3.5 hover:bg-[var(--surface2)] transition-colors items-center text-[11px]">
              <span className="text-[#777] font-mono-tv">{e.created_at?.substring(5,10)?.replace('-','/')}</span>
              <span className="font-bold font-mono-tv">{e.asset}</span>
              <span className={`font-bold text-[10px] ${e.bias === 'BULLISH' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {e.bias === 'BULLISH' ? 'BULL' : 'BEAR'}
              </span>
              <span className="text-[#777] truncate">{e.strategy}</span>
              <span className="font-mono-tv">{e.entry_price}</span>
              <span className="font-mono-tv">{e.exit_price || '—'}</span>
              <span className={`font-mono-tv font-bold ${(e.pnl_home_currency || 0) >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {e.pnl_home_currency != null
                  ? `${e.pnl_home_currency >= 0 ? '+' : ''}${homeConfig.symbol}${Math.abs(e.pnl_home_currency).toLocaleString()}`
                  : 'OPEN'}
              </span>
              {/* Result column */}
              <span>
                {e.outcome === 'live' ? (
                  <button
                    onClick={() => {
                      setExitPrice('')
                      setPnlInput('')
                      setEditingId(editingId === e.id ? null : e.id)
                    }}
                    disabled={savingId === e.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-bold font-mono-tv bg-[rgba(59,130,246,0.12)] text-[var(--blue)] hover:bg-[rgba(59,130,246,0.22)] transition-colors border border-[rgba(59,130,246,0.25)] cursor-pointer">
                    {savingId === e.id ? '...' : '⏳ LIVE ✎'}
                  </button>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-bold font-mono-tv
                    ${e.outcome === 'win'       ? 'bg-[var(--green-dim)] text-[var(--green)]'
                    : e.outcome === 'loss'      ? 'bg-[rgba(239,68,68,0.12)] text-[var(--red)]'
                    : e.outcome === 'breakeven' ? 'bg-[rgba(245,158,11,0.12)] text-[var(--amber)]'
                    : 'bg-[rgba(107,114,128,0.12)] text-[#777]'}`}>
                    {e.outcome === 'win' ? '✓ WIN' : e.outcome === 'loss' ? '✗ LOSS' : e.outcome === 'breakeven' ? '➡ BE' : '— SKIP'}
                  </span>
                )}
              </span>
            </div>

            {/* Full-width edit panel — expands below the row when LIVE ✎ is clicked */}
            {editingId === e.id && (
              <div className="px-5 pb-4 bg-[var(--surface2)] border-t border-[var(--border)]">
                <div className="flex flex-wrap items-end gap-3 pt-3">
                  <div>
                    <div className="text-[8px] font-mono-tv text-[#555] mb-1">EXIT PRICE</div>
                    <input
                      value={exitPrice}
                      onChange={ev => setExitPrice(ev.target.value)}
                      placeholder={e.entry_price || '0.00'}
                      type="number"
                      step="any"
                      className="w-28 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-2.5 py-1.5 text-[11px] font-mono-tv outline-none focus:border-[var(--green)] transition-colors"
                    />
                  </div>
                  <div>
                    <div className="text-[8px] font-mono-tv text-[#555] mb-1">P&L ({homeCurrency})</div>
                    <input
                      value={pnlInput}
                      onChange={ev => setPnlInput(ev.target.value)}
                      placeholder="e.g. 250"
                      type="number"
                      step="any"
                      className="w-28 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-2.5 py-1.5 text-[11px] font-mono-tv outline-none focus:border-[var(--green)] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateOutcome(e.id, 'win', true)} disabled={!!savingId}
                      className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold bg-[var(--green-dim)] text-[var(--green)] border border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.25)] transition-colors disabled:opacity-50">
                      WIN
                    </button>
                    <button onClick={() => updateOutcome(e.id, 'loss', true)} disabled={!!savingId}
                      className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold bg-[rgba(239,68,68,0.12)] text-[var(--red)] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.22)] transition-colors disabled:opacity-50">
                      LOSS
                    </button>
                    <button onClick={() => updateOutcome(e.id, 'breakeven', true)} disabled={!!savingId}
                      className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold bg-[rgba(245,158,11,0.12)] text-[var(--amber)] border border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.22)] transition-colors disabled:opacity-50">
                      BE
                    </button>
                    <button onClick={() => updateOutcome(e.id, 'skipped', false)} disabled={!!savingId}
                      className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold bg-[rgba(107,114,128,0.12)] text-[#777] border border-[rgba(107,114,128,0.2)] hover:bg-[rgba(107,114,128,0.2)] transition-colors disabled:opacity-50">
                      SKIP
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setExitPrice(''); setPnlInput('') }}
                      className="px-2 py-1.5 text-[11px] text-[#555] hover:text-white transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
