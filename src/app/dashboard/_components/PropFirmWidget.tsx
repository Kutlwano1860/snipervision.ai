'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'

// Known firms — phase 1 and phase 2 rules
type PhaseRules = { dailyDD: number; maxDD: number; profitTarget: number; minDays: number; consistency: number }
const FIRM_PRESETS: Record<string, { p1: PhaseRules; p2: PhaseRules }> = {
  'FTMO':                { p1: { dailyDD: 5, maxDD: 10, profitTarget: 10, minDays: 4,  consistency: 50 }, p2: { dailyDD: 5, maxDD: 10, profitTarget: 5,  minDays: 4,  consistency: 50 } },
  'MyForexFunds':        { p1: { dailyDD: 5, maxDD: 12, profitTarget: 8,  minDays: 0,  consistency: 0  }, p2: { dailyDD: 5, maxDD: 12, profitTarget: 5,  minDays: 0,  consistency: 0  } },
  'The Funded Trader':   { p1: { dailyDD: 5, maxDD: 10, profitTarget: 10, minDays: 0,  consistency: 0  }, p2: { dailyDD: 5, maxDD: 10, profitTarget: 5,  minDays: 0,  consistency: 0  } },
  'E8 Funding':          { p1: { dailyDD: 5, maxDD: 8,  profitTarget: 8,  minDays: 0,  consistency: 0  }, p2: { dailyDD: 5, maxDD: 8,  profitTarget: 5,  minDays: 0,  consistency: 0  } },
  'Apex Trader Funding': { p1: { dailyDD: 3, maxDD: 6,  profitTarget: 6,  minDays: 0,  consistency: 0  }, p2: { dailyDD: 3, maxDD: 6,  profitTarget: 3,  minDays: 0,  consistency: 0  } },
  'The5ers':             { p1: { dailyDD: 4, maxDD: 8,  profitTarget: 8,  minDays: 0,  consistency: 0  }, p2: { dailyDD: 4, maxDD: 8,  profitTarget: 5,  minDays: 0,  consistency: 0  } },
  'GOAT Funded':         { p1: { dailyDD: 5, maxDD: 10, profitTarget: 10, minDays: 5,  consistency: 40 }, p2: { dailyDD: 5, maxDD: 10, profitTarget: 5,  minDays: 5,  consistency: 40 } },
  'Custom':              { p1: { dailyDD: 5, maxDD: 10, profitTarget: 10, minDays: 0,  consistency: 0  }, p2: { dailyDD: 5, maxDD: 10, profitTarget: 5,  minDays: 0,  consistency: 0  } },
}

