'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PLANS, getCurrency } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import type { SubscriptionPlan } from '@/types'

// ── Ticker Bar (Live) ──
interface TickerItem {
  pair: string
  price: string
  chg: string
  dir: 'up' | 'down'
}

function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([])

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch('/api/market')
        if (!res.ok) return
        const data = await res.json()
        setItems(data.ticker.map((t: any) => ({
          pair:  t.pair,
          price: t.price,
          chg:   t.chg,
          dir:   t.dir,
        })))
      } catch {
        // silently fail — ticker is decorative on landing page
      }
    }
    fetchTicker()
    const interval = setInterval(fetchTicker, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Fallback static data while loading
  const display: TickerItem[] = items.length > 0 ? items : [
    { pair: 'XAUUSD', price: '—', chg: '—', dir: 'up' },
    { pair: 'EURUSD', price: '—', chg: '—', dir: 'up' },
    { pair: 'BTCUSD', price: '—', chg: '—', dir: 'up' },
    { pair: 'NAS100', price: '—', chg: '—', dir: 'up' },
    { pair: 'GBPJPY', price: '—', chg: '—', dir: 'up' },
    { pair: 'USOIL',  price: '—', chg: '—', dir: 'up' },
    { pair: 'SPX500', price: '—', chg: '—', dir: 'up' },
    { pair: 'ETHUSD', price: '—', chg: '—', dir: 'up' },
    { pair: 'GBPUSD', price: '—', chg: '—', dir: 'up' },
    { pair: 'USDJPY', price: '—', chg: '—', dir: 'up' },
  ]

  const doubled = [...display, ...display]

  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] py-2">
      <div className="inline-flex gap-10 animate-ticker">
        {doubled.map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2 text-xs font-mono-tv">
            <span className="font-bold text-white">{item.pair}</span>
            <span className="text-[#777]">{item.price}</span>
            <span className={item.dir === 'up' ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
              {item.price !== '—' && (item.dir === 'up' ? '▲' : '▼')} {item.chg}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Nav ──
function Nav() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user)
    })
  }, [])

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 h-14 md:h-16 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)] backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[15px] md:text-[17px] font-bold shrink-0">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
          <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="hidden sm:inline">TradeVision AI</span>
        <span className="sm:hidden text-[var(--green)]">TV</span>
      </div>
      <div className="hidden md:flex items-center gap-7">
        <a href="#features" className="text-[13px] text-[#777] hover:text-white transition-colors">Features</a>
        <a href="#how" className="text-[13px] text-[#777] hover:text-white transition-colors">How It Works</a>
        <a href="#pricing" className="text-[13px] text-[#777] hover:text-white transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {loggedIn ? (
          <Link href="/dashboard" className="btn-primary text-[12px] sm:text-[13px] px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg">Go to Dashboard →</Link>
        ) : (
          <>
            <Link href="/login" className="btn-outline text-[12px] sm:text-[13px] px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg">Login</Link>
            <Link href="/register" className="btn-primary text-[12px] sm:text-[13px] px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}

// ── Hero Demo Card ──
function DemoCard() {
  return (
    <div className="animate-fade-up bg-[var(--surface)] border border-[var(--border2)] rounded-[18px] p-6 max-w-[660px] w-full mx-auto text-left mt-2"
         style={{ animationDelay: '0.15s' }}>
      {/* Event alert */}
      <div className="flex items-center gap-2 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.25)] rounded-lg px-3 py-2 mb-4 text-[12px] text-[var(--amber)]">
        <span className="w-[6px] h-[6px] rounded-full bg-[var(--amber)] animate-pulse-dot flex-shrink-0" />
        <strong>⚠️ Live Alert:</strong>&nbsp;US CPI releases in 4h 20m — high volatility expected on USD pairs
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--green-dim)] border border-[var(--green-border)] rounded-[10px] flex items-center justify-center text-[var(--green)] text-base">◎</div>
          <div>
            <div className="text-[15px] font-bold">EUR/USD Analysis</div>
            <div className="text-[11px] text-[#777] font-mono-tv mt-0.5">1H Timeframe · USD Trading Account</div>
          </div>
        </div>
        <div className="bg-[var(--green-dim)] border border-[var(--green-border)] text-[var(--green)] px-3 py-1 rounded-full text-[11px] font-bold font-mono-tv tracking-wider">
          BULLISH BIAS
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Entry',       value: '1.0842', color: 'text-[var(--green)]' },
          { label: 'Stop Loss',   value: '1.0815', color: 'text-[var(--red)]' },
          { label: 'Take Profit', value: '1.0895', color: 'text-[var(--green)]' },
          { label: 'Confidence',  value: '87%',    color: 'text-[var(--amber)]' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 text-center">
            <div className="text-[10px] text-[#777] mb-1">{s.label}</div>
            <div className={`text-[17px] font-extrabold font-mono-tv ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Lot sizing preview */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 mb-4">
        <div className="text-[9px] font-bold font-mono-tv tracking-wider text-[var(--green)] mb-2">
          💰 SMART LOT SIZING — $800 USD MICRO ACCOUNT (≈ R14,960 ZAR)
        </div>
        <div className="grid grid-cols-4 gap-2 text-[9px] font-mono-tv text-[#444] px-2 mb-1">
          {['TYPE','LOTS','RISK','TP1 PROFIT'].map(h => <span key={h}>{h}</span>)}
        </div>
        {[
          { type:'Conservative', lots:'2×0.01', risk:'$8 (R150)',  profit:'$20 (R374)' },
          { type:'Moderate',     lots:'3×0.02', risk:'$18 (R337)', profit:'$46 (R861)' },
        ].map(r => (
          <div key={r.type} className="grid grid-cols-4 gap-2 items-center bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1.5 mb-1 text-[10px] font-mono-tv">
            <span className="text-[#777] font-bold">{r.type}</span>
            <span className="text-[var(--blue)]">{r.lots}</span>
            <span className="text-[var(--red)]">{r.risk}</span>
            <span className="text-[var(--green)]">{r.profit}</span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 flex gap-3 items-start">
        <div className="w-7 h-7 bg-[var(--green-dim)] rounded-[7px] flex items-center justify-center text-[var(--green)] text-xs flex-shrink-0 mt-0.5">◎</div>
        <p className="text-[12px] text-[#777] leading-relaxed">
          <strong className="text-white">AI Reasoning:</strong> Price formed a bullish order block at the 1.0830 demand zone with a fair value gap fill. RSI showing bullish divergence on the 1H. DXY weakening supports EUR upside.{' '}
          <strong className="text-[var(--amber)]">⚠️ Consider sizing down 50% due to CPI risk in 4h.</strong> R:R ratio: 1:1.96
        </p>
      </div>
    </div>
  )
}

// ── Pricing Card ──
function PricingCard({ plan }: { plan: SubscriptionPlan }) {
  const tierColors: Record<string, string> = {
    free: '#6b7280', premium: '#3b82f6', platinum: '#f59e0b', diamond: '#f59e0b',
  }
  const color = tierColors[plan.tier] || '#fff'

  return (
    <div className={`relative flex flex-col bg-[var(--surface)] border rounded-[18px] p-5 md:p-7 transition-all duration-300 hover:-translate-y-1
      ${plan.popular ? 'border-[rgba(245,158,11,0.4)] bg-gradient-to-b from-[rgba(245,158,11,0.05)] to-[var(--surface)]' : 'border-[var(--border)]'}`}>
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--amber)] text-black text-[10px] font-extrabold px-4 py-1 rounded-full whitespace-nowrap tracking-wider">
          Most Popular
        </div>
      )}
      <div className="text-[13px] font-bold mb-3" style={{ color }}>{plan.name}</div>
      <div className="text-[38px] font-black tracking-tight leading-none mb-1" style={{ color: plan.popular ? color : undefined }}>
        <sup className="text-lg font-semibold">$</sup>
        {plan.price === 0 ? '0' : plan.price.toFixed(2).replace('.00', '')}
      </div>
      <div className="text-[12px] text-[#777] mb-6">{plan.period}</div>
      <div className="h-px bg-[var(--border)] mb-5" />
      <ul className="flex-1 flex flex-col gap-2.5 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 text-[12px] leading-snug ${f.included ? 'text-white' : 'text-[#555]'}`}>
            <span className={`w-[14px] h-[14px] rounded-full flex items-center justify-center text-[8px] flex-shrink-0 mt-0.5
              ${f.included ? 'bg-[var(--green-dim)] text-[var(--green)] border border-[var(--green-border)]' : 'bg-[var(--surface3)] text-[#444]'}`}>
              {f.included ? '✓' : '✗'}
            </span>
            <span className={f.highlight ? 'text-[var(--green)] font-semibold' : ''}>{f.text}</span>
          </li>
        ))}
      </ul>
      <Link href="/register"
        className={`w-full py-3 rounded-[10px] text-[13px] font-bold text-center transition-all
          ${plan.popular
            ? 'bg-[var(--green)] text-black hover:brightness-110'
            : 'bg-transparent border border-[var(--border2)] text-white hover:bg-[var(--surface2)]'
          }`}>
        {plan.ctaText}
      </Link>
    </div>
  )
}

