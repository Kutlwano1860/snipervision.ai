'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { CURRENCIES } from '@/lib/constants'
import type { Currency, AccountType } from '@/types'

const TRADING_CURRENCIES: Currency[] = ['USD','GBP','EUR','AUD','ZAR','CAD','JPY','CHF','NZD']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  // Step 1
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  // Step 2
  const [homeCurrency, setHomeCurrency]       = useState<Currency>('ZAR')
  const [tradingCurrency, setTradingCurrency] = useState<Currency>('USD')

  // Step 3
  const [accountType, setAccountType]       = useState<AccountType>('micro')
  const [accountBalance, setAccountBalance] = useState('')

  const supabase = createClient()

  const tradingConfig = CURRENCIES.find(c => c.code === tradingCurrency)
  const homeConfig    = CURRENCIES.find(c => c.code === homeCurrency)
  const balNum        = parseFloat(accountBalance) || 0
  const balInHome     = homeConfig && tradingConfig
    ? (balNum * tradingConfig.rateToZAR / homeConfig.rateToZAR).toFixed(0)
    : '0'

  // ── If already logged in, redirect to dashboard ──
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    }
    checkSession()
  }, [])

  async function handleSubmit() {
    if (!name || !email || !password) { toast.error('Please fill in all fields'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (!accountBalance || balNum <= 0) { toast.error('Please enter your account balance'); return }

    setLoading(true)
    try {
      // 1. Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) throw error
      if (!data.user) throw new Error('No user returned from signup')

      // 2. Create profile in Supabase
      const { error: profileError } = await supabase.from('profiles').upsert({
        id:                       data.user.id,
        email,
        name,
        home_currency:            homeCurrency,
        default_trading_currency: tradingCurrency,
        account_type:             accountType,
        account_balance:          balNum,
        tier:                     'free',
        daily_analyses_used:      0,
        last_analysis_date:       null,
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't throw — user is created, profile might already exist
      }

      // If Supabase returns a session immediately (email confirmation disabled) → go to dashboard
      // If not (confirmation email sent) → show the "check your email" screen
      if (data.session) {
        toast.success('Account created! Welcome to TradeVision AI 🎉')
        router.replace('/dashboard')
      } else {
        setRegisteredEmail(email)
        setEmailSent(true)
      }

    } catch (err: any) {
      console.error('Registration error:', err)
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const accountTypes: { id: AccountType; name: string; desc: string }[] = [
    { id:'micro',    name:'Micro Account',       desc:'$10–$500 · lots from 0.01' },
    { id:'standard', name:'Standard Account',    desc:'$500–$5K · standard lots'  },
    { id:'pro',      name:'Professional',         desc:'$5K+ · larger positions'   },
    { id:'prop',     name:'Prop Firm Challenge',  desc:'Challenge rules apply'      },
    { id:'funded',   name:'Funded Account',       desc:'Live funded account'        },
    { id:'cent',     name:'Cent Account',         desc:'Cent lots, micro sizing'    },
  ]

  // Show spinner while checking session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-5 h-5 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Email confirmation required screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-6">
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[20px] p-10 w-full max-w-[440px] animate-fade-up text-center">
          <div className="text-[48px] mb-4">📬</div>
          <h2 className="text-[22px] font-extrabold tracking-tight mb-2">Check your email</h2>
          <p className="text-[13px] text-[#777] mb-2 leading-relaxed">
            We sent a confirmation link to
          </p>
          <p className="text-[14px] font-bold text-white mb-5">{registeredEmail}</p>
          <p className="text-[12px] text-[#777] mb-6 leading-relaxed">
            Click the link in the email to verify your account, then come back and log in.
          </p>
          <Link href="/login" className="btn-primary block w-full py-3 rounded-[10px] text-[14px] text-center">
            Go to Login →
          </Link>
          <p className="text-[11px] text-[#555] mt-4">No email? Check your spam folder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-12 h-16 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)]">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          TradeVision AI
        </Link>
        <Link href="/login" className="btn-outline text-[13px] px-5 py-2 rounded-lg">← Back to Login</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[20px] p-10 w-full max-w-[480px] animate-fade-up">

          {/* Step indicator */}
          <div className="flex gap-2 mb-8">
            {[1,2,3].map(s => (
              <div key={s} className={`h-[3px] flex-1 rounded-full transition-all duration-300
                ${s < step ? 'bg-[var(--green)]' : s === step ? 'bg-[var(--green)] opacity-50' : 'bg-[var(--border2)]'}`} />
            ))}
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Create your account</h2>
              <p className="text-[13px] text-[#777] mb-7">Join traders using AI to trade smarter.</p>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">FULL NAME</div>
                  <input
                    className="tv-input"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">EMAIL ADDRESS</div>
                  <input
                    className="tv-input"
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">PASSWORD</div>
                  <input
                    className="tv-input"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    onKeyDown={e => e.key === 'Enter' && setStep(2)}
                  />
                </div>
              </div>
              <button onClick={() => {
                if (!name || !email || !password) { toast.error('Fill in all fields'); return }
                if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
                setStep(2)
              }} className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] mt-6">
                Continue →
              </button>
              <p className="text-center text-[12px] text-[#777] mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--green)] hover:underline">Login</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Your currency setup</h2>
              <p className="text-[13px] text-[#777] mb-6 leading-relaxed">
                Set your <strong className="text-white">home currency</strong> (how you think about money) and your <strong className="text-white">trading account currency</strong> (your broker). You can switch the trading currency per session inside the app.
              </p>

              {/* Home currency */}
              <div className="mb-6">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-2">HOME CURRENCY — where you live</div>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.filter(c => c.code !== 'OTHER').map(c => (
                    <button key={c.code}
                      onClick={() => setHomeCurrency(c.code)}
                      className={`py-2.5 px-2 border rounded-[8px] text-center text-[12px] font-bold transition-all
                        ${homeCurrency === c.code
                          ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                          : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                      <div className="text-[16px] mb-0.5">{c.flag}</div>
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trading currency */}
              <div className="mb-6">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-2">TRADING ACCOUNT CURRENCY — your broker</div>
                <div className="grid grid-cols-3 gap-2">
                  {TRADING_CURRENCIES.map(code => {
                    const c = CURRENCIES.find(x => x.code === code)!
                    return (
                      <button key={code}
                        onClick={() => setTradingCurrency(code)}
                        className={`py-2.5 px-2 border rounded-[8px] text-center text-[12px] font-bold transition-all
                          ${tradingCurrency === code
                            ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                            : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                        <div className="text-[16px] mb-0.5">{c.flag}</div>
                        {code}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-[#777] mt-2 leading-relaxed">
                  💡 You can switch this per session — e.g. today GBP account, tomorrow USD account.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-outline px-5 py-3 rounded-[10px] text-[13px]">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3 rounded-[10px] text-[14px]">Continue →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Your trading account</h2>
              <p className="text-[13px] text-[#777] mb-6">
                This helps the AI calculate accurate lot sizes and risk amounts for your setup.
              </p>

              {/* Account type */}
              <div className="mb-5">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-2">ACCOUNT TYPE</div>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypes.map(a => (
                    <button key={a.id}
                      onClick={() => setAccountType(a.id)}
                      className={`p-3 border rounded-[8px] text-left transition-all
                        ${accountType === a.id
                          ? 'border-[var(--green)] bg-[var(--green-dim)]'
                          : 'border-[var(--border2)] hover:bg-[var(--surface2)]'}`}>
                      <div className={`text-[12px] font-bold ${accountType === a.id ? 'text-[var(--green)]' : 'text-white'}`}>{a.name}</div>
                      <div className="text-[10px] text-[#777] mt-0.5">{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance */}
              <div className="mb-6">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-2">
                  ACCOUNT BALANCE (in {tradingCurrency})
                </div>
                <div className="flex gap-2 items-center">
                  <div className="bg-[var(--surface2)] border border-[var(--border2)] px-3 py-2.5 rounded-[9px] text-[14px] font-bold font-mono-tv text-[var(--green)] min-w-[44px] text-center">
                    {CURRENCIES.find(c => c.code === tradingCurrency)?.symbol || '$'}
                  </div>
                  <input
                    className="tv-input flex-1"
                    type="number"
                    placeholder="e.g. 800"
                    value={accountBalance}
                    onChange={e => setAccountBalance(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                {balNum > 0 && homeCurrency !== tradingCurrency && (
                  <p className="text-[10px] text-[#777] font-mono-tv mt-1.5">
                    ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol}{Number(balInHome).toLocaleString()} {homeCurrency} at current rates
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-outline px-5 py-3 rounded-[10px] text-[13px]">← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary flex-1 py-3 rounded-[10px] text-[14px] disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create Account & Start →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}