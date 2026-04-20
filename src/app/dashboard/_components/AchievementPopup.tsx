'use client'

import { useEffect, useState } from 'react'
import type { BadgeDef } from './BadgeSystem'

const CATEGORY_COLOR: Record<string, string> = {
  challenge:   '#f59e0b',
  performance: '#22c55e',
  prop:        '#3b82f6',
  platform:    '#a855f7',
}

const DISMISS_MS = 4000

// Individual sparkle particle — pre-calculates end position in JS (no CSS trig needed)
function Spark({ angle, delay, color, dist = 90 }: { angle: number; delay: number; color: string; dist?: number }) {
  const rad = (angle * Math.PI) / 180
  const tx  = Math.cos(rad) * dist
  const ty  = Math.sin(rad) * dist
  return (
    <div className="absolute top-1/2 left-1/2 pointer-events-none"
      style={{
        width: 7, height: 7,
        marginTop: -3.5, marginLeft: -3.5,
        borderRadius: '50%',
        background: color,
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        animationName: 'sparkFly',
        animationDuration: '0.85s',
        animationDelay: `${delay}ms`,
        animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.4, 1)',
        animationFillMode: 'both',
      } as any}
    />
  )
}

// Ring burst
function Ring({ delay, color }: { delay: number; color: string }) {
  return (
    <div className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
      style={{
        width: 20, height: 20,
        marginTop: -10, marginLeft: -10,
        border: `2px solid ${color}`,
        animation: `ringBurst 0.8s ${delay}ms ease-out both`,
        opacity: 0,
      }}
    />
  )
}

export default function AchievementPopup({
  badge,
  onDismiss,
}: {
  badge: BadgeDef
  onDismiss: () => void
}) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')
  const color = CATEGORY_COLOR[badge.category] || '#22c55e'

  useEffect(() => {
    setPhase('in')
    const holdTimer  = setTimeout(() => setPhase('hold'), 400)
    const outTimer   = setTimeout(() => setPhase('out'),  DISMISS_MS - 400)
    const closeTimer = setTimeout(onDismiss, DISMISS_MS)
    return () => { clearTimeout(holdTimer); clearTimeout(outTimer); clearTimeout(closeTimer) }
  }, [badge.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sparkAngles = Array.from({ length: 12 }, (_, i) => i * 30)
  const ringDelays  = [0, 120, 260]

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: phase === 'out' ? 'achievementFadeOut 0.4s ease forwards' : 'achievementFadeIn 0.3s ease both',
      }}
      onClick={onDismiss}
    >
      {/* ── Glow blob behind icon ── */}
      <div className="absolute pointer-events-none"
        style={{
          width: 320, height: 320,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />

      {/* ── Particle + ring burst ── */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>

        {/* Rings */}
        {ringDelays.map((d, i) => <Ring key={i} delay={d} color={color} />)}

        {/* Sparks */}
        {sparkAngles.map((a, i) => (
          <Spark key={i} angle={a} delay={i * 30} color={i % 3 === 0 ? '#fff' : color} />
        ))}

        {/* ── Icon circle ── */}
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 120, height: 120,
            background: `radial-gradient(135deg, ${color}22, ${color}08)`,
            border: `2px solid ${color}55`,
            boxShadow: `0 0 40px ${color}55, 0 0 80px ${color}22`,
            animation: 'iconBounceIn 0.55s cubic-bezier(0.34, 1.7, 0.64, 1) both',
          }}>
          <span style={{ fontSize: 56, lineHeight: 1 }}>{badge.icon}</span>
        </div>
      </div>

      {/* ── Text block ── */}
      <div className="flex flex-col items-center gap-2 mt-2"
        style={{ animation: 'textSlideUp 0.45s 0.2s ease both' }}>

        <div className="text-[10px] font-mono-tv font-bold tracking-[0.2em]"
          style={{ color }}>
          ✦ ACHIEVEMENT UNLOCKED ✦
        </div>

        <div className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight text-center px-6"
          style={{ textShadow: `0 0 30px ${color}88` }}>
          {badge.name}
        </div>

        <div className="text-[13px] text-[#aaa] text-center max-w-[280px] leading-relaxed px-4">
          {badge.description}
        </div>

        {/* Category pill */}
        <div className="mt-1 px-3 py-1 rounded-full text-[10px] font-bold font-mono-tv tracking-wider"
          style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}>
          {badge.category.toUpperCase()} BADGE
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full"
          style={{ background: color, animation: `achievementBar ${DISMISS_MS}ms linear both` }}
        />
      </div>

      {/* ── Tap to continue ── */}
      <div className="absolute bottom-6 text-[11px] text-[#444] font-mono-tv tracking-widest"
        style={{ animation: 'textSlideUp 0.4s 0.5s ease both' }}>
        TAP ANYWHERE TO CONTINUE
      </div>
    </div>
  )
}
