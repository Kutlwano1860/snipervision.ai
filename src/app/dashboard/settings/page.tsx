'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAppStore, type AccentColor } from '@/lib/store'
import { CURRENCIES, TIER_ICONS, PLANS } from '@/lib/constants'
import type { Tier } from '@/types'

// ─── Types ─────────────────────────────────────
type Section = 'profile' | 'accounts' | 'account' | 'ai' | 'appearance' | 'stats' | 'security' | 'billing' | 'danger'

interface TradingAccount {
  id: string
  label: string
  currency: string
  account_type: string
  balance: number
  prop_firm: string | null
  leverage: string
  is_active: boolean
}

// ─── Constants ─────────────────────────────────
const SECTIONS: { id: Section; label: string; icon: string; minTier?: Tier }[] = [
  { id: 'profile',    label: 'Profile',       icon: '👤' },
  { id: 'accounts',  label: 'My Accounts',   icon: '🏦', minTier: 'premium' },
  { id: 'account',   label: 'Risk & Limits', icon: '💰', minTier: 'premium' },
  { id: 'ai',        label: 'AI & Trading',  icon: '🤖' },
  { id: 'appearance',label: 'Appearance',    icon: '🎨' },
  { id: 'stats',     label: 'My Stats',      icon: '📊' },
  { id: 'security',  label: 'Security',      icon: '🔐' },
  { id: 'billing',   label: 'Billing',       icon: '💳' },
  { id: 'danger',    label: 'Danger Zone',   icon: '⚠️' },
]

const TIER_RANK: Record<Tier, number> = { free: 0, premium: 1, platinum: 2, diamond: 3 }
const TIER_TEXT: Record<Tier, string> = {
  free: '#6b7280', premium: '#3b82f6', platinum: '#a78bfa', diamond: '#f59e0b',
}
const ACC_TYPES = ['micro','standard','pro','prop','funded','cent']
const LEVERAGE_OPTIONS = ['1:10','1:20','1:30','1:50','1:100','1:200','1:300','1:400','1:500']
const ACCENT_OPTIONS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'green',  label: 'Electric Green', hex: '#22c55e' },
  { id: 'blue',   label: 'Royal Blue',     hex: '#3b82f6' },
  { id: 'purple', label: 'Deep Purple',    hex: '#a855f7' },
  { id: 'amber',  label: 'Amber Gold',     hex: '#f59e0b' },
  { id: 'red',    label: 'Coral Red',      hex: '#ef4444' },
]
const TIMEZONES = [
  'Africa/Johannesburg','Africa/Lagos','Africa/Nairobi','Africa/Cairo',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'America/New_York','America/Chicago','America/Los_Angeles',
  'Asia/Dubai','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Pacific/Auckland',
]
const COUNTRIES = [
  'South Africa','Nigeria','Kenya','Ghana','Egypt','Morocco',
  'United Kingdom','Germany','France','Netherlands','Spain',
  'United States','Canada','Australia','New Zealand',
  'UAE','Saudi Arabia','Singapore','India','Brazil',
]

// ─── Sub-components ─────────────────────────────
function SectionCard({ title, icon, badge, children }: { title: string; icon: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2.5">
        <span className="text-[18px]">{icon}</span>
        <h2 className="text-[14px] font-extrabold tracking-tight text-white flex-1">{title}</h2>
        {badge}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">{label}</div>
      {hint && <div className="text-[10px] text-[#555] mb-2">{hint}</div>}
      {children}
    </div>
  )
}

/** Wraps children in a locked overlay when `locked` is true */
function GatedFeature({ locked, label, children }: { locked: boolean; label: string; children: React.ReactNode }) {
  if (!locked) return <>{children}</>
  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(8,8,8,0.55)] rounded-[10px] backdrop-blur-[2px]">
        <span className="text-[18px]">🔒</span>
        <div className="text-[10px] font-bold text-white text-center">{label}</div>
        <span className="text-[8px] font-bold text-[var(--amber)] bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] px-2 py-0.5 rounded-full">PREMIUM+ FEATURE</span>
      </div>
    </div>
  )
}

