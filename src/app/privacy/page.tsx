import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 h-14 border-b border-[var(--border)] bg-[rgba(8,8,8,0.96)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[var(--green)]">
            <polyline points="1,14 6,8 10,11 15,4 19,7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          SniperVision AI
        </Link>
        <Link href="/" className="text-[12px] text-[#777] hover:text-white transition-colors">← Back to Home</Link>
      </nav>

      <div className="max-w-[720px] mx-auto px-4 sm:px-8 py-16">
        <div className="mb-10">
          <div className="text-[10px] font-mono-tv font-bold text-[#555] tracking-widest mb-3">LEGAL</div>
          <h1 className="text-[clamp(28px,4vw,42px)] font-black tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-[12px] text-[#555]">Last updated: April 2026</p>
        </div>

        <div className="flex flex-col gap-8 text-[13px] text-[#aaa] leading-relaxed">

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">1. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use SniperVision AI:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Account information: name, email address, and password (hashed)',
                'Profile settings: home currency, trading currency, account type, account balance',
                'Chart images: uploaded for analysis (processed and not stored permanently)',
                'Usage data: number of analyses run, dates, and feature usage',
                'Trade journal entries: analysis results and notes you save',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--green)] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">2. How We Use Your Information</h2>
            <ul className="flex flex-col gap-2">
              {[
                'To provide and personalise the analysis service',
                'To calculate lot sizes and risk based on your account settings',
                'To enforce daily usage limits based on your subscription tier',
                'To improve the accuracy and quality of AI analysis',
                'To send important account and service notifications',
                'To process subscription payments (via Stripe — we never store card details)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--green)] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">3. Chart Images</h2>
            <p>Chart images you upload are sent to the Anthropic Claude API for analysis and are <strong className="text-white">not permanently stored</strong> by SniperVision AI. Images are processed in memory for the duration of the analysis request only. Please refer to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" className="text-[var(--green)] hover:underline">Anthropic's Privacy Policy</a> for how they handle API inputs.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">4. Data Storage</h2>
            <p>Your account data, profile settings, and analysis history are stored securely in Supabase (PostgreSQL). Data is encrypted at rest and in transit. We implement row-level security so you can only access your own data.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">5. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Supabase — authentication and database storage',
                'Anthropic Claude API — AI chart analysis',
                'Stripe — payment processing (when billing is enabled)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#777] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">We do not sell your data to any third parties.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="flex flex-col gap-2">
              {[
                'Access all data we hold about you',
                'Request correction of inaccurate data',
                'Request deletion of your account and associated data',
                'Export your trade journal and analysis history',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--green)] mt-0.5 flex-shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:support@tradevisionsai.com" className="text-[var(--green)] hover:underline">support@tradevisionsai.com</a>.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">7. Cookies</h2>
            <p>We use session cookies for authentication only. We do not use advertising or tracking cookies. You can disable cookies in your browser, but this will prevent you from logging in.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-[16px] font-bold text-white mb-2">9. Contact</h2>
            <p>For any privacy-related questions or data requests, contact us at <a href="mailto:support@tradevisionsai.com" className="text-[var(--green)] hover:underline">support@tradevisionsai.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border)] flex gap-4 text-[12px]">
          <Link href="/terms" className="text-[var(--green)] hover:underline">Terms of Service →</Link>
          <Link href="/" className="text-[#777] hover:text-white transition-colors">← Home</Link>
        </div>
      </div>
    </div>
  )
}
