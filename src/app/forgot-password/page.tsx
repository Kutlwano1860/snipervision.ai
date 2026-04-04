'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const supabase = createClient()

  async function handleReset() {
    if (!email) { toast.error('Enter your email address'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-4 sm:px-12 h-16 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)]">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          SniperVision AI
        </Link>
        <Link href="/login" className="btn-outline text-[13px] px-5 py-2 rounded-lg">← Back to Login</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[20px] p-6 sm:p-10 w-full max-w-[420px] animate-fade-up">
          {sent ? (
            <div className="text-center">
              <div className="text-[48px] mb-4">📬</div>
              <h2 className="text-[24px] font-extrabold tracking-tight mb-2">Check your inbox</h2>
              <p className="text-[13px] text-[#777] mb-6 leading-relaxed">
                We sent a password reset link to <strong className="text-white">{email}</strong>.
                Check your spam folder if you don't see it within a minute.
              </p>
              <Link href="/login" className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] block text-center">
                Back to Login →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-[36px] mb-3">🔑</div>
              <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Reset your password</h2>
              <p className="text-[13px] text-[#777] mb-7 leading-relaxed">
                Enter the email address you signed up with and we'll send you a link to reset your password.
              </p>

              <div className="mb-6">
                <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">EMAIL ADDRESS</div>
                <input
                  className="tv-input"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  autoComplete="email"
                />
              </div>

              <button
                onClick={handleReset}
                disabled={loading}
                className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] disabled:opacity-50 mb-4"
              >
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>

              <p className="text-center text-[12px] text-[#777]">
                Remembered it?{' '}
                <Link href="/login" className="text-[var(--green)] hover:underline">Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