function RuleRow({ label, value, limit, unit = '%', isTarget = false }: {
  label: string; value: number; limit: number; unit?: string; isTarget?: boolean
}) {
  // For target (profit %): more = better. For drawdown: more used = worse.
  const ratio = limit > 0 ? Math.min(1, value / limit) : 0
  const pct   = ratio * 100
  const color = isTarget
    ? (pct >= 90 ? 'var(--green)' : pct >= 50 ? 'var(--blue)' : 'var(--amber)')
    : (pct >= 90 ? 'var(--red)'   : pct >= 70 ? 'var(--amber)' : 'var(--green)')
  const status = isTarget
    ? (pct >= 100 ? '✅' : pct >= 50 ? '🔵' : '⏳')
    : (pct >= 90  ? '🔴' : pct >= 70  ? '🟡' : '🟢')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#aaa] truncate pr-2">{label}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-mono-tv font-bold text-[11px]" style={{ color }}>
            {unit === '%' ? `${Math.abs(value).toFixed(2)}%` : value}
          </span>
          <span className="text-[#555] font-mono-tv text-[10px]">/ {limit}{unit}</span>
          <span>{status}</span>
        </div>
      </div>
      <div className="h-1.5 bg-[var(--border2)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Rules config form ──────────────────────────
function RulesConfigForm({ onClose }: { onClose: () => void }) {
  const { propFirmRules, updatePropFirmRules } = useAppStore()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState({ ...propFirmRules, phase: propFirmRules.phase ?? 1 })

  useEffect(() => { dialogRef.current?.showModal() }, [])
  const [customName, setCustomName] = useState(
    Object.keys(FIRM_PRESETS).includes(form.firmName) ? '' : form.firmName
  )

  function selectPreset(name: string) {
    const preset = FIRM_PRESETS[name]
    if (!preset) return
    const rules = form.phase === 2 ? preset.p2 : preset.p1
    setForm(f => ({ ...f, firmName: name === 'Custom' ? customName || 'Custom' : name, ...rules }))
  }

  function selectPhase(phase: 1 | 2) {
    const preset = FIRM_PRESETS[form.firmName]
    if (preset) {
      const rules = phase === 2 ? preset.p2 : preset.p1
      setForm(f => ({ ...f, phase, ...rules }))
    } else {
      setForm(f => ({ ...f, phase }))
    }
  }

  function save() {
    const finalName = customName.trim() || form.firmName
    updatePropFirmRules({ ...form, firmName: finalName })
    onClose()
  }

  return (
    <dialog ref={dialogRef} className="p-6 max-w-[420px] space-y-4"
      onClick={e => { if (e.target === dialogRef.current) onClose() }}
      onCancel={onClose}>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold">Prop Firm Rules</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white text-[13px]">✕</button>
        </div>

        {/* Firm presets */}
        <div>
          <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-2">SELECT FIRM (OR CUSTOM)</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(FIRM_PRESETS).map(name => (
              <button key={name}
                onClick={() => selectPreset(name)}
                className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold border transition-all
                  ${form.firmName === name
                    ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                    : 'border-[var(--border2)] text-[#777] hover:text-white'}`}>
                {name}
              </button>
            ))}
          </div>
          {(form.firmName === 'Custom' || !Object.keys(FIRM_PRESETS).includes(form.firmName)) && (
            <input
              className="tv-input mt-2 text-[12px]"
              placeholder="Enter your firm name"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
          )}
        </div>

        {/* Phase selector */}
        <div>
          <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-2">CHALLENGE PHASE</div>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map(p => (
              <button key={p} onClick={() => selectPhase(p)}
                className={`py-2.5 rounded-[8px] text-[12px] font-bold border transition-all
                  ${form.phase === p
                    ? 'border-[var(--blue)] bg-[rgba(37,99,235,0.12)] text-[var(--blue)]'
                    : 'border-[var(--border2)] text-[#777] hover:text-white'}`}>
                Phase {p}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-[#555] mt-1.5 font-mono-tv">
            {form.phase === 1 ? 'Phase 1: Higher profit target, qualify for funded account' : 'Phase 2: Lower profit target, verify consistency before funding'}
          </div>
        </div>

        {/* Account size */}
        <div>
          <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-1.5">ACCOUNT SIZE</div>
          <input className="tv-input" type="number" min="1"
            value={form.accountSize}
            onChange={e => setForm(f => ({ ...f, accountSize: parseFloat(e.target.value) || 0 }))}
            placeholder="e.g. 10000" />
        </div>

        {/* Rule inputs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'dailyDD',      label: 'Daily DD %',       hint: 'e.g. 5' },
            { key: 'maxDD',        label: 'Max DD %',          hint: 'e.g. 10' },
            { key: 'profitTarget', label: 'Profit Target %',   hint: 'e.g. 10' },
            { key: 'minDays',      label: 'Min Trading Days',  hint: 'e.g. 4 (0 = none)' },
            { key: 'consistency',  label: 'Consistency % cap', hint: 'e.g. 50 (0 = off)' },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">{label}</div>
              <input className="tv-input text-[12px]" type="number" min="0"
                placeholder={hint}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-[var(--border2)] rounded-[9px] text-[12px] font-bold text-[#777] hover:bg-[var(--surface2)] transition-all">
            Cancel
          </button>
          <button onClick={save}
            className="flex-1 btn-primary py-2.5 rounded-[9px] text-[12px]">
            Save Rules
          </button>
        </div>
    </dialog>
  )
}

// ── Main Widget ────────────────────────────────
export default function PropFirmWidget() {
  const { profile, activeMode, propFirmRules } = useAppStore()
  const supabase = createClient()
  const [open, setOpen] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [todayPnl, setTodayPnl] = useState(0)
  const [allTimePnl, setAllTimePnl] = useState(0)
  const [peakBalance, setPeakBalance] = useState(0)
  const [tradingDays, setTradingDays] = useState(0)
  const [maxSingleProfit, setMaxSingleProfit] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)

  const rules   = propFirmRules
  const balance = rules.accountSize || profile?.account_balance || 10000

  useEffect(() => {
    if (!profile || activeMode !== 'prop') return
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('journal_entries')
        .select('created_at,pnl_home_currency,outcome')
        .eq('user_id', profile!.id)
        .eq('mode', 'prop')
        .in('outcome', ['win', 'loss', 'breakeven'])
        .order('created_at')
      if (!data) return

      const todayEntries = data.filter(e => e.created_at?.startsWith(today))
      setTodayPnl(todayEntries.reduce((s, e) => s + (e.pnl_home_currency || 0), 0))

      const allPnl = data.reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
      setAllTimePnl(allPnl)

      let peak = balance; let running = balance
      data.forEach(e => {
        running += e.pnl_home_currency || 0
        if (running > peak) peak = running
      })
      setPeakBalance(peak)

      const uniqueDays = new Set(data.map(e => e.created_at?.split('T')[0])).size
      setTradingDays(uniqueDays)

      const wins = data.filter(e => (e.pnl_home_currency || 0) > 0)
      const maxWin  = wins.length > 0 ? Math.max(...wins.map(e => e.pnl_home_currency || 0)) : 0
      const totalWin = wins.reduce((s, e) => s + (e.pnl_home_currency || 0), 0)
      setMaxSingleProfit(maxWin)
      setTotalProfit(totalWin)
    }
    load()
  }, [profile, activeMode, balance]) // eslint-disable-line react-hooks/exhaustive-deps

  if (activeMode !== 'prop') return null

  const dailyDDUsed   = Math.abs(Math.min(0, todayPnl))
  const dailyDDPct    = (dailyDDUsed / balance) * 100
  const maxDDUsed     = Math.max(0, peakBalance - (balance + allTimePnl))
  const maxDDPct      = (maxDDUsed / balance) * 100
  const profitPct     = (allTimePnl / balance) * 100
  const consistencyPct = totalProfit > 0 ? (maxSingleProfit / totalProfit) * 100 : 0

  const isCompliant =
    dailyDDPct  < rules.dailyDD  * 0.9 &&
    maxDDPct    < rules.maxDD    * 0.9 &&
    (rules.consistency === 0 || consistencyPct < rules.consistency * 0.9)

  return (
    <>
      {showConfig && <RulesConfigForm onClose={() => setShowConfig(false)} />}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden mb-5">
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface2)] transition-colors text-left border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[18px]">🏢</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-extrabold text-white truncate">
                  {rules.firmName || 'Prop Firm Mode'}
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border font-mono-tv flex-shrink-0"
                  style={{ color: 'var(--blue)', borderColor: 'rgba(37,99,235,0.35)', background: 'rgba(37,99,235,0.12)' }}>
                  PHASE {rules.phase ?? 1}
                </span>
              </div>
              <div className="text-[9px] font-mono-tv text-[#777]">PROP COMPLIANCE TRACKER</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button
              onClick={e => { e.stopPropagation(); setShowConfig(true) }}
              className="text-[9px] font-mono-tv text-[#555] hover:text-white border border-[var(--border)] px-2 py-0.5 rounded-[5px] transition-all">
              ⚙ Rules
            </button>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border font-mono-tv
              ${isCompliant
                ? 'text-[var(--green)] border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)]'
                : 'text-[var(--red)] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]'}`}>
              {isCompliant ? '✅ COMPLIANT' : '⚠️ REVIEW'}
            </span>
            <span className="text-[10px] text-[#555]">{open ? '▲' : '▼'}</span>
          </div>
        </button>

        {open && (
          <div className="p-5 space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "TODAY'S P&L",     val: `${todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}`,               color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'TRADING DAYS',    val: `${tradingDays}${rules.minDays > 0 ? ` / ${rules.minDays}` : ''}`, color: 'var(--blue)' },
                { label: 'PROFIT PROGRESS', val: `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}%`,             color: profitPct >= 0 ? 'var(--green)' : 'var(--red)' },
              ].map(s => (
                <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-3 py-2.5 text-center">
                  <div className="text-[8px] font-mono-tv font-bold tracking-wider text-[#555] mb-1">{s.label}</div>
                  <div className="text-[14px] font-extrabold font-mono-tv" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Compliance rules */}
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[12px] p-4 space-y-3">
              <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">COMPLIANCE RULES</div>
              <RuleRow label="Daily Drawdown Used"    value={dailyDDPct}     limit={rules.dailyDD}      />
              <RuleRow label="Max Drawdown Used"      value={maxDDPct}       limit={rules.maxDD}        />
              <RuleRow label="Profit Target Progress" value={Math.max(0, profitPct)} limit={rules.profitTarget} isTarget />
              {rules.minDays > 0 && (
                <RuleRow label="Trading Days"         value={tradingDays}    limit={rules.minDays}      unit="d" isTarget />
              )}
              {rules.consistency > 0 && (
                <RuleRow label="Consistency (1 trade % of profits)" value={consistencyPct} limit={rules.consistency} />
              )}
            </div>

            <div className="text-[9px] font-mono-tv text-[#555] flex items-center justify-between">
              <span>Account size: {rules.accountSize.toLocaleString()} · Rules for {rules.firmName}</span>
              <button onClick={() => setShowConfig(true)} className="text-[var(--green)] hover:underline">Edit rules →</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