// ── Main Landing Page ──
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <TickerBar />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-8 py-24 animate-fade-up">
        <div className="inline-flex items-center gap-2 bg-[var(--green-dim)] border border-[var(--green-border)] text-[var(--green)] px-4 py-1.5 rounded-full text-[12px] font-bold mb-8 font-mono-tv tracking-wider">
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] animate-pulse-dot" />
          AI-Powered Trading Intelligence
        </div>
        <h1 className="text-[clamp(46px,7vw,86px)] font-black leading-[1.04] tracking-[-2.5px] mb-0">
          Institutional-Grade Analysis.
          <br />
          <span className="text-[var(--green)]">From a Screenshot.</span>
        </h1>
        <p className="text-[17px] text-[#777] max-w-[520px] leading-relaxed mt-6 mb-10">
          Upload any chart. Get AI-powered technical analysis, live market context, smart lot sizing, and a complete trade plan — in seconds.
        </p>
        <div className="flex items-center gap-3 mb-16">
          <Link href="/register" className="btn-primary text-[15px] px-8 py-3.5 rounded-[10px]">
            Start Analyzing — Free →
          </Link>
          <a href="#pricing" className="btn-outline text-[15px] px-8 py-3.5 rounded-[10px]">
            View Pricing
          </a>
        </div>
        <DemoCard />
      </section>

      {/* Features */}
      <section id="features" className="px-12 py-24 bg-[var(--bg2)] border-t border-[var(--border)]">
        <div className="text-center mb-14">
          <h2 className="text-[clamp(30px,4vw,46px)] font-extrabold tracking-tight mb-3">Built for Serious Traders</h2>
          <p className="text-[15px] text-[#777] max-w-md mx-auto">Everything you need to make confident, data-driven decisions.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-[960px] mx-auto">
          {[
            { icon:'👁',  title:'AI Chart Reading',          desc:'Vision AI reads any chart screenshot from TradingView, MT4, MT5, cTrader, Binance — any platform, any timeframe.' },
            { icon:'🎯',  title:'Entry, SL & 3 TP Levels',   desc:'Precise entry zones, stop loss placement and 3 take profit targets with full risk/reward ratios on every analysis.' },
            { icon:'📡',  title:'Live Market Intelligence',   desc:'Economic calendar, DXY direction, sentiment data, and correlation alerts injected into every analysis in real time.' },
            { icon:'💰',  title:'Smart Lot Sizing',           desc:'AI suggests exact lot sizes for your account. Results shown in both your trading currency and home currency.' },
            { icon:'🧠',  title:'Smart Money Concepts',       desc:'Order blocks, fair value gaps, liquidity sweeps, BOS and CHOCH detected and explained automatically.' },
            { icon:'🔀',  title:'Multi-Timeframe Confluence', desc:'Upload H4, H1, and M15 simultaneously. AI cross-references all three and only signals when aligned.' },
            { icon:'🏦',  title:'Prop Firm Mode',             desc:'Input your prop firm rules. Every analysis filters against your daily loss limit, drawdown, and risk parameters.' },
            { icon:'📓',  title:'Trade Journal + Accuracy',   desc:'Every analysis auto-logged. Track AI accuracy over time, win rate, best assets, and P&L in your home currency.' },
            { icon:'🌍',  title:'Multi-Currency Support',     desc:'Set your home currency at registration. Risk and P&L shown in both your trading account and home currency.' },
          ].map(f => (
            <div key={f.title}
              className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-7 transition-all duration-300 hover:border-[var(--border2)] hover:-translate-y-1 overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--green)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-11 h-11 bg-[var(--green-dim)] border border-[var(--green-border)] rounded-[11px] flex items-center justify-center text-[18px] mb-4">{f.icon}</div>
              <h3 className="text-[14px] font-bold mb-2">{f.title}</h3>
              <p className="text-[12px] text-[#777] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-12 py-24">
        <div className="text-center mb-14">
          <h2 className="text-[clamp(30px,4vw,46px)] font-extrabold tracking-tight mb-3">How It Works</h2>
          <p className="text-[15px] text-[#777]">From screenshot to trade plan in <span className="text-[var(--green)]">under 10 seconds.</span></p>
        </div>
        <div className="grid grid-cols-3 gap-8 max-w-[860px] mx-auto text-center">
          {[
            { n:'01', icon:'📸', title:'Screenshot Your Chart',   desc:'Capture from any platform — TradingView, MT4, Thinkorswim, or mobile. Any timeframe, any asset.' },
            { n:'02', icon:'⚙️', title:'AI Analyzes Everything',  desc:'Vision AI reads candlesticks, patterns, indicators, and overlays live market context, news risk, and macro data.' },
            { n:'03', icon:'✅', title:'Get Your Full Trade Plan', desc:'Entry, SL, 3 TPs, lot sizing for your account, risk in your home currency, and full AI reasoning — all in one report.' },
          ].map(s => (
            <div key={s.n} className="p-4">
              <div className="text-[12px] font-bold text-[var(--amber)] font-mono-tv tracking-wider mb-3">{s.n}</div>
              <div className="w-16 h-16 bg-[var(--surface2)] border border-[var(--border2)] rounded-[14px] flex items-center justify-center text-[26px] mx-auto mb-5">{s.icon}</div>
              <h3 className="text-[15px] font-bold mb-2">{s.title}</h3>
              <p className="text-[13px] text-[#777] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 sm:px-8 md:px-12 py-16 md:py-24 bg-[var(--bg2)] border-t border-[var(--border)]">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-[clamp(28px,4vw,46px)] font-extrabold tracking-tight mb-3">Simple, Transparent Pricing</h2>
          <p className="text-[14px] md:text-[15px] text-[#777]">Start free. Upgrade when you need more power.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-[1080px] mx-auto">
          {PLANS.map(plan => <PricingCard key={plan.tier} plan={plan} />)}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-4 sm:px-8 md:px-12 py-10 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-bold mb-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
              <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            TradeVision AI
          </div>
          <p className="text-[11px] text-[#444] max-w-[480px] leading-relaxed">
            TradeVision AI provides educational analysis only. This is not financial advice. Trading involves substantial risk of loss and is not suitable for every investor. Past performance is not indicative of future results.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 text-[12px]">
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#555] mb-1">PRODUCT</div>
            <a href="#features" className="text-[#777] hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-[#777] hover:text-white transition-colors">Pricing</a>
            <Link href="/how-to-use" className="text-[#777] hover:text-white transition-colors">How to Use</Link>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#555] mb-1">LEGAL</div>
            <Link href="/terms" className="text-[#777] hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-[#777] hover:text-white transition-colors">Privacy Policy</Link>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#555] mb-1">CONTACT</div>
            <a href="mailto:support@tradevisionsai.com" className="text-[#777] hover:text-white transition-colors">support@tradevisionsai.com</a>
            <a href="https://discord.gg/tradevisionsai" target="_blank" rel="noreferrer" className="text-[#777] hover:text-white transition-colors">Discord Community</a>
            <a href="https://instagram.com/tradevisionsai" target="_blank" rel="noreferrer" className="text-[#777] hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
      <div className="text-center text-[11px] text-[#444] py-4 border-t border-[var(--border)]">
        © 2026 TradeVision AI. All rights reserved.
      </div>
    </div>
  )
}