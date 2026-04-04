import Link from 'next/link'

const steps = [
  {
    number: '01',
    title: 'Upload Your Chart',
    icon: '📸',
    description: 'Take a screenshot of any chart from your broker or TradingView. You can upload JPEG, PNG, or WEBP files. For best results, make sure the chart is clear and shows sufficient price history.',
    tips: [
      'Use a clean chart without too many indicators cluttering the view',
      'Ensure price labels and timeframe are visible',
      'For MTF analysis (Platinum+), upload your higher timeframe charts in the Multi-Timeframe section',
    ],
  },
  {
    number: '02',
    title: 'Configure Your Settings',
    icon: '⚙️',
    description: 'Set your market, strategy, risk appetite, and entry mode before running the analysis. These settings tell the AI exactly how to analyse your chart and size your trades.',
    tips: [
      'MARKET — Select Forex, Crypto, Stocks, or let the AI auto-detect',
      'STRATEGY — Choose your trading methodology (ICT, SMC, S&R, Top Down, etc.)',
      'RISK — Conservative (0.5%), Moderate (1%), or Aggressive (1.5%)',
      'ENTRY MODE — Aggressive (at the level), Standard (confirmation), Comfortable (retest only)',
      'SESSION — Helps the AI identify relevant kill zones and session context',
    ],
  },
  {
    number: '03',
    title: 'Run the Analysis',
    icon: '⚡',
    description: 'Click "Analyse Chart" and the AI will process your chart in seconds. It will identify patterns, key levels, bias, and generate a complete trade plan tailored to your account size and settings.',
    tips: [
      'Free plan: 3 analyses per day',
      'Premium plan: 20 analyses per day',
      'Platinum/Diamond: Unlimited analyses',
      'The analysis includes entry, SL, TP1/2/3, lot sizes, and R:R ratios',
    ],
  },
  {
    number: '04',
    title: 'Read the Trade Plan',
    icon: '📋',
    description: 'Review your full trade plan. The AI provides a bias, confidence score, entry zone, stop loss, three take profit levels, and lot sizing recommendations for your account. Always read the reasoning section.',
    tips: [
      'A+ and A setups are the highest quality — prioritise these',
      'Check the Confluence Score (out of 10) — higher = more factors aligned',
      'Read the Invalidation condition — know BEFORE entering when you\'re wrong',
      'Lot sizes are calculated based on your actual account balance',
    ],
  },
  {
    number: '05',
    title: 'Manage the Trade',
    icon: '🎯',
    description: 'Once in a trade, follow the Trade Management section. It tells you exactly when to move your SL to breakeven, when to take partial profits, and how to trail your stop.',
    tips: [
      'Always move SL to breakeven once TP1 is hit',
      'Never move your SL further away from entry — only tighten it',
      'Consider taking 50% off at TP1 and running the rest to TP2/3',
      'Once your daily profit target is hit — STOP TRADING for the day',
    ],
  },
  {
    number: '06',
    title: 'Journal Your Trades',
    icon: '📒',
    description: 'Every analysis is automatically saved to your Journal. After the trade closes, update the outcome (Win/Loss) and add notes. Reviewing your journal regularly is how you identify patterns in your trading.',
    tips: [
      'Be honest when logging outcomes — your journal is your truth',
      'Use the notes field to record what you learned from each trade',
      'Review your journal weekly to spot emotional trading patterns',
    ],
  },
]

