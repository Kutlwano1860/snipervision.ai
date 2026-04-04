'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router   = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const supabase = createClient()

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

  async function handleLogin() {
    if (!email || !password) { toast.error('Enter your email and password'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('No session returned')
      toast.success('Welcome back!')
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Show blank screen while checking session (prevents flash)
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-5 h-5 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-12 h-16 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)]">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          SniperVision AI
        </Link>
        <Link href="/" className="btn-outline text-[13px] px-5 py-2 rounded-lg">← Home</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[20px] p-10 w-full max-w-[420px] animate-fade-up">
          <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Welcome back</h2>
          <p className="text-[13px] text-[#777] mb-7">Login to your TradeVision account.</p>

          <div className="space-y-4 mb-6">
            <div>
              <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">EMAIL</div>
              <input
                className="tv-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv">PASSWORD</div>
                <Link href="/forgot-password" className="text-[10px] text-[#555] hover:text-[var(--green)] transition-colors">Forgot password?</Link>
              </div>
              <input
                className="tv-input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login →'}
          </button>

          <p className="text-center text-[12px] text-[#777] mt-5">
            No account yet?{' '}
            <Link href="/register" className="text-[var(--green)] hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}