function SaveBar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  if (!dirty) return null
  return (
    <div className="sticky bottom-20 lg:bottom-4 z-40 flex justify-center pointer-events-none">
      <div className="bg-[var(--surface)] border border-[var(--green-border)] rounded-[12px] px-5 py-3 flex items-center gap-4 shadow-2xl pointer-events-auto animate-fade-up">
        <span className="text-[11px] text-[#888]">Unsaved changes</span>
        <button onClick={onSave} disabled={saving}
          className="btn-primary px-5 py-2 rounded-[8px] text-[12px] disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────
export default function SettingsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { profile, setProfile, settings, updateSettings, appearance, updateAppearance, clearSession } = useAppStore()

  const tier    = (profile?.tier || 'free') as Tier
  const isPrem  = TIER_RANK[tier] >= TIER_RANK['premium']
  const isPlat  = TIER_RANK[tier] >= TIER_RANK['platinum']

  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [saving, setSaving]  = useState(false)
  const [dirty, setDirty]    = useState(false)

  // ── Profile fields ──
  const [name, setName]         = useState('')
  const [handle, setHandle]     = useState('')
  const [motto, setMotto]       = useState('')
  const [country, setCountry]   = useState('')
  const [timezone, setTimezone] = useState('')
  const [expLevel, setExpLevel] = useState('')

  // ── Risk & Limits fields ──
  const [riskPct, setRiskPct]   = useState(1.0)
  const [maxDDraw, setMaxDDraw] = useState('')
  const [leverage, setLeverage] = useState('1:100')
  const [propFirm, setPropFirm] = useState('')

  // ── Security ──
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  // ── Trading accounts ──
  const [accounts, setAccounts]           = useState<TradingAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [editingAccId, setEditingAccId]   = useState<string | 'new' | null>(null)
  const [accForm, setAccForm]             = useState({ label: '', currency: 'USD', account_type: 'standard', balance: '', prop_firm: '', leverage: '1:100' })
  const [accSaving, setAccSaving]         = useState(false)

  // ── Stats ──
  const [stats, setStats]         = useState<{ totalTrades: number; wins: number; losses: number; winRate: number; bestPair: string; worstPair: string; profitFactor: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Danger ──
  const [deleteConfirm, setDeleteConfirm]     = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [dangerLoading, setDangerLoading]     = useState(false)

  // Sync profile → fields
  useEffect(() => {
    if (!profile) return
    setName(profile.name || '')
    setHandle((profile as any).trading_handle || '')
    setMotto((profile as any).trading_motto || '')
    setCountry((profile as any).country || '')
    setTimezone((profile as any).timezone || '')
    setExpLevel((profile as any).experience_level || '')
    setRiskPct((profile as any).risk_per_trade ?? 1.0)
    setMaxDDraw((profile as any).max_daily_drawdown ?? '')
    setLeverage((profile as any).leverage || '1:100')
    setPropFirm((profile as any).prop_firm_name || '')
  }, [profile])

  // Load trading accounts
  useEffect(() => {
    async function loadAccounts() {
      if (!profile || !isPrem) { setAccountsLoading(false); return }
      const { data } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at')
      setAccounts(data || [])
      setAccountsLoading(false)
    }
    loadAccounts()
  }, [profile, isPrem]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load stats
  useEffect(() => {
    async function loadStats() {
      if (!profile) return
      const { data } = await supabase
        .from('journal_entries')
        .select('outcome,pnl_home_currency,asset')
        .eq('user_id', profile.id)
      if (!data) { setStatsLoading(false); return }
      const closed = data.filter(d => d.outcome === 'win' || d.outcome === 'loss')
      const wins   = closed.filter(d => d.outcome === 'win').length
      const losses = closed.filter(d => d.outcome === 'loss').length
      const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0
      const pairMap: Record<string, number> = {}
      closed.forEach(d => { pairMap[d.asset || 'UNKNOWN'] = (pairMap[d.asset || 'UNKNOWN'] || 0) + (d.pnl_home_currency || 0) })
      const pairs    = Object.entries(pairMap).sort((a, b) => b[1] - a[1])
      const bestPair = pairs[0]?.[0] || '—'
      const worstPair = pairs[pairs.length - 1]?.[0] || '—'
      const gProfit = closed.filter(d => (d.pnl_home_currency || 0) > 0).reduce((s, d) => s + (d.pnl_home_currency || 0), 0)
      const gLoss   = Math.abs(closed.filter(d => (d.pnl_home_currency || 0) < 0).reduce((s, d) => s + (d.pnl_home_currency || 0), 0))
      const profitFactor = gLoss > 0 ? +(gProfit / gLoss).toFixed(2) : gProfit > 0 ? 999 : 0
      setStats({ totalTrades: closed.length, wins, losses, winRate, bestPair, worstPair, profitFactor })
      setStatsLoading(false)
    }
    loadStats()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  function markDirty() { setDirty(true) }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name,
          trading_handle:     handle   || null,
          trading_motto:      motto    || null,
          country:            country  || null,
          timezone:           timezone || null,
          experience_level:   expLevel || null,
          ...(isPrem && {
            risk_per_trade:      riskPct,
            max_daily_drawdown:  maxDDraw ? parseFloat(maxDDraw) : null,
            leverage,
            prop_firm_name:      propFirm || null,
          }),
        })
        .eq('id', profile.id)
        .select().single()
      if (error) throw error
      setProfile({ ...profile, ...data } as any)
      setDirty(false)
      toast.success('Settings saved!')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Account CRUD ──────────────────────────────
  function openNewAccount() {
    setAccForm({ label: '', currency: 'USD', account_type: 'standard', balance: '', prop_firm: '', leverage: '1:100' })
    setEditingAccId('new')
  }
  function openEditAccount(acc: TradingAccount) {
    setAccForm({ label: acc.label, currency: acc.currency, account_type: acc.account_type, balance: acc.balance.toString(), prop_firm: acc.prop_firm || '', leverage: acc.leverage })
    setEditingAccId(acc.id)
  }

  async function saveAccount() {
    if (!profile) return
    if (!accForm.label.trim()) { toast.error('Give this account a name'); return }
    if (accounts.length >= 3 && editingAccId === 'new') { toast.error('Maximum 3 accounts allowed'); return }
    setAccSaving(true)
    try {
      if (editingAccId === 'new') {
        const { data, error } = await supabase.from('trading_accounts').insert({
          user_id:      profile.id,
          label:        accForm.label.trim(),
          currency:     accForm.currency,
          account_type: accForm.account_type,
          balance:      parseFloat(accForm.balance) || 0,
          prop_firm:    accForm.prop_firm || null,
          leverage:     accForm.leverage,
          is_active:    accounts.length === 0, // first account is auto-active
        }).select().single()
        if (error) throw error
        setAccounts(prev => [...prev, data as TradingAccount])
      } else {
        const { data, error } = await supabase.from('trading_accounts').update({
          label:        accForm.label.trim(),
          currency:     accForm.currency,
          account_type: accForm.account_type,
          balance:      parseFloat(accForm.balance) || 0,
          prop_firm:    accForm.prop_firm || null,
          leverage:     accForm.leverage,
        }).eq('id', editingAccId!).select().single()
        if (error) throw error
        setAccounts(prev => prev.map(a => a.id === editingAccId ? data as TradingAccount : a))
      }
      toast.success(editingAccId === 'new' ? 'Account added!' : 'Account updated!')
      setEditingAccId(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save account')
    } finally {
      setAccSaving(false)
    }
  }

  async function deleteAccount(id: string) {
    const { error } = await supabase.from('trading_accounts').delete().eq('id', id)
    if (error) { toast.error('Could not delete'); return }
    setAccounts(prev => prev.filter(a => a.id !== id))
    toast.success('Account removed')
  }

  async function setActiveAccount(id: string) {
    // Deactivate all, then activate selected
    await supabase.from('trading_accounts').update({ is_active: false }).eq('user_id', profile!.id)
    await supabase.from('trading_accounts').update({ is_active: true }).eq('id', id)
    setAccounts(prev => prev.map(a => ({ ...a, is_active: a.id === id })))
    const acc = accounts.find(a => a.id === id)
    if (acc) toast.success(`Switched to ${acc.label}`)
  }

  async function changePassword() {
    if (!newPwd) { toast.error('Enter a new password'); return }
    if (newPwd.length < 8) { toast.error('Minimum 8 characters'); return }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return }
    setPwdLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success('Password updated!')
      setNewPwd(''); setConfirmPwd('')
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setPwdLoading(false)
    }
  }

  async function resetSettings() {
    updateSettings({ market: 'Auto Detect', strategy: 'ICT', tradingStyle: 'Day Trader', riskAppetite: 'Conservative', entryMode: 'Standard', session: 'Auto Detect', accountType: 'micro' })
    updateAppearance({ accentColor: 'green', compactMode: false, fontSize: 'default', showMarketBrief: true, showKillZones: true })
    toast.success('Settings reset to defaults')
  }

  async function clearHistory() {
    if (!profile) return
    setDangerLoading(true)
    const { error } = await supabase.from('analyses').delete().eq('user_id', profile.id)
    if (error) toast.error('Failed'); else toast.success('Analysis history cleared')
    setDangerLoading(false)
  }

  async function clearJournal() {
    if (!profile) return
    setDangerLoading(true)
    const { error } = await supabase.from('journal_entries').delete().eq('user_id', profile.id)
    if (error) toast.error('Failed'); else toast.success('Journal cleared')
    setDangerLoading(false)
  }

  async function deleteAccount_full() {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return }
    setDangerLoading(true)
    try {
      await supabase.from('journal_entries').delete().eq('user_id', profile!.id)
      await supabase.from('analyses').delete().eq('user_id', profile!.id)
      await supabase.from('trading_accounts').delete().eq('user_id', profile!.id)
      await supabase.from('profiles').delete().eq('id', profile!.id)
      await supabase.auth.signOut()
      clearSession()
      toast.success('Account deleted. Goodbye.')
      router.replace('/')
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDangerLoading(false)
      setShowDeleteModal(false)
    }
  }

  // ── Account form modal ──
  function AccountForm() {
    return (
      <div className="fixed inset-0 bg-[rgba(8,8,8,0.9)] z-50 flex items-center justify-center backdrop-blur-lg p-4"
        onClick={() => setEditingAccId(null)}>
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[18px] p-6 w-full max-w-[400px] animate-fade-up space-y-4"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold">{editingAccId === 'new' ? '+ Add Account' : 'Edit Account'}</h3>
            <button onClick={() => setEditingAccId(null)} className="text-[#555] hover:text-white text-[13px]">✕</button>
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">ACCOUNT NAME</div>
            <input className="tv-input" placeholder="e.g. Main Account, FTMO Funded" value={accForm.label}
              onChange={e => setAccForm(f => ({ ...f, label: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">CURRENCY</div>
              <select className="tv-select" value={accForm.currency} onChange={e => setAccForm(f => ({ ...f, currency: e.target.value }))}>
                {['USD','GBP','EUR','ZAR','AUD','CAD','JPY','CHF','NZD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">TYPE</div>
              <select className="tv-select" value={accForm.account_type} onChange={e => setAccForm(f => ({ ...f, account_type: e.target.value }))}>
                {ACC_TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">BALANCE</div>
              <input className="tv-input" type="number" placeholder="e.g. 10000" value={accForm.balance}
                onChange={e => setAccForm(f => ({ ...f, balance: e.target.value }))} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">LEVERAGE</div>
              <select className="tv-select" value={accForm.leverage} onChange={e => setAccForm(f => ({ ...f, leverage: e.target.value }))}>
                {LEVERAGE_OPTIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">PROP FIRM (OPTIONAL)</div>
            <input className="tv-input" placeholder="e.g. FTMO, The5ers, MyForexFunds" value={accForm.prop_firm}
              onChange={e => setAccForm(f => ({ ...f, prop_firm: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => setEditingAccId(null)}
              className="py-2.5 border border-[var(--border2)] rounded-[9px] text-[12px] font-bold text-[#777] hover:bg-[var(--surface2)] transition-all">
              Cancel
            </button>
            <button onClick={saveAccount} disabled={accSaving}
              className="btn-primary py-2.5 rounded-[9px] text-[12px] disabled:opacity-50">
              {accSaving ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const homeCurrencyConfig = CURRENCIES.find(c => c.code === (profile?.home_currency || 'ZAR'))

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold tracking-tight">Settings</h1>
        <p className="text-[12px] text-[#555] mt-0.5">Manage your profile, preferences, and account</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Sidebar — desktop ── */}
        <div className="hidden lg:block w-48 flex-shrink-0 sticky top-20">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] overflow-hidden">
            {SECTIONS.map(s => {
              const locked = s.minTier ? TIER_RANK[tier] < TIER_RANK[s.minTier] : false
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors
                    ${activeSection === s.id ? 'bg-[var(--surface3)] text-white border-l-2 border-[var(--green)]' : 'text-[#777] hover:text-white hover:bg-[var(--surface2)]'}
                    ${s.id === 'danger' ? '!text-[var(--red)]' : ''}`}>
                  <span>{s.icon}</span>
                  <span className="flex-1">{s.label}</span>
                  {locked && <span className="text-[9px] text-[#555]">🔒</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Mobile tab scroll ── */}
        <div className="lg:hidden w-full mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 w-max pb-1 pr-4">
            {SECTIONS.map(s => {
              const locked = s.minTier ? TIER_RANK[tier] < TIER_RANK[s.minTier] : false
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold whitespace-nowrap transition-all
                    ${activeSection === s.id ? 'bg-[var(--surface3)] text-white border border-[var(--border2)]' : 'text-[#777] bg-[var(--surface)] border border-[var(--border)]'}
                    ${s.id === 'danger' ? '!text-[var(--red)]' : ''}`}>
                  {s.icon} {s.label} {locked ? '🔒' : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ════ PROFILE ════ */}
          {activeSection === 'profile' && (
            <SectionCard title="Profile" icon="👤">
              <Field label="FULL NAME">
                <input className="tv-input" value={name} onChange={e => { setName(e.target.value); markDirty() }} placeholder="Your name" />
              </Field>
              <Field label="TRADING HANDLE" hint="Public alias shown on Community & leaderboards">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-[12px]">@</span>
                  <input className="tv-input pl-7" value={handle} onChange={e => { setHandle(e.target.value); markDirty() }} placeholder="your_handle" />
                </div>
              </Field>
              <Field label="TRADING MOTTO" hint={`${motto.length}/100 chars`}>
                <input className="tv-input" maxLength={100} value={motto} onChange={e => { setMotto(e.target.value); markDirty() }} placeholder="e.g. Patience is the edge" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="COUNTRY">
                  <select className="tv-select" value={country} onChange={e => { setCountry(e.target.value); markDirty() }}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="TIMEZONE">
                  <select className="tv-select" value={timezone} onChange={e => { setTimezone(e.target.value); markDirty() }}>
                    <option value="">Select timezone</option>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="TRADING EXPERIENCE LEVEL" hint="Shown on community posts · personalises AI tone">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Beginner','Intermediate','Pro','Elite'] as const).map(lvl => (
                    <button key={lvl} onClick={() => { setExpLevel(lvl); markDirty() }}
                      className={`py-2.5 border rounded-[8px] text-[10px] font-bold transition-all flex flex-col items-center gap-1
                        ${expLevel === lvl ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]' : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                      <span className="text-[15px]">{lvl === 'Beginner' ? '🌱' : lvl === 'Intermediate' ? '📈' : lvl === 'Pro' ? '💼' : '🏆'}</span>
                      <span className="text-[9px]">{lvl}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </SectionCard>
          )}

          {/* ════ MY ACCOUNTS ════ */}
          {activeSection === 'accounts' && (
            <SectionCard title="My Trading Accounts" icon="🏦"
              badge={<span className="text-[8px] font-bold text-[#3b82f6] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] px-2 py-0.5 rounded-full">PREMIUM+</span>}>
              {!isPrem ? (
                <div className="py-10 flex flex-col items-center gap-3 text-center">
                  <span className="text-[40px]">🏦</span>
                  <div className="text-[14px] font-bold text-white">Multi-Account Management</div>
                  <div className="text-[12px] text-[#666] max-w-[300px] leading-relaxed">
                    Add up to 3 trading accounts — funded, prop, and live — and switch between them instantly on the Analyse page.
                  </div>
                  <span className="text-[10px] font-bold text-[#f59e0b] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] px-3 py-1 rounded-full">Upgrade to Premium to unlock</span>
                </div>
              ) : (
                <>
                  {/* Account limit indicator */}
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-[#555] font-mono-tv">{accounts.length} / 3 accounts added</div>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className={`w-8 h-1.5 rounded-full ${i < accounts.length ? 'bg-[var(--green)]' : 'bg-[var(--border2)]'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Account cards */}
                  {accountsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="text-[28px] mb-2">💳</div>
                      <div className="text-[12px] text-[#666]">No accounts yet. Add your first trading account.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accounts.map(acc => {
                        const currConfig = CURRENCIES.find(c => c.code === acc.currency)
                        return (
                          <div key={acc.id} className={`rounded-[12px] border p-4 transition-all ${acc.is_active ? 'border-[var(--green)] bg-[var(--green-dim)]' : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--border2)]'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[18px]">{acc.account_type === 'funded' || acc.account_type === 'prop' ? '🏦' : '💼'}</span>
                                <div>
                                  <div className="text-[13px] font-bold text-white">{acc.label}</div>
                                  {acc.prop_firm && <div className="text-[9px] text-[#888] font-mono-tv mt-0.5">{acc.prop_firm}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {acc.is_active && (
                                  <span className="text-[8px] font-bold text-[var(--green)] bg-[var(--green-dim)] border border-[var(--green-border)] px-1.5 py-0.5 rounded-full">ACTIVE</span>
                                )}
                                <button onClick={() => openEditAccount(acc)}
                                  className="text-[11px] text-[#555] hover:text-white px-1 transition-colors" title="Edit">✎</button>
                                <button onClick={() => { if (confirm(`Remove "${acc.label}"?`)) deleteAccount(acc.id) }}
                                  className="text-[11px] text-[#444] hover:text-[var(--red)] px-1 transition-colors" title="Delete">✕</button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-center mt-2">
                              <div className="bg-[rgba(0,0,0,0.2)] rounded-[7px] py-1.5">
                                <div className="text-[7px] text-[#555] font-mono-tv">BALANCE</div>
                                <div className="text-[11px] font-bold text-[var(--green)] font-mono-tv">{currConfig?.symbol}{acc.balance.toLocaleString()}</div>
                              </div>
                              <div className="bg-[rgba(0,0,0,0.2)] rounded-[7px] py-1.5">
                                <div className="text-[7px] text-[#555] font-mono-tv">TYPE</div>
                                <div className="text-[10px] font-bold text-white capitalize">{acc.account_type}</div>
                              </div>
                              <div className="bg-[rgba(0,0,0,0.2)] rounded-[7px] py-1.5">
                                <div className="text-[7px] text-[#555] font-mono-tv">LEVERAGE</div>
                                <div className="text-[10px] font-bold text-white">{acc.leverage}</div>
                              </div>
                            </div>
                            {!acc.is_active && (
                              <button onClick={() => setActiveAccount(acc.id)}
                                className="w-full mt-3 py-1.5 border border-[var(--border2)] rounded-[7px] text-[10px] font-bold text-[#777] hover:text-white hover:bg-[var(--surface3)] transition-all">
                                Set as Active Account
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {accounts.length < 3 && (
                    <button onClick={openNewAccount}
                      className="w-full py-3 border-2 border-dashed border-[var(--border2)] rounded-[12px] text-[12px] font-bold text-[#555] hover:text-white hover:border-[var(--green)] transition-all flex items-center justify-center gap-2">
                      <span className="text-[16px]">+</span> Add Account ({3 - accounts.length} remaining)
                    </button>
                  )}

                  <div className="text-[10px] text-[#444] font-mono-tv bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-3 py-2">
                    💡 The <strong className="text-white">active</strong> account's currency, balance and leverage are used for lot sizing on every scan.
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {/* ════ RISK & LIMITS ════ */}
          {activeSection === 'account' && (
            <SectionCard title="Risk & Limits" icon="💰"
              badge={<span className="text-[8px] font-bold text-[#3b82f6] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] px-2 py-0.5 rounded-full">PREMIUM+</span>}>
              {!isPrem ? (
                <div className="py-10 flex flex-col items-center gap-3 text-center">
                  <span className="text-[40px]">💰</span>
                  <div className="text-[14px] font-bold text-white">Advanced Risk Controls</div>
                  <div className="text-[12px] text-[#666] max-w-[300px] leading-relaxed">
                    Set a custom risk percentage per trade, daily drawdown limits, leverage and prop firm details — all feeding directly into AI lot sizing.
                  </div>
                  <span className="text-[10px] font-bold text-[#f59e0b] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] px-3 py-1 rounded-full">Upgrade to Premium to unlock</span>
                </div>
              ) : (
                <>
                  <Field label="RISK PER TRADE (%)" hint="Fed directly into lot sizing on every scan">
                    <div className="flex items-center gap-4">
                      <input type="range" min={0.5} max={5} step={0.5} value={riskPct}
                        onChange={e => { setRiskPct(parseFloat(e.target.value)); markDirty() }}
                        className="flex-1 accent-[var(--green)]" />
                      <span className="text-[14px] font-extrabold text-[var(--green)] font-mono-tv w-12 text-right">{riskPct}%</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-[#555] font-mono-tv mt-1">
                      <span>0.5% safe</span><span>2.5% moderate</span><span>5% aggressive</span>
                    </div>
                  </Field>

                  <Field label="MAX DAILY DRAWDOWN" hint="A caution banner fires when journal losses approach this limit">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-[12px]">{homeCurrencyConfig?.symbol}</span>
                      <input className="tv-input pl-7" type="number" value={maxDDraw}
                        onChange={e => { setMaxDDraw(e.target.value); markDirty() }} placeholder="e.g. 500" />
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="PREFERRED LEVERAGE">
                      <select className="tv-select" value={leverage} onChange={e => { setLeverage(e.target.value); markDirty() }}>
                        {LEVERAGE_OPTIONS.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="PROP FIRM NAME">
                      <input className="tv-input" value={propFirm} onChange={e => { setPropFirm(e.target.value); markDirty() }}
                        placeholder="e.g. FTMO, The5ers" />
                    </Field>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {/* ════ AI & TRADING ════ */}
          {activeSection === 'ai' && (
            <SectionCard title="AI & Trading Preferences" icon="🤖">
              <Field label="DEFAULT STRATEGY">
                <select className="tv-select" value={settings.strategy} onChange={e => updateSettings({ strategy: e.target.value as any })}>
                  {['ICT','SMC','Support & Resistance','Supply & Demand','CRT','Price Action MS','Top Down Analysis','Mix'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="DEFAULT SESSION">
                <select className="tv-select" value={settings.session} onChange={e => updateSettings({ session: e.target.value as any })}>
                  {['Auto Detect','London','New York','Asian','London/NY Overlap'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="DEFAULT RISK APPETITE">
                <div className="grid grid-cols-3 gap-2">
                  {(['Conservative','Moderate','Aggressive'] as const).map(r => (
                    <button key={r} onClick={() => updateSettings({ riskAppetite: r })}
                      className={`py-2.5 border rounded-[8px] text-[11px] font-bold transition-all
                        ${settings.riskAppetite === r ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]' : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                      {r === 'Conservative' ? '🛡️' : r === 'Moderate' ? '⚖️' : '🔥'} {r}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Trading Style — Premium+ */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv">TRADING STYLE</div>
                  {!isPrem && <span className="text-[8px] font-bold text-[#a855f7] bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] px-1.5 py-0.5 rounded-full">PRO+</span>}
                </div>
                <GatedFeature locked={!isPrem} label="Upgrade to Premium to set your Trading Style">
                  <div className="grid grid-cols-3 gap-2">
                    {(['Scalper','Day Trader','Swing Trader'] as const).map(s => (
                      <button key={s} onClick={() => isPrem && updateSettings({ tradingStyle: s })}
                        className={`py-2.5 border rounded-[8px] text-[11px] font-bold transition-all flex flex-col items-center gap-1
                          ${(settings.tradingStyle || 'Day Trader') === s ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]' : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                        <span>{s === 'Scalper' ? '⚡' : s === 'Day Trader' ? '🎯' : '📈'}</span>
                        <span className="text-[9px]">{s === 'Scalper' ? 'M1–M15' : s === 'Day Trader' ? 'M15–H4' : 'H4–Weekly'}</span>
                      </button>
                    ))}
                  </div>
                </GatedFeature>
              </div>

              <Field label="WIDGETS">
                <div className="space-y-3">
                  {[
                    { key: 'showKillZones' as const, label: 'Kill Zone timing widget', desc: 'Session times on Analyse page' },
                    { key: 'showMarketBrief' as const, label: 'AI Market Brief', desc: 'Daily sentiment banner' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] px-4 py-3">
                      <div>
                        <div className="text-[12px] font-semibold text-white">{item.label}</div>
                        <div className="text-[10px] text-[#555] mt-0.5">{item.desc}</div>
                      </div>
                      <button onClick={() => updateAppearance({ [item.key]: !appearance[item.key] })}
                        className={`rounded-full transition-all relative flex-shrink-0 ml-4 ${appearance[item.key] ? 'bg-[var(--green)]' : 'bg-[var(--border2)]'}`}
                        style={{ width: 40, height: 22 }}>
                        <span className="absolute top-0.5 rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, left: appearance[item.key] ? 20 : 2 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </Field>
            </SectionCard>
          )}

          {/* ════ APPEARANCE ════ */}
          {activeSection === 'appearance' && (
            <SectionCard title="Appearance" icon="🎨">
              {/* Accent color — Premium+ */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv">ACCENT COLOR</div>
                  {!isPrem && <span className="text-[8px] font-bold text-[#a855f7] bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] px-1.5 py-0.5 rounded-full">PRO+</span>}
                </div>
                <GatedFeature locked={!isPrem} label="Upgrade to Premium to customise accent colour">
                  <div className="grid grid-cols-5 gap-2">
                    {ACCENT_OPTIONS.map(a => (
                      <button key={a.id} onClick={() => isPrem && updateAppearance({ accentColor: a.id })}
                        className={`flex flex-col items-center gap-2 py-3 border rounded-[10px] transition-all
                          ${appearance.accentColor === a.id ? 'border-white bg-[var(--surface3)]' : 'border-[var(--border2)] hover:bg-[var(--surface2)]'}`}>
                        <div className="w-6 h-6 rounded-full" style={{ background: a.hex }} />
                        <span className="text-[9px] text-[#888] text-center leading-tight">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </GatedFeature>
              </div>

              <Field label="FONT SIZE">
                <div className="grid grid-cols-3 gap-2">
                  {(['small','default','large'] as const).map(f => (
                    <button key={f} onClick={() => updateAppearance({ fontSize: f })}
                      className={`py-2.5 border rounded-[8px] font-bold transition-all
                        ${appearance.fontSize === f ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]' : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}
                      style={{ fontSize: f === 'small' ? 10 : f === 'default' ? 12 : 14 }}>
                      {f === 'small' ? 'A Small' : f === 'default' ? 'A Default' : 'A Large'}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="flex items-center justify-between bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] px-4 py-3">
                <div>
                  <div className="text-[12px] font-semibold text-white">Compact Layout</div>
                  <div className="text-[10px] text-[#555] mt-0.5">Denser panels — great for mobile</div>
                </div>
                <button onClick={() => updateAppearance({ compactMode: !appearance.compactMode })}
                  className={`rounded-full transition-all relative flex-shrink-0 ml-4 ${appearance.compactMode ? 'bg-[var(--green)]' : 'bg-[var(--border2)]'}`}
                  style={{ width: 40, height: 22 }}>
                  <span className="absolute top-0.5 rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, left: appearance.compactMode ? 20 : 2 }} />
                </button>
              </div>
            </SectionCard>
          )}

          {/* ════ STATS ════ */}
          {activeSection === 'stats' && (
            <SectionCard title="My Trading Stats" icon="📊">
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !stats || stats.totalTrades === 0 ? (
                <div className="text-center py-8">
                  <div className="text-[32px] mb-3">📒</div>
                  <div className="text-[13px] text-[#777]">No closed trades yet.</div>
                  <div className="text-[11px] text-[#555] mt-1">Stats populate once you mark journal trades as Win or Loss.</div>
                </div>
              ) : (
                <>
                  {/* Basic stats — free */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'TOTAL TRADES', value: stats.totalTrades.toString(), sub: `${stats.wins}W · ${stats.losses}L` },
                      { label: 'WIN RATE',     value: `${stats.winRate}%`, sub: stats.winRate >= 50 ? '✅ Above 50%' : '⚠ Below 50%', color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
                    ].map(s => (
                      <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3.5">
                        <div className="text-[8px] font-mono-tv font-bold text-[#555] tracking-widest mb-1.5">{s.label}</div>
                        <div className="text-[20px] font-extrabold font-mono-tv" style={{ color: s.color || 'white' }}>{s.value}</div>
                        <div className="text-[9px] text-[#555] mt-0.5">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Advanced stats — Premium+ */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv">ADVANCED STATS</div>
                      {!isPrem && <span className="text-[8px] font-bold text-[#a855f7] bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] px-1.5 py-0.5 rounded-full">PRO+</span>}
                    </div>
                    <GatedFeature locked={!isPrem} label="Upgrade to Premium for full performance breakdown">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'PROFIT FACTOR', value: stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toString(), sub: stats.profitFactor >= 1.5 ? '✅ Healthy' : stats.profitFactor >= 1 ? '⚖ Break-even' : '⚠ Losing', color: stats.profitFactor >= 1.5 ? 'var(--green)' : stats.profitFactor >= 1 ? 'var(--amber)' : 'var(--red)' },
                          { label: 'BEST PAIR',      value: stats.bestPair,  sub: 'Most profitable' },
                          { label: 'WORST PAIR',     value: stats.worstPair, sub: 'Most losses', color: 'var(--red)' },
                          { label: 'CLOSED TRADES',  value: `${stats.wins + stats.losses}`, sub: 'W/L combined' },
                        ].map(s => (
                          <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3">
                            <div className="text-[7px] font-mono-tv font-bold text-[#555] tracking-widest mb-1.5">{s.label}</div>
                            <div className="text-[16px] font-extrabold font-mono-tv" style={{ color: s.color || 'white' }}>{s.value}</div>
                            <div className="text-[9px] text-[#555] mt-0.5">{s.sub}</div>
                          </div>
                        ))}
                      </div>
                    </GatedFeature>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {/* ════ SECURITY ════ */}
          {activeSection === 'security' && (
            <SectionCard title="Security" icon="🔐">
              <Field label="CHANGE PASSWORD">
                <div className="space-y-3">
                  <input className="tv-input" type="password" placeholder="New password (min. 8 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
                  <input className="tv-input" type="password" placeholder="Confirm new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password" />
                  <button onClick={changePassword} disabled={pwdLoading}
                    className="btn-primary px-5 py-2.5 rounded-[9px] text-[12px] disabled:opacity-50">
                    {pwdLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </Field>
              <Field label="EMAIL ADDRESS">
                <div className="tv-input bg-[var(--surface3)] text-[#555] cursor-not-allowed">{profile?.email || '—'}</div>
                <div className="text-[9px] text-[#444] mt-1">Contact support to change your email address.</div>
              </Field>
              <div className="bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.2)] rounded-[10px] p-4 flex items-start gap-3">
                <span className="text-[20px]">🔑</span>
                <div>
                  <div className="text-[12px] font-bold text-white mb-0.5">Two-Factor Authentication</div>
                  <div className="text-[11px] text-[#666] mb-2">Add 2FA via Google Authenticator. Coming in next release.</div>
                  <span className="text-[9px] font-bold text-[#60a5fa] bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] px-2 py-0.5 rounded-full">COMING SOON</span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ════ BILLING ════ */}
          {activeSection === 'billing' && (
            <SectionCard title="Billing & Subscription" icon="💳">
              <div className="border rounded-[12px] p-4" style={{ borderColor: TIER_TEXT[tier] + '44', background: TIER_TEXT[tier] + '0a' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[22px]">{TIER_ICONS[tier]}</span>
                    <div>
                      <div className="text-[15px] font-extrabold" style={{ color: TIER_TEXT[tier] }}>{tier.toUpperCase()} PLAN</div>
                      <div className="text-[10px] text-[#555]">
                        {tier === 'free' ? 'Free forever' : tier === 'premium' ? '$19.99/month' : tier === 'platinum' ? '$49.99/month' : '$149.99/month'}
                      </div>
                    </div>
                  </div>
                  {tier !== 'free' && <span className="text-[9px] font-bold text-[var(--green)] bg-[var(--green-dim)] border border-[var(--green-border)] px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                {tier !== 'diamond' && (
                  <button onClick={() => toast('Payment integration coming soon! 💳', { icon: '🚀' })}
                    className="w-full py-2.5 border border-[var(--border2)] rounded-[8px] text-[12px] font-semibold text-white hover:bg-[var(--surface2)] transition-all">
                    {tier === 'free' ? '🚀 Upgrade to Premium' : '⬆ Upgrade Plan'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['free','premium','platinum','diamond'] as Tier[]).map(t => {
                  const prices: Record<Tier,string> = { free:'$0', premium:'$19.99', platinum:'$49.99', diamond:'$149.99' }
                  return (
                    <div key={t} className={`rounded-[10px] p-3 text-center border ${t === tier ? 'border-[var(--green)] bg-[var(--green-dim)]' : 'border-[var(--border)] bg-[var(--surface2)]'}`}>
                      <div className="text-[16px] mb-1">{TIER_ICONS[t]}</div>
                      <div className="text-[8px] font-mono-tv font-bold mb-0.5" style={{ color: TIER_TEXT[t] }}>{t.toUpperCase()}</div>
                      <div className="text-[11px] font-extrabold text-white">{prices[t]}</div>
                      {t === tier && <div className="text-[7px] text-[var(--green)] font-bold mt-1">CURRENT</div>}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* ════ DANGER ZONE ════ */}
          {activeSection === 'danger' && (
            <SectionCard title="Danger Zone" icon="⚠️">
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-4 py-3.5">
                  <div>
                    <div className="text-[12px] font-bold text-white">Reset All Settings</div>
                    <div className="text-[10px] text-[#555] mt-0.5">Resets strategy, risk, appearance. Journal data untouched.</div>
                  </div>
                  <button onClick={resetSettings} className="ml-4 px-4 py-2 text-[11px] font-bold rounded-[8px] border border-[var(--border2)] text-[#888] hover:bg-[var(--surface3)] transition-all whitespace-nowrap">Reset</button>
                </div>
                {[
                  { label: 'Clear Analysis History', sub: 'Deletes all saved chart scans. Journal kept.', fn: () => { if (confirm('Delete all analysis history? Cannot be undone.')) clearHistory() } },
                  { label: 'Clear Journal Entries',  sub: 'Deletes all trade records. Scans kept.',      fn: () => { if (confirm('Delete all journal entries? Cannot be undone.')) clearJournal() } },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] rounded-[10px] px-4 py-3.5">
                    <div>
                      <div className="text-[12px] font-bold text-[var(--red)]">{item.label}</div>
                      <div className="text-[10px] text-[#555] mt-0.5">{item.sub}</div>
                    </div>
                    <button onClick={item.fn} disabled={dangerLoading}
                      className="ml-4 px-4 py-2 text-[11px] font-bold rounded-[8px] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-all whitespace-nowrap disabled:opacity-50">
                      Clear
                    </button>
                  </div>
                ))}
                <div className="border-2 border-[rgba(239,68,68,0.4)] rounded-[12px] p-4 bg-[rgba(239,68,68,0.05)]">
                  <div className="text-[13px] font-extrabold text-[var(--red)] mb-1">Delete Account</div>
                  <div className="text-[11px] text-[#666] mb-4 leading-relaxed">
                    Permanently removes your profile, all analyses, journal entries, trading accounts, and cancels your subscription.
                    <strong className="text-white"> This cannot be undone.</strong>
                  </div>
                  <button onClick={() => setShowDeleteModal(true)}
                    className="px-5 py-2.5 text-[12px] font-bold rounded-[9px] bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.4)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white transition-all">
                    Delete My Account
                  </button>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Save bar */}
      {(activeSection === 'profile' || activeSection === 'account') && (
        <SaveBar onSave={saveProfile} saving={saving} dirty={dirty} />
      )}

      {/* Account form modal */}
      {editingAccId !== null && <AccountForm />}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-[rgba(8,8,8,0.92)] z-50 flex items-center justify-center backdrop-blur-lg p-4"
          onClick={() => setShowDeleteModal(false)}>
          <div className="bg-[var(--surface)] border border-[rgba(239,68,68,0.5)] rounded-[18px] p-8 max-w-[420px] w-full animate-fade-up"
            onClick={e => e.stopPropagation()}>
            <div className="text-[36px] mb-3 text-center">🗑️</div>
            <h3 className="text-[20px] font-extrabold text-[var(--red)] text-center mb-2">Delete Account</h3>
            <p className="text-[12px] text-[#777] text-center mb-6 leading-relaxed">
              This removes everything — profile, journal ({stats?.totalTrades || 0} trades), all analyses, and {accounts.length} trading account(s).
              <strong className="text-white block mt-1">Irreversible.</strong>
            </p>
            <div className="mb-5">
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">TYPE "DELETE" TO CONFIRM</div>
              <input className="tv-input text-center font-mono-tv text-[var(--red)] font-bold tracking-widest"
                value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value.toUpperCase())} placeholder="DELETE" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                className="py-3 border border-[var(--border2)] rounded-[9px] text-[12px] font-bold text-[#777] hover:bg-[var(--surface2)] transition-all">Cancel</button>
              <button onClick={deleteAccount_full} disabled={deleteConfirm !== 'DELETE' || dangerLoading}
                className="py-3 rounded-[9px] text-[12px] font-bold bg-[var(--red)] text-white hover:bg-[#dc2626] transition-all disabled:opacity-40">
                {dangerLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
