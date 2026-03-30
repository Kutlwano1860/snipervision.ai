'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { CURRENCIES, TIER_LIMITS, TIER_ICONS } from '@/lib/constants'
import type { Currency, Tier } from '@/types'

const TIER_COLORS: Record<Tier, string> = {
  free:     'rgba(107,114,128,0.12)',
  premium:  'rgba(59,130,246,0.12)',
  platinum: 'rgba(167,139,250,0.12)',
  diamond:  'rgba(245,158,11,0.12)',
}
const TIER_TEXT: Record<Tier, string> = {
  free: '#6b7280', premium: '#3b82f6', platinum: '#a78bfa', diamond: '#f59e0b',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { profile, setProfile, sessionTradingCurrency, setSessionTradingCurrency } = useAppStore() // eslint-disable-line
  const [showTacModal, setShowTacModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedTier, setSelectedTier] = useState<Tier>('premium')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  // Fallback display name sourced from auth metadata when profile row not loaded yet
  const [authDisplayName, setAuthDisplayName] = useState<string>('')

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      // No valid session at all — force sign out and redirect to login
      if (authError || !user) {
        await supabase.auth.signOut()
        setProfile(null)
        router.replace('/login')
        return
      }

      // Store auth-level name/email as fallback for avatar before DB responds
      const metaName  = user.user_metadata?.name as string | undefined
      const metaEmail = user.email || ''
      setAuthDisplayName(metaName || metaEmail)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data as any)
      } else if (profileError) {
        // Profile row missing — auto-create so the app stays usable
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id:                       user.id,
            email:                    metaEmail,
            name:                     metaName || metaEmail.split('@')[0],
            tier:                     'free',
            daily_analyses_used:      0,
            home_currency:            'ZAR',
            default_trading_currency: 'GBP',
            account_type:             'micro',
            account_balance:          0,
          })
          .select()
          .single()
        if (newProfile) setProfile(newProfile as any)
      }
    }
    loadProfile()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/')
  }

  const tier = (profile?.tier || 'free') as Tier

  const tabs = [
    { label: 'Analyse',   href: '/dashboard' },
    { label: 'Journal',   href: '/dashboard/journal' },
    { label: 'Watchlist', href: '/dashboard/watchlist' },
  ]

  const tacCurrencies: Currency[] = ['USD','GBP','EUR','AUD','ZAR','CAD','JPY','CHF','NZD']

  return (
    <div className="flex flex-col min-h-screen">
      {/* App Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-7 h-14 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)] backdrop-blur-xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          TradeVision AI
        </Link>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-0.5">
          {tabs.map(t => (
            <Link key={t.href} href={t.href}
              className={`px-4 py-1.5 rounded-[7px] text-[12px] font-semibold transition-all
                ${pathname === t.href
                  ? 'bg-[var(--surface3)] text-white border border-[var(--border2)]'
                  : 'text-[#777] hover:text-white'}`}>
              {t.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Currency indicator */}
          <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-md px-2.5 py-1 text-[10px] font-mono-tv">
            <span className="text-[#777]">
              {CURRENCIES.find(c => c.code === (profile?.home_currency || 'ZAR'))?.flag} {profile?.home_currency || 'ZAR'}
            </span>
            <span className="text-[var(--border2)]">|</span>
            <button onClick={() => setShowTacModal(true)}
              className="text-[var(--green)] hover:underline flex items-center gap-0.5">
              {CURRENCIES.find(c => c.code === sessionTradingCurrency)?.flag} {sessionTradingCurrency} ▾
            </button>
          </div>

          {/* Tier badge */}
          <button onClick={() => setShowUpgradeModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-tv tracking-wider border"
            style={{ background: TIER_COLORS[tier], color: TIER_TEXT[tier], borderColor: TIER_TEXT[tier] + '44' }}>
            {TIER_ICONS[tier]} {tier.toUpperCase()}
          </button>

          {/* Avatar with profile dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--green)] to-[#16a34a] flex items-center justify-center text-[11px] font-extrabold text-black cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowProfileMenu(v => !v)}>
              {(profile?.name || authDisplayName || '?').charAt(0).toUpperCase()}
            </div>
            {showProfileMenu && (() => {
              const limit     = TIER_LIMITS[tier]
              const used      = profile?.daily_analyses_used ?? 0
              const usedToday = profile?.last_analysis_date === new Date().toISOString().split('T')[0] ? used : 0
              const pct       = limit >= 999 ? 100 : Math.min(100, Math.round((usedToday / limit) * 100))
              const barColor  = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--amber)' : 'var(--green)'
              const homeCurr  = CURRENCIES.find(c => c.code === (profile?.home_currency || 'ZAR'))
              const tradeCurr = CURRENCIES.find(c => c.code === (profile?.default_trading_currency || 'GBP'))
              const balance   = profile?.account_balance ?? 0
              const memberSince = profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                : null

              return (
                <div className="absolute right-0 top-10 bg-[var(--surface)] border border-[var(--border2)] rounded-[14px] shadow-2xl py-1.5 w-64 z-50 animate-fade-up">
                  {/* Identity */}
                  <div className="px-4 pt-3 pb-3 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-[13px] font-extrabold text-white truncate">{profile?.name || authDisplayName || 'Trader'}</div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0 ml-2"
                        style={{ background: TIER_COLORS[tier], color: TIER_TEXT[tier], borderColor: TIER_TEXT[tier] + '44' }}>
                        {TIER_ICONS[tier]} {tier.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#777] truncate">{profile?.email || authDisplayName || ''}</div>
                    {memberSince && (
                      <div className="text-[9px] text-[#555] mt-0.5 font-mono-tv">Member since {memberSince}</div>
                    )}
                  </div>

                  {/* Daily usage */}
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[9px] font-mono-tv font-bold tracking-wider text-[#777]">TODAY'S ANALYSES</div>
                      <div className="text-[10px] font-bold font-mono-tv" style={{ color: barColor }}>
                        {limit >= 999 ? `${usedToday} used` : `${usedToday} / ${limit}`}
                      </div>
                    </div>
                    {limit < 999 && (
                      <div className="h-1 bg-[var(--border2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                    )}
                    {limit >= 999 && (
                      <div className="text-[9px] text-[var(--green)] font-mono-tv">Unlimited analyses</div>
                    )}
                  </div>

                  {/* Account details */}
                  <div className="px-4 py-3 border-b border-[var(--border)] grid grid-cols-2 gap-y-2">
                    <div>
                      <div className="text-[8px] font-mono-tv tracking-wider text-[#555] mb-0.5">HOME</div>
                      <div className="text-[11px] font-bold text-white">{homeCurr?.flag} {homeCurr?.code}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono-tv tracking-wider text-[#555] mb-0.5">TRADING</div>
                      <div className="text-[11px] font-bold text-white">{tradeCurr?.flag} {tradeCurr?.code}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono-tv tracking-wider text-[#555] mb-0.5">ACCOUNT</div>
                      <div className="text-[11px] font-bold text-white capitalize">{profile?.account_type || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono-tv tracking-wider text-[#555] mb-0.5">BALANCE</div>
                      <div className="text-[11px] font-bold text-[var(--green)]">
                        {tradeCurr?.symbol}{balance > 0 ? balance.toLocaleString() : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => { setShowProfileMenu(false); setShowUpgradeModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-[12px] text-[#999] hover:text-white hover:bg-[var(--surface2)] transition-colors flex items-center gap-2">
                    🚀 Upgrade Plan
                  </button>
                  <button
                    onClick={() => { setShowProfileMenu(false); handleLogout() }}
                    className="w-full text-left px-4 py-2.5 text-[12px] text-[var(--red)] hover:bg-[rgba(239,68,68,0.08)] transition-colors flex items-center gap-2">
                    ↪ Sign Out
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Trading Account Currency Modal */}
      {showTacModal && (
        <div className="fixed inset-0 bg-[rgba(8,8,8,0.9)] z-50 flex items-center justify-center backdrop-blur-lg p-4"
          onClick={() => setShowTacModal(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[18px] p-8 max-w-[420px] w-full animate-fade-up"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTacModal(false)}
              className="absolute top-3 right-3 w-7 h-7 bg-[var(--surface3)] border border-[var(--border)] rounded-md text-[#777] flex items-center justify-center text-xs hover:text-white">✕</button>
            <h3 className="text-[22px] font-extrabold tracking-tight mb-2">Switch Trading Account</h3>
            <p className="text-[12px] text-[#777] mb-5 leading-relaxed">
              Select which broker account currency you're trading with <strong className="text-white">today</strong>. Your home currency ({profile?.home_currency || 'ZAR'}) stays the same — P&L shown in both.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {tacCurrencies.map(code => {
                const c = CURRENCIES.find(x => x.code === code)!
                return (
                  <button key={code}
                    onClick={() => { setSessionTradingCurrency(code); setShowTacModal(false); toast.success(`Trading account switched to ${code}`) }}
                    className={`py-2.5 border rounded-[8px] text-[12px] font-bold transition-all
                      ${sessionTradingCurrency === code
                        ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                        : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                    {c.flag} {code}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[#777]">💡 Your default trading currency is saved in your profile settings.</p>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-[rgba(8,8,8,0.9)] z-50 flex items-center justify-center backdrop-blur-lg p-4"
          onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[18px] p-8 max-w-[440px] w-full animate-fade-up"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-[22px] font-extrabold tracking-tight mb-2">🚀 Unlock More Power</h3>
            <p className="text-[12px] text-[#777] mb-5">Upgrade to access deeper analysis, live market data, macro intelligence, and more.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['premium','platinum','diamond','free'] as Tier[]).map(t => {
                const prices: Record<Tier,string> = { free:'$0', premium:'$19.99', platinum:'$49.99', diamond:'$149.99' }
                return (
                  <button key={t} onClick={() => setSelectedTier(t)}
                    className={`p-3 border-2 rounded-[10px] text-center transition-all
                      ${selectedTier === t ? 'border-[var(--green)]' : 'border-[var(--border)]'}`}>
                    <div className="text-[18px] mb-1">{TIER_ICONS[t]}</div>
                    <div className="text-[9px] font-mono-tv font-bold tracking-wider" style={{ color: TIER_TEXT[t] }}>{t.toUpperCase()}</div>
                    <div className="text-[15px] font-extrabold" style={{ color: TIER_TEXT[t] }}>{prices[t]}</div>
                  </button>
                )
              })}
            </div>
            {/* TODO: Stripe integration
                  1. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local
                  2. Add STRIPE_SECRET_KEY to .env.local
                  3. Create /api/stripe/checkout route that calls stripe.checkout.sessions.create()
                  4. Create /api/webhooks/stripe route to handle subscription updates
                  5. Replace the toast below with: router.push(await fetch('/api/stripe/checkout', { method:'POST', body: JSON.stringify({ tier: selectedTier }) }).then(r=>r.json()).then(d=>d.url))
            */}
            <button onClick={() => { setShowUpgradeModal(false); toast('Payment integration coming soon!', { icon: '💳' }) }}
              className="btn-primary w-full py-3 rounded-[10px] text-[14px]">
              {selectedTier === 'free' ? 'Stay on Free' : `Start Trial — ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
