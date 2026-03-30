'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'
import { CURRENCIES, TIER_LIMITS } from '@/lib/constants'
import type { AnalysisResult, Tier, AccountType, MarketType, Strategy, Session } from '@/types'

// ── Loading Overlay ──
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null
  const steps = [
    'Reading chart structure & timeframe',
    'Detecting patterns & key levels',
    'Calculating entry, SL & 3 TP levels',
    'Computing lot sizes for your account',
    'Injecting live market context',
    'Compiling full analysis report',
  ]
  return (
    <div className="fixed inset-0 bg-[rgba(8,8,8,0.96)] z-50 flex flex-col items-center justify-center gap-5 backdrop-blur-xl">
      <div className="text-[20px] font-extrabold text-[var(--green)] tracking-tight">TradeVision AI</div>
      <div className="text-[11px] text-[#777] font-mono-tv tracking-widest">PROCESSING YOUR CHART...</div>
      <div className="w-[240px] h-[2px] bg-[var(--border2)] rounded-full overflow-hidden">
        <div className="h-full bg-[var(--green)] rounded-full animate-load-bar" />
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono-tv text-[#777]">
            <div className="w-1 h-1 rounded-full bg-[#333]" />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analysis Output ──
function AnalysisOutput({ result, tier, homeCurrency, tradingCurrency, strategy }: {
  result: AnalysisResult
  tier: Tier
  homeCurrency: string
  tradingCurrency: string
  strategy: string
}) {
  const bias = result.bias?.toUpperCase() || 'NEUTRAL'
  const biasClass = bias === 'BULLISH' ? 'bull' : bias === 'BEARISH' ? 'bear' : 'neut'
  const biasColor = bias === 'BULLISH' ? 'var(--green)' : bias === 'BEARISH' ? 'var(--red)' : 'var(--amber)'
  const conf = result.confidence || 70
  const circ = 2 * Math.PI * 18
  const offset = circ - (conf / 100 * circ)
  const rr = (result.riskRating || 'MEDIUM').toUpperCase()
  const rrColor = rr === 'LOW' ? 'var(--green)' : rr === 'HIGH' ? 'var(--red)' : 'var(--amber)'

  const isPrem = tier === 'premium' || tier === 'platinum' || tier === 'diamond'
  const isPlat = tier === 'platinum' || tier === 'diamond'

  function fmt(text: string) {
    return text
      ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\b(BULLISH|LONG|BUY)\b/g, '<span style="color:var(--green);font-weight:600">$1</span>')
      .replace(/\b(BEARISH|SHORT|SELL)\b/g, '<span style="color:var(--red);font-weight:600">$1</span>')
      || '—'
  }

  return (
    <div>
      {/* Bias strip */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-[var(--border)]
        ${bias === 'BULLISH' ? 'bg-gradient-to-r from-[rgba(34,197,94,0.1)] to-transparent'
          : bias === 'BEARISH' ? 'bg-gradient-to-r from-[rgba(239,68,68,0.1)] to-transparent'
          : 'bg-gradient-to-r from-[rgba(245,158,11,0.1)] to-transparent'}`}>
        <div>
          <div className="text-[10px] font-mono-tv font-bold text-[#777] tracking-wider mb-1">
            {result.asset || 'UNKNOWN'}{result.timeframe ? ` · ${result.timeframe}` : ''}
          </div>
          <div className="text-[24px] font-black tracking-tight" style={{ color: biasColor }}>
            {bias} BIAS
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-[#777] font-bold tracking-wider mb-1">CONFIDENCE</div>
          <div className="relative w-12 h-12 ml-auto">
            <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
              <circle cx="24" cy="24" r="18" fill="none" stroke="var(--surface3)" strokeWidth="4"/>
              <circle cx="24" cy="24" r="18" fill="none" stroke={biasColor} strokeWidth="4"
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
                className="conf-ring-fill"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold font-mono-tv">
              {conf}%
            </div>
          </div>
        </div>
      </div>

      {/* Storyline banner — HTF narrative */}
      {result.storyline && (
        <div className="px-5 py-2.5 border-b border-[var(--border)] bg-[rgba(59,130,246,0.04)]">
          <div className="text-[8px] font-mono-tv font-bold tracking-widest text-[var(--blue)] mb-1">HTF STORYLINE</div>
          <p className="text-[11px] text-[#aaa] leading-relaxed font-mono-tv">{result.storyline}</p>
        </div>
      )}

      {/* MNSR Checklist — only shown when MNSR strategy is selected */}
      {strategy === 'MNSR' && result.smc && (
        <div className="mx-5 mt-3 bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.2)] rounded-[10px] p-3.5">
          <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[var(--purple)] mb-2.5 flex items-center gap-1.5">
            🔍 MNSR VALIDATION CHECKLIST
          </div>
          {(() => {
            const smc = result.smc || ''
            const isNoTrade = /NO.TRADE/i.test(smc) || /NO.TRADE/i.test(result.storyline || '')
            const checks = [
              { label: 'Fresh SNR Level',      pass: /fresh/i.test(smc) && !/not fresh|expired|used/i.test(smc) },
              { label: 'Marriage Concept',      pass: /marriage/i.test(smc) || /trendline.*snr|snr.*trendline/i.test(smc) },
              { label: 'HTF Confirmation',      pass: /weekly|daily.*confirm|h4.*confirm/i.test(smc) },
              { label: 'Entry Model (QM/411/TL)',pass: /QM|quasimodo|411|trendline break/i.test(smc) },
              { label: 'Kill Zone Alignment',   pass: /london|new york|kill zone/i.test(result.killZone || '') && !/outside/i.test(result.killZone || '') },
            ]
            return (
              <div className="space-y-1.5">
                {checks.map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-[10px]">
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${c.pass ? 'bg-[var(--green-dim)] text-[var(--green)]' : 'bg-[rgba(239,68,68,0.12)] text-[var(--red)]'}`}>
                      {c.pass ? '✓' : '✗'}
                    </span>
                    <span className={c.pass ? 'text-[#aaa]' : 'text-[#666]'}>{c.label}</span>
                  </div>
                ))}
                {isNoTrade && (
                  <div className="mt-2 flex items-center gap-2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-md px-3 py-1.5 text-[10px] font-bold text-[var(--red)]">
                    ⛔ NO-TRADE — Not all MNSR conditions met
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Setup quality + confluence strip — Premium+ */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
        {!isPrem && (
          <div className="text-[9px] text-[#555] font-mono-tv flex items-center gap-1.5">
            🔒 <span>Setup quality · Confluence score · Kill zone — <strong className="text-[var(--blue)]">Premium</strong></span>
          </div>
        )}
        {/* Setup Quality badge */}
        {isPrem && result.setupQuality && (() => {
          const q = result.setupQuality
          const qColor = q === 'A+' ? 'var(--green)' : q === 'A' ? 'var(--blue)' : q === 'B' ? 'var(--amber)' : 'var(--red)'
          const qBg = q === 'A+' ? 'rgba(34,197,94,0.12)' : q === 'A' ? 'rgba(59,130,246,0.12)' : q === 'B' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
          return (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono-tv border"
              style={{ background: qBg, color: qColor, borderColor: qColor + '44' }}>
              ★ {q} SETUP
            </div>
          )
        })()}

        {/* Confluence Score — Premium+ */}
        {isPrem && result.confluenceScore != null && result.confluenceScore > 0 && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono-tv bg-[var(--surface2)] border border-[var(--border)] px-2 py-1 rounded-md">
            <span className="text-[#777]">CONFLUENCE</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`w-1.5 h-2.5 rounded-sm ${i < result.confluenceScore ? 'bg-[var(--green)]' : 'bg-[var(--border2)]'}`} />
              ))}
            </div>
            <span className="font-bold text-white">{result.confluenceScore}/10</span>
          </div>
        )}

        {/* Kill Zone — Premium+ */}
        {isPrem && result.killZone && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono-tv bg-[var(--surface2)] border border-[var(--border)] px-2 py-1 rounded-md max-w-[240px]">
            <span className="text-[var(--amber)]">⏰</span>
            <span className="text-[#777] truncate">{result.killZone}</span>
          </div>
        )}
      </div>

      {/* Event Risk — Premium+ only */}
      {isPrem ? (
        result.eventRisk && result.eventRisk !== 'No major events in next 24h' && (
          <div className="flex items-center gap-2 mx-5 my-2 bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-lg px-3 py-2 text-[11px] text-[var(--amber)]">
            ⚠️ <strong>Event Risk:</strong> {result.eventRisk}
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 mx-5 my-2 bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] rounded-lg px-3 py-2 text-[11px] text-[#555]">
          🔒 <span>Economic event risk alerts — <strong className="text-[var(--blue)]">Premium</strong></span>
        </div>
      )}

      {/* Levels grid */}
      <div className="grid grid-cols-3 divide-x divide-y divide-[var(--border)] border-b border-[var(--border)]">
        {/* Entry + SL — always visible */}
        {[
          { label:'ENTRY ZONE', val: result.entry,    cls:'text-[var(--blue)]' },
          { label:'STOP LOSS',  val: result.stopLoss, cls:'text-[var(--red)]' },
          { label:'RISK LEVEL', val: rr,              cls:'', style:{ color: rrColor } },
        ].map(lv => (
          <div key={lv.label} className="px-4 py-3 text-center bg-[var(--surface)]">
            <div className="text-[8px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">{lv.label}</div>
            <div className={`text-[13px] font-bold font-mono-tv ${lv.cls}`} style={lv.style}>{lv.val || '—'}</div>
          </div>
        ))}
        {/* TP1/2/3 — Premium+ */}
        {[
          { label:'TP 1', val: result.tp1, cls:'text-[var(--green)]',        rr: result.rr1 },
          { label:'TP 2', val: result.tp2, cls:'text-[rgba(34,197,94,0.7)]', rr: result.rr2 },
          { label:'TP 3', val: result.tp3, cls:'text-[rgba(34,197,94,0.45)]',rr: result.rr3 },
        ].map(lv => (
          <div key={lv.label} className="px-4 py-3 text-center bg-[var(--surface)] relative">
            <div className="text-[8px] font-mono-tv font-bold tracking-widest text-[#777] mb-1">{lv.label}</div>
            {isPrem ? (
              <>
                <div className={`text-[13px] font-bold font-mono-tv ${lv.cls}`}>{lv.val || '—'}</div>
                {lv.rr && <div className="text-[9px] text-[#777] font-mono-tv mt-0.5">{lv.rr}</div>}
              </>
            ) : (
              <div className="text-[10px] text-[#444] font-bold">🔒 Premium</div>
            )}
          </div>
        ))}
      </div>

      {/* Lot sizing — Premium+ */}
      <div className="mx-5 my-3">
        {isPrem ? (
          <div className="bg-gradient-to-r from-[rgba(34,197,94,0.06)] to-[rgba(59,130,246,0.04)] border border-[rgba(34,197,94,0.15)] rounded-[10px] p-3.5">
            <div className="text-[9px] font-mono-tv font-bold tracking-wider text-[var(--green)] mb-2.5">
              💰 SMART LOT SIZING — {CURRENCIES.find(c => c.code === tradingCurrency)?.symbol}{' '}
              ACCOUNT (≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol} {homeCurrency})
            </div>
            <div className="grid grid-cols-4 gap-2 text-[9px] font-mono-tv text-[#444] px-2 mb-1.5">
              {['TYPE','LOTS','RISK','TP1 PROFIT'].map(h => <span key={h}>{h}</span>)}
            </div>
            {[
              { type:'Conservative', lots:result.lotConservative, risk:result.riskCons, profit:result.profitCons },
              { type:'Moderate',     lots:result.lotModerate,     risk:result.riskMod,  profit:result.profitMod  },
              { type:'Scaled',       lots:result.lotScaled,       risk:result.riskScale,profit:result.profitScale},
            ].map(r => (
              <div key={r.type} className="grid grid-cols-4 gap-2 items-center bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-2 mb-1 text-[10px] font-mono-tv">
                <span className="text-[#777] font-bold">{r.type}</span>
                <span className="text-[var(--blue)]">{r.lots || '—'}</span>
                <span className="text-[var(--red)]">{r.risk || '—'}</span>
                <span className="text-[var(--green)]">{r.profit || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="locked-wrap">
            <div className="locked-blur border border-[rgba(34,197,94,0.15)] rounded-[10px] p-3.5 bg-[var(--surface2)]">
              {[{type:'Conservative'},{type:'Moderate'},{type:'Scaled'}].map(r => (
                <div key={r.type} className="grid grid-cols-4 gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-2 mb-1">
                  <span className="text-[#777] text-[10px]">{r.type}</span>
                  <span className="text-[#333] text-[10px]">X.XX lots</span>
                  <span className="text-[#333] text-[10px]">$XX.XX</span>
                  <span className="text-[#333] text-[10px]">$XX.XX</span>
                </div>
              ))}
            </div>
            <div className="locked-gate">
              <div className="text-lg">🔒</div>
              <div className="text-[12px] font-bold">Smart Lot Sizing</div>
              <div className="text-[11px] text-[#777]">Upgrade to Premium to unlock.</div>
            </div>
          </div>
        )}
      </div>

      {/* Analysis sections */}
      <div className="px-5 pb-5 space-y-4 max-h-[380px] overflow-y-auto">

        {/* Technical */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">TECHNICAL ANALYSIS</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.technical) }}/>
          {result.patterns?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {result.patterns.map(p => <span key={p} className="tag tag-green">{p}</span>)}
            </div>
          )}
        </div>

        {/* Key Levels */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">KEY LEVELS</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.keyLevels) }}/>
        </div>

        {/* Reasoning */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">TRADE REASONING</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.reasoning) }}/>
        </div>

        {/* Risk */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">RISK ASSESSMENT</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          <div className="flex items-center gap-3 bg-[var(--surface2)] rounded-[8px] px-3 py-2 mb-2">
            <span className="text-[10px] font-semibold text-[#777]">RISK LEVEL</span>
            <div className="flex-1 h-1 bg-[var(--border2)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rr === 'LOW' ? 'w-[25%] bg-[var(--green)]' : rr === 'HIGH' ? 'w-[88%] bg-[var(--red)]' : 'w-[55%] bg-[var(--amber)]'}`}/>
            </div>
            <span className="text-[10px] font-bold font-mono-tv" style={{ color: rrColor }}>{rr}</span>
          </div>
          <p className="text-[12px] text-[#777] leading-relaxed">
            <strong className="text-white">Invalidation:</strong> {result.invalidation}
          </p>
        </div>

        {/* Fundamental — Premium+ */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">FUNDAMENTAL CONTEXT</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          {isPrem ? (
            <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.fundamental) }}/>
          ) : (
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777] leading-relaxed">{result.fundamental}</p>
              <div className="locked-gate">
                <div className="text-lg">🔒</div>
                <div className="text-[12px] font-bold">Fundamental Context</div>
                <div className="text-[11px] text-[#777]">Upgrade to Premium to unlock.</div>
              </div>
            </div>
          )}
        </div>

        {/* Macro — Platinum+ */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">MACRO ENVIRONMENT</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          {isPlat ? (
            <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.macro) }}/>
          ) : (
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777] leading-relaxed">{result.macro}</p>
              <div className="locked-gate">
                <div className="text-lg">🔒</div>
                <div className="text-[12px] font-bold">Macro Intelligence</div>
                <div className="text-[11px] text-[#777]">Upgrade to Platinum to unlock.</div>
              </div>
            </div>
          )}
        </div>

        {/* SMC — Platinum+ */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">SMART MONEY CONCEPTS</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          {isPlat ? (
            <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.smc) }}/>
          ) : (
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777] leading-relaxed">{result.smc}</p>
              <div className="locked-gate">
                <div className="text-lg">🔒</div>
                <div className="text-[12px] font-bold">Smart Money Concepts</div>
                <div className="text-[11px] text-[#777]">Order blocks, FVGs, BOS — Platinum only.</div>
              </div>
            </div>
          )}
        </div>

        {/* Liquidity Context */}
        {result.liquidityContext && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">LIQUIDITY CONTEXT</span>
              <div className="flex-1 h-px bg-[var(--border)]"/>
            </div>
            <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.liquidityContext) }}/>
          </div>
        )}

        {/* Trade Management */}
        {result.tradeManagement && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">TRADE MANAGEMENT PLAN</span>
              <div className="flex-1 h-px bg-[var(--border)]"/>
            </div>
            <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.tradeManagement) }}/>
          </div>
        )}

        {/* Psychological Levels — Premium+ */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">PSYCHOLOGICAL LEVELS</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          {isPrem ? (
            result.psychLevels && result.psychLevels !== 'None within 50 pips'
              ? <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.psychLevels) }}/>
              : <p className="text-[11px] text-[#555]">No significant psychological levels within range.</p>
          ) : (
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777]">Round-number levels: 2300.00 (+12 pips), 2350.00 (TP2 confluence)...</p>
              <div className="locked-gate"><div className="text-lg">🔒</div><div className="text-[11px] text-[#777]">Premium only.</div></div>
            </div>
          )}
        </div>

        {/* Pattern Probability — Premium+ */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">PATTERN PROBABILITY</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>
          {isPrem ? (
            result.patternProbability
              ? <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.patternProbability) }}/>
              : <p className="text-[11px] text-[#555]">No specific patterns identified.</p>
          ) : (
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777]">Bearish Engulfing at H4 resistance: ~62% win rate when aligned with downtrend...</p>
              <div className="locked-gate"><div className="text-lg">🔒</div><div className="text-[11px] text-[#777]">Premium only.</div></div>
            </div>
          )}
        </div>

        {/* Trade Management — Premium+ */}
        {isPrem ? (
          result.tradeManagement && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">TRADE MANAGEMENT PLAN</span>
                <div className="flex-1 h-px bg-[var(--border)]"/>
              </div>
              <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.tradeManagement) }}/>
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777]">TRADE MANAGEMENT PLAN</span>
              <div className="flex-1 h-px bg-[var(--border)]"/>
            </div>
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777]">Move SL to breakeven at TP1. Close 40% at TP1, trail to TP2...</p>
              <div className="locked-gate"><div className="text-lg">🔒</div><div className="text-[11px] text-[#777]">Premium only.</div></div>
            </div>
          </div>
        )}

        {/* Alternative Scenario — Premium+ */}
        {isPrem ? (
          result.alternativeScenario && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[var(--amber)]">ALTERNATIVE SCENARIO</span>
                <div className="flex-1 h-px bg-[var(--border)]"/>
              </div>
              <p className="text-[12px] text-[#777] leading-relaxed" dangerouslySetInnerHTML={{ __html: fmt(result.alternativeScenario) }}/>
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono-tv font-bold tracking-widest text-[var(--amber)]">ALTERNATIVE SCENARIO</span>
              <div className="flex-1 h-px bg-[var(--border)]"/>
            </div>
            <div className="locked-wrap">
              <p className="locked-blur text-[12px] text-[#777]">If price breaks above 2318, expect continuation to 2340 liquidity...</p>
              <div className="locked-gate"><div className="text-lg">🔒</div><div className="text-[11px] text-[#777]">Premium only.</div></div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Main Dashboard Page ──
export default function DashboardPage() {
  const router = useRouter()
  const { profile, settings, updateSettings, sessionTradingCurrency,
          currentAnalysis, setCurrentAnalysis, isAnalysing, setIsAnalysing,
          dailyUsed, setDailyUsed } = useAppStore()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Multi-timeframe charts (Platinum)
  const mtfLabels = ['H4 Chart', 'H1 Chart', 'M15 Chart']
  const [mtfBase64, setMtfBase64] = useState<(string | null)[]>([null, null, null])
  const [mtfPreviews, setMtfPreviews] = useState<(string | null)[]>([null, null, null])
  const [mtfTypes, setMtfTypes] = useState<string[]>(['image/jpeg', 'image/jpeg', 'image/jpeg'])
  const mtfRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  function handleMtfFile(file: File, idx: number) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setMtfPreviews(prev => { const a = [...prev]; a[idx] = dataUrl; return a })
      setMtfBase64(prev => { const a = [...prev]; a[idx] = dataUrl.split(',')[1]; return a })
      setMtfTypes(prev => { const a = [...prev]; a[idx] = file.type; return a })
    }
    reader.readAsDataURL(file)
  }

  function clearMtf(idx: number) {
    setMtfPreviews(prev => { const a = [...prev]; a[idx] = null; return a })
    setMtfBase64(prev => { const a = [...prev]; a[idx] = null; return a })
    if (mtfRefs[idx].current) mtfRefs[idx].current!.value = ''
  }

  const tier   = (profile?.tier || 'free') as Tier
  const limit  = TIER_LIMITS[tier]
  const isPlat = tier === 'platinum' || tier === 'diamond'
  const homeCurrency    = profile?.home_currency || 'ZAR'
  const tradingCurrency = sessionTradingCurrency

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
      setImageFile(file)
      document.getElementById('upload-zone')?.setAttribute('style','display:none')
      toast.success('Chart loaded — ready to analyse!')
    }
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageFile(null); setImagePreview(null); setImageBase64(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    document.getElementById('upload-zone')?.removeAttribute('style')
  }

  async function runAnalysis() {
    if (dailyUsed >= limit) { toast.error('Daily limit reached — upgrade to continue!'); return }
    if (!imageBase64) { toast.error('Upload a chart screenshot first!'); return }

    setIsAnalysing(true)
    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageType: imageFile?.type || 'image/jpeg',
          // Include any loaded MTF charts for Platinum users
          additionalImages: mtfBase64
            .map((b64, i) => b64 ? { imageBase64: b64, imageType: mtfTypes[i], label: mtfLabels[i] } : null)
            .filter(Boolean),
          settings: {
            ...settings,
            tradingCurrency,
            homeCurrency,
            accountBalance: profile?.account_balance || settings.accountBalance,
            accountType: (profile?.account_type as AccountType) || settings.accountType,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired — send user back to login
          toast.error('Your session expired. Please log in again.')
          router.push('/login')
          return
        }
        if (response.status === 429) {
          toast.error(`Daily limit of ${data.limit} analyses reached. Upgrade to continue.`)
          return
        }
        throw new Error(data.error || 'Analysis failed')
      }

      setCurrentAnalysis(data.result)
      setDailyUsed(data.dailyUsed)
      toast.success('Analysis complete!')

    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setIsAnalysing(false)
    }
  }

  const accTypes: { id: AccountType; icon: string; label: string }[] = [
    { id:'micro',    icon:'🔬', label:'Micro'   },
    { id:'standard', icon:'📊', label:'Standard'},
    { id:'pro',      icon:'💼', label:'Pro'     },
    { id:'prop',     icon:'🏦', label:'Prop'    },
    { id:'funded',   icon:'💰', label:'Funded'  },
    { id:'cent',     icon:'🪙', label:'Cent'    },
  ]

  const pct = limit >= 999 ? 100 : (dailyUsed / limit * 100)

  return (
    <>
      <LoadingOverlay show={isAnalysing} />

      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-[400px_1fr] gap-5 items-start">

          {/* ── LEFT: Upload + Settings ── */}
          <div className="tv-panel">
            <div className="tv-panel-header">
              <span className="text-[13px] font-bold">📸 Upload Chart</span>
              <span className="pill pill-green">{limit >= 999 ? '∞' : limit - dailyUsed} LEFT TODAY</span>
            </div>
            <div className="p-5 space-y-4">

              {/* Currency context */}
              <div className="flex items-center justify-between bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] px-3 py-2.5">
                <div className="text-[11px] text-[#777]">
                  Trading: <strong className="text-white font-mono-tv">{tradingCurrency}</strong>
                  &nbsp;·&nbsp;
                  Home: <strong className="text-white font-mono-tv">{homeCurrency}</strong>
                </div>
                <div className="text-[10px] text-[#777]">Switch via top bar ↑</div>
              </div>

              {/* Upload zone */}
              <div id="upload-zone"
                className="border-2 border-dashed border-[var(--border2)] rounded-[11px] p-9 text-center cursor-pointer relative bg-[var(--surface2)] hover:border-[var(--green)] hover:bg-[var(--green-dim)] transition-all group"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[var(--green)]') }}
                onDragLeave={e => e.currentTarget.classList.remove('border-[var(--green)]')}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f) }}>
                <input ref={fileInputRef} type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                <div className="w-14 h-14 bg-[var(--green-dim)] border border-[var(--green-border)] rounded-full flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-105 transition-transform">📊</div>
                <div className="text-[13px] font-semibold mb-1">Drop your chart here</div>
                <div className="text-[11px] text-[#777] mb-3">Click to browse or drag & drop</div>
                <div className="flex gap-1.5 justify-center">
                  {['PNG','JPG','WEBP','SCREENSHOT'].map(f => (
                    <span key={f} className="tag text-[9px]">{f}</span>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {imagePreview && (
                <div>
                  <img src={imagePreview} alt="Chart" className="w-full rounded-[10px] border border-[var(--border2)] max-h-[200px] object-cover"/>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => fileInputRef.current?.click()} className="btn-ghost-green text-[10px] px-3 py-1.5 rounded-md">Change</button>
                    <button onClick={clearImage} className="text-[10px] px-3 py-1.5 rounded-md bg-[rgba(239,68,68,0.1)] text-[var(--red)] border border-[rgba(239,68,68,0.25)] hover:bg-[var(--red)] hover:text-white transition-all">Remove</button>
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label:'MARKET',  id:'market',  opts:['Auto Detect','Forex','Crypto','Stocks','Indices','Commodities'], key:'market' as keyof typeof settings },
                  { label:'STRATEGY',id:'strategy',opts:['Auto Select','Smart Money (SMC)','ICC ICT 714','MNSR','Price Action','Classical TA','Trend Following','Mean Reversion'], key:'strategy' as keyof typeof settings },
                  { label:'RISK',    id:'risk',    opts:['Conservative','Moderate','Aggressive'], key:'riskAppetite' as keyof typeof settings },
                  { label:'SESSION', id:'session', opts:['Auto Detect','London','New York','Asian','London/NY Overlap'], key:'session' as keyof typeof settings },
                ].map(s => (
                  <div key={s.id}>
                    <div className="text-[9px] font-bold text-[#777] tracking-widest font-mono-tv mb-1">{s.label}</div>
                    <select className="tv-select" value={settings[s.key] as string}
                      onChange={e => updateSettings({ [s.key]: e.target.value } as any)}>
                      {s.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Account type */}
              <div>
                <div className="text-[9px] font-bold text-[#777] tracking-widest font-mono-tv mb-2">ACCOUNT TYPE</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {accTypes.map(a => (
                    <button key={a.id}
                      onClick={() => updateSettings({ accountType: a.id })}
                      className={`py-2 border rounded-[7px] text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-all
                        ${settings.accountType === a.id
                          ? 'border-[var(--green)] bg-[var(--green-dim)] text-[var(--green)]'
                          : 'border-[var(--border2)] text-[#777] hover:bg-[var(--surface2)]'}`}>
                      <span className="text-base">{a.icon}</span>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-TF Confluence */}
              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] p-3">
                <div className="text-[9px] font-mono-tv font-bold mb-2 flex items-center gap-1.5"
                  style={{ color: isPlat ? 'var(--green)' : 'var(--purple)' }}>
                  {isPlat ? '📊 MULTI-TIMEFRAME CONFLUENCE' : '💎 MULTI-TIMEFRAME CONFLUENCE'}
                </div>
                {isPlat ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {mtfLabels.map((tf, idx) => (
                      <div key={tf}>
                        {mtfPreviews[idx] ? (
                          <div className="relative">
                            <img src={mtfPreviews[idx]!} alt={tf}
                              className="w-full h-14 object-cover rounded-[6px] border border-[var(--green-border)]"/>
                            <button onClick={() => clearMtf(idx)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--red)] text-white rounded-full text-[8px] flex items-center justify-center">✕</button>
                            <div className="text-[8px] text-[var(--green)] text-center mt-0.5 font-mono-tv">{tf} ✓</div>
                          </div>
                        ) : (
                          <label className="block border border-dashed border-[var(--border2)] rounded-[7px] py-2 text-center text-[9px] text-[#777] cursor-pointer hover:border-[var(--green)] hover:bg-[var(--green-dim)] transition-all">
                            <input ref={mtfRefs[idx]} type="file" accept="image/*" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleMtfFile(f, idx) }}/>
                            <div className="text-base mb-0.5">📈</div>
                            {tf}
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {mtfLabels.map(tf => (
                      <div key={tf} className="border border-dashed border-[var(--border2)] rounded-[7px] py-2 text-center text-[9px] text-[#777] cursor-not-allowed opacity-50">
                        <div className="text-base mb-0.5">📈</div>{tf}
                      </div>
                    ))}
                  </div>
                )}
                {!isPlat && <p className="text-[9px] text-[var(--purple)] text-center mt-2">Upgrade to Platinum to unlock</p>}
                {isPlat && mtfBase64.some(Boolean) && (
                  <p className="text-[9px] text-[var(--green)] text-center mt-1.5">
                    {mtfBase64.filter(Boolean).length} of 3 TF charts loaded — AI will analyse confluence
                  </p>
                )}
              </div>

              {/* Analyse button */}
              <button onClick={runAnalysis} disabled={isAnalysing || !imageBase64}
                className="btn-primary w-full py-3.5 rounded-[10px] text-[14px] flex items-center justify-center gap-2">
                {isAnalysing
                  ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin-fast"/><span>Analysing...</span></>
                  : '⚡ ANALYSE CHART'}
              </button>

              {/* Counter */}
              <div className="flex items-center justify-between bg-[var(--surface2)] rounded-[8px] px-3 py-2 text-[10px]">
                <div className="text-[#777]">
                  Daily analyses used
                  <div className="w-24 h-0.5 bg-[var(--border2)] rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-[var(--green)] rounded-full transition-all" style={{ width: `${Math.min(pct,100)}%` }}/>
                  </div>
                </div>
                <div className="font-bold font-mono-tv">{dailyUsed} / {limit >= 999 ? '∞' : limit}</div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Result ── */}
          <div className="tv-panel min-h-[500px]">
            <div className="tv-panel-header">
              <span className="text-[13px] font-bold">🧠 AI Analysis Report</span>
              <span className={`pill ${currentAnalysis ? 'pill-green' : 'pill-blue'}`}>
                {currentAnalysis ? 'COMPLETE' : 'WAITING'}
              </span>
            </div>

            {!currentAnalysis ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <div className="text-[44px] opacity-25 mb-4">📈</div>
                <p className="text-[13px] text-[#777] leading-relaxed">
                  Upload a chart screenshot and hit{' '}
                  <strong className="text-white">Analyse Chart</strong>
                  <br/>to get your full AI-powered trade analysis,<br/>live market context, and lot sizing.
                </p>
              </div>
            ) : (
              <AnalysisOutput
                result={currentAnalysis}
                tier={tier}
                homeCurrency={homeCurrency}
                tradingCurrency={tradingCurrency}
                strategy={settings.strategy}
              />
            )}
          </div>

        </div>
      </div>
    </>
  )
}
