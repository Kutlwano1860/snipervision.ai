'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)

  // Supabase sends an access_token in the URL hash — exchange it for a session
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpdate() {
    if (!password) { toast.error('Enter a new password'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated! Redirecting...')
      setTimeout(() => router.replace('/dashboard'), 1500)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
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
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[20px] p-6 sm:p-10 w-full max-w-[420px] animate-fade-up">
          {!ready ? (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-[#777]">Verifying your reset link...</p>
            </div>
          ) : (
            <>
              <div className="text-[36px] mb-3">🔐</div>
              <h2 className="text-[24px] font-extrabold tracking-tight mb-1">Set new password</h2>
              <p className="text-[13px] text-[#777] mb-7">Choose a strong password — at least 8 characters.</p>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">NEW PASSWORD</div>
                  <input
                    className="tv-input"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#777] tracking-widest font-mono-tv mb-1.5">CONFIRM PASSWORD</div>
                  <input
                    className="tv-input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                onClick={handleUpdate}
                disabled={loading}
                className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