const entryModes = [
  {
    mode: 'Aggressive ⚡',
    color: 'var(--red)',
    border: 'rgba(239,68,68,0.3)',
    bg: 'rgba(239,68,68,0.06)',
    desc: 'Enter the moment price touches your level. Best risk-to-reward ratio but requires discipline. Best for experienced traders who trust their levels.',
  },
  {
    mode: 'Standard 🎯',
    color: 'var(--amber)',
    border: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.06)',
    desc: 'Wait for a confirmation candle (pin bar, engulfing, inside bar) at your level before entering. Balances R:R with confirmation. Best for most traders.',
  },
  {
    mode: 'Comfortable 🛡️',
    color: 'var(--green)',
    border: 'rgba(34,197,94,0.3)',
    bg: 'rgba(34,197,94,0.06)',
    desc: 'Wait for price to close beyond the level AND retest it before entering. Lowest risk, slightly reduced R:R. Best for beginners or volatile markets.',
  },
]

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 h-14 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          SniperVision AI
        </Link>
        <Link href="/register" className="btn-primary text-[12px] px-4 py-1.5 rounded-lg">Get Started Free →</Link>
      </nav>

      <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-16">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[var(--green-dim)] border border-[var(--green-border)] text-[var(--green)] px-4 py-1.5 rounded-full text-[11px] font-bold mb-6 font-mono-tv tracking-wider">
            📖 USER GUIDE
          </div>
          <h1 className="text-[clamp(32px,5vw,52px)] font-black tracking-tight mb-4">How to Use SniperVision AI</h1>
          <p className="text-[15px] text-[#777] max-w-[520px] mx-auto leading-relaxed">
            Get the most out of every analysis. Follow these steps to go from a chart screenshot to a complete, actionable trade plan.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-8 mb-16">
          {steps.map((step, i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[16px] p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-[var(--green-dim)] border border-[var(--green-border)] flex items-center justify-center text-[18px]">
                  {step.icon}
                </div>
                <div>
                  <div className="text-[10px] font-mono-tv font-bold text-[var(--green)] tracking-widest mb-0.5">STEP {step.number}</div>
                  <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-tight">{step.title}</h2>
                </div>
              </div>
              <p className="text-[13px] text-[#aaa] leading-relaxed mb-4">{step.description}</p>
              <ul className="flex flex-col gap-2">
                {step.tips.map((tip, j) => (
                  <li key={j} className="flex items-start gap-2 text-[12px] text-[#777]">
                    <span className="text-[var(--green)] mt-0.5 flex-shrink-0">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Entry Modes */}
        <div className="mb-16">
          <h2 className="text-[22px] font-extrabold tracking-tight mb-2">Understanding Entry Modes</h2>
          <p className="text-[13px] text-[#777] mb-6">Choose how aggressively you want to enter trades. This affects your entry price and risk-to-reward ratio.</p>
          <div className="flex flex-col gap-3">
            {entryModes.map((m, i) => (
              <div key={i} className="rounded-[12px] border p-5" style={{ background: m.bg, borderColor: m.border }}>
                <div className="text-[13px] font-bold mb-1" style={{ color: m.color }}>{m.mode}</div>
                <p className="text-[12px] text-[#aaa] leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* MTF */}
        <div className="mb-16 bg-[var(--surface)] border border-[var(--border)] rounded-[16px] p-6 sm:p-8">
          <div className="text-[10px] font-mono-tv font-bold text-[var(--purple)] tracking-widest mb-2">PLATINUM & DIAMOND</div>
          <h2 className="text-[20px] font-extrabold tracking-tight mb-3">Multi-Timeframe (Top-Down) Analysis</h2>
          <p className="text-[13px] text-[#aaa] leading-relaxed mb-4">
            Top-down analysis means reading the market from the highest timeframe down to your entry timeframe. This gives you the full institutional picture before entering a trade.
          </p>
          <ul className="flex flex-col gap-2">
            {[
              'Start with the Weekly or Daily chart to get the macro bias (are we in an uptrend or downtrend?)',
              'Move to H4 to find key zones — order blocks, FVGs, supply/demand areas',
              'Use H1 or M15 as your entry timeframe — look for confirmation within the H4 zone',
              'Upload all three charts in the Multi-Timeframe section and the AI analyses confluence across all timeframes',
              'Select "Top Down Analysis" as your strategy for the best results with MTF charts',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#777]">
                <span className="text-[var(--purple)] mt-0.5 flex-shrink-0">→</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Caution */}
        <div className="bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.25)] rounded-[12px] p-5 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[20px] flex-shrink-0">⚠️</span>
            <div>
              <div className="text-[13px] font-bold text-[var(--amber)] mb-1">Important Risk Reminder</div>
              <p className="text-[12px] text-[#aaa] leading-relaxed">
                SniperVision AI provides educational analysis — it is not financial advice and is not 100% accurate. Always apply your own judgement, use proper risk management, and never risk more than you can afford to lose. <strong className="text-white">Once you have hit your daily profit target, stop trading.</strong> Protect your gains and come back tomorrow with a clear head.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/register" className="btn-primary text-[14px] px-8 py-3.5 rounded-[10px] inline-block">
            Start Analysing — Free →
          </Link>
          <div className="mt-4 text-[12px] text-[#555]">No credit card required. 3 free analyses per day.</div>
        </div>
      </div>
    </div>
  )
}
