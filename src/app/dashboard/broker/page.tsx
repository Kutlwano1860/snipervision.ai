'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface MT5Data {
  connected: boolean
  platform?: string
  balance?: number
  equity?: number
  margin?: number
  free_margin?: number
  account_number?: string
  account_currency?: string
  account_type?: string
  broker_name?: string
  server_name?: string
  leverage?: number
  open_trades?: { ticket: number; symbol: string; type: number; lots: number; openPrice: number; sl: number; tp: number; profit: number }[]
  synced_at?: string
}

export default function BrokerPage() {
  const { profile, setProfile } = useAppStore()
  const supabase = createClient()

  const [selectedPlatform, setSelectedPlatform] = useState<'MT4' | 'MT5' | 'manual'>('MT5')
  const [mt5Data, setMt5Data]         = useState<MT5Data>({ connected: false })
  const [apiToken, setApiToken]       = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [manualBalance, setManualBalance]     = useState(String(profile?.account_balance || ''))
  const [manualCurrency, setManualCurrency]   = useState(profile?.default_trading_currency || 'USD')
  const [saving, setSaving]           = useState(false)
  const [copied, setCopied]           = useState<'token' | 'code' | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [syncRes, profileRes] = await Promise.all([
        fetch('/api/mt5/sync', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from('profiles').select('mt5_api_token, account_balance, default_trading_currency').eq('id', session.user.id).single(),
      ])

      const syncData = await syncRes.json()
      setMt5Data(syncData)

      if (profileRes.data?.mt5_api_token) setApiToken(profileRes.data.mt5_api_token)
      if (profileRes.data?.account_balance) setManualBalance(String(profileRes.data.account_balance))
      if (profileRes.data?.default_trading_currency) setManualCurrency(profileRes.data.default_trading_currency)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateToken() {
    setGeneratingToken(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/mt5/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.token) { setApiToken(data.token); toast.success('Token generated!') }
      else toast.error('Failed to generate token')
    } finally {
      setGeneratingToken(false)
    }
  }

  async function copy(text: string, key: 'token' | 'code') {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
    toast.success(key === 'token' ? 'Token copied!' : 'EA code copied!')
  }

  async function saveManualBalance() {
    const val = parseFloat(manualBalance)
    if (isNaN(val) || val < 0) { toast.error('Enter a valid balance'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase
      .from('profiles')
      .update({ account_balance: val, default_trading_currency: manualCurrency })
      .eq('id', user.id)
    if (error) { toast.error('Could not save — ' + error.message) }
    else {
      if (profile) setProfile({ ...profile, account_balance: val, default_trading_currency: manualCurrency as any })
      toast.success('Balance updated!')
    }
    setSaving(false)
  }

  const timeSinceSync = mt5Data.synced_at
    ? Math.floor((Date.now() - new Date(mt5Data.synced_at).getTime()) / 1000)
    : null

  const syncStatus = timeSinceSync === null ? null
    : timeSinceSync < 60  ? 'live'
    : timeSinceSync < 300 ? 'recent'
    : 'stale'

  const syncColor = syncStatus === 'live' ? 'var(--green)'
    : syncStatus === 'recent' ? 'var(--amber)'
    : 'var(--red)'

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.netlify.app'

  const mt4Code = `//+------------------------------------------------------------------+
//| SniperVision AI Sync EA — MT4 (.mq4)                             |
//| 1. Save as TradeVisionSync.mq4 in MT4/MQL4/Experts/             |
//| 2. Replace PASTE_YOUR_TOKEN_HERE with your token                 |
//| 3. Compile F7, drag onto any chart, enable WebRequest            |
//+------------------------------------------------------------------+
#property strict

extern string API_URL      = "${APP_URL}/api/mt5/sync";
extern string API_TOKEN    = "PASTE_YOUR_TOKEN_HERE";
extern int    SYNC_SECONDS = 30;

int OnInit()   { EventSetTimer(SYNC_SECONDS); return INIT_SUCCEEDED; }
void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer() { SyncData(); }

void SyncData() {
   string headers = "Content-Type: application/json\\r\\nAuthorization: Bearer " + API_TOKEN + "\\r\\n";
   string trades  = "[";
   for(int i = 0; i < OrdersTotal(); i++) {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
         if(i > 0) trades += ",";
         trades += "{\\"ticket\\":" + IntegerToString(OrderTicket())
                + ",\\"symbol\\":\\"" + OrderSymbol() + "\\""
                + ",\\"type\\":" + IntegerToString(OrderType())
                + ",\\"lots\\":" + DoubleToStr(OrderLots(), 2)
                + ",\\"openPrice\\":" + DoubleToStr(OrderOpenPrice(), 5)
                + ",\\"sl\\":" + DoubleToStr(OrderStopLoss(), 5)
                + ",\\"tp\\":" + DoubleToStr(OrderTakeProfit(), 5)
                + ",\\"profit\\":" + DoubleToStr(OrderProfit(), 2) + "}";
      }
   }
   trades += "]";
   string payload = "{"
      + "\\"platform\\":\\"MT4\\","
      + "\\"balance\\":" + DoubleToStr(AccountBalance(), 2) + ","
      + "\\"equity\\":" + DoubleToStr(AccountEquity(), 2) + ","
      + "\\"margin\\":" + DoubleToStr(AccountMargin(), 2) + ","
      + "\\"freeMargin\\":" + DoubleToStr(AccountFreeMargin(), 2) + ","
      + "\\"accountNumber\\":\\"" + IntegerToString(AccountNumber()) + "\\","
      + "\\"accountCurrency\\":\\"" + AccountCurrency() + "\\","
      + "\\"brokerName\\":\\"" + AccountCompany() + "\\","
      + "\\"serverName\\":\\"" + AccountServer() + "\\","
      + "\\"leverage\\":" + IntegerToString(AccountLeverage()) + ","
      + "\\"openTrades\\":" + trades + "}";
   char post[], result[];
   StringToCharArray(payload, post, 0, StringLen(payload));
   string resp_headers;
   int code = WebRequest("POST", API_URL, headers, 5000, post, result, resp_headers);
   if(code != 200) Print("TradeVision sync error: ", code);
}`

  const mt5Code = `//+------------------------------------------------------------------+
//| SniperVision AI Sync EA — MT5 (.mq5)                             |
//| 1. Save as TradeVisionSync.mq5 in MT5/MQL5/Experts/             |
//| 2. Replace PASTE_YOUR_TOKEN_HERE with your token                 |
//| 3. Compile F7, drag onto any chart, enable WebRequest            |
//+------------------------------------------------------------------+

input string API_URL      = "${APP_URL}/api/mt5/sync";
input string API_TOKEN    = "PASTE_YOUR_TOKEN_HERE";
input int    SYNC_SECONDS = 30;

void SyncData()
  {
   string headers = "Content-Type: application/json\\r\\nAuthorization: Bearer " + API_TOKEN + "\\r\\n";
   string trades  = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(i > 0) trades += ",";
      trades += "{\\"ticket\\":" + IntegerToString((int)ticket)
             + ",\\"symbol\\":\\"" + PositionGetString(POSITION_SYMBOL) + "\\""
             + ",\\"type\\":" + IntegerToString((int)PositionGetInteger(POSITION_TYPE))
             + ",\\"lots\\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2)
             + ",\\"openPrice\\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5)
             + ",\\"sl\\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5)
             + ",\\"tp\\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5)
             + ",\\"profit\\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + "}";
     }
   trades += "]";
   string payload = "{"
      + "\\"platform\\":\\"MT5\\","
      + "\\"balance\\":"     + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ","
      + "\\"equity\\":"      + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ","
      + "\\"margin\\":"      + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ","
      + "\\"freeMargin\\":"  + DoubleToString(AccountInfoDouble(ACCOUNT_FREEMARGIN), 2) + ","
      + "\\"accountNumber\\":\\"" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "\\","
      + "\\"accountCurrency\\":\\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\\","
      + "\\"brokerName\\":\\"" + AccountInfoString(ACCOUNT_COMPANY) + "\\","
      + "\\"serverName\\":\\"" + AccountInfoString(ACCOUNT_SERVER) + "\\","
      + "\\"leverage\\":" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LEVERAGE)) + ","
      + "\\"openTrades\\":" + trades + "}";
   char post[], result[];
   StringToCharArray(payload, post, 0, StringLen(payload));
   string resp_headers;
   int code = WebRequest("POST", API_URL, headers, 5000, post, result, resp_headers);
   if(code != 200) Print("TradeVision sync error: ", code);
  }

int OnInit()
  {
   EventSetTimer(SYNC_SECONDS);
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

void OnTimer()
  {
   SyncData();
  }`

  const eaCode = (platform: 'MT4' | 'MT5') => platform === 'MT4' ? mt4Code : mt5Code

  return (
    <div className="p-4 md:p-6 max-w-[860px] mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[20px] font-extrabold tracking-tight">Broker Connection</h2>
        <p className="text-[11px] text-[#777] mt-0.5">
          Sync your MT4 / MT5 account automatically — no manual balance updates needed
        </p>
      </div>

      {/* Platform tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {([
          { id: 'MT4',    icon: '📊', label: 'MetaTrader 4', desc: 'Coming soon' },
          { id: 'MT5',    icon: '📈', label: 'MetaTrader 5', desc: 'Coming soon' },
          { id: 'manual', icon: '✏️', label: 'Manual Entry',  desc: 'Enter balance' },
        ] as const).map(p => (
          <button key={p.id} onClick={() => setSelectedPlatform(p.id)}
            className={`p-4 border-2 rounded-[12px] text-left transition-all
              ${selectedPlatform === p.id
                ? 'border-[var(--green)] bg-[var(--green-dim)]'
                : 'border-[var(--border)] hover:border-[var(--border2)]'}`}>
            <div className="text-2xl mb-1.5">{p.icon}</div>
            <div className="text-[13px] font-bold text-white">{p.label}</div>
            <div className="text-[9px] mt-0.5" style={{ color: p.id !== 'manual' ? 'var(--amber)' : '#777' }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* ── MT4 / MT5 EA Sync ── */}
      {(selectedPlatform === 'MT4' || selectedPlatform === 'MT5') && (
        <div className="space-y-4">
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-[14px] p-6 text-center">
            <div className="text-3xl mb-3">🔧</div>
            <div className="text-[14px] font-bold text-[var(--amber)] mb-2">{selectedPlatform} Auto-Sync — Coming Soon</div>
            <p className="text-[12px] text-[#777] max-w-[380px] mx-auto leading-relaxed">
              We are working on a seamless {selectedPlatform} integration that requires no technical setup.
              In the meantime, use <strong className="text-white">Manual Entry</strong> to keep your balance up to date for accurate lot sizing.
            </p>
            <button onClick={() => setSelectedPlatform('manual')}
              className="mt-4 btn-primary px-5 py-2 rounded-[8px] text-[12px]">
              Use Manual Entry →
            </button>
          </div>
        </div>
      )}

      {/* hidden — kept for when MT4/MT5 sync is ready */}
      {false && (selectedPlatform === 'MT4' || selectedPlatform === 'MT5') && (
        <div className="space-y-4">

          {/* Live connection status — only show if connected */}
          {!loading && mt5Data.connected && (
            <div className="bg-[var(--surface)] border border-[rgba(34,197,94,0.3)] rounded-[14px] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: syncColor }} />
                  <span className="text-[13px] font-bold text-white">{mt5Data.platform} Connected</span>
                  <span className="text-[9px] font-mono-tv px-2 py-0.5 rounded-full border"
                    style={{ color: syncColor, borderColor: syncColor + '44', background: syncColor + '18' }}>
                    {syncStatus === 'live' ? 'LIVE' : syncStatus === 'recent' ? 'RECENT' : 'STALE'}
                  </span>
                </div>
                <span className="text-[9px] text-[#555] font-mono-tv">{timeSinceSync}s ago</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'BALANCE',     val: `${mt5Data.account_currency} ${mt5Data.balance?.toLocaleString()}`,     color: 'var(--green)' },
                  { label: 'EQUITY',      val: `${mt5Data.account_currency} ${mt5Data.equity?.toLocaleString()}`,      color: '#60a5fa' },
                  { label: 'FREE MARGIN', val: `${mt5Data.account_currency} ${mt5Data.free_margin?.toLocaleString()}`, color: 'var(--amber)' },
                  { label: 'LEVERAGE',    val: `1:${mt5Data.leverage}`,                                                 color: 'white' },
                ].map(item => (
                  <div key={item.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 text-center">
                    <div className="text-[8px] font-mono-tv text-[#555] mb-1">{item.label}</div>
                    <div className="text-[13px] font-extrabold font-mono-tv" style={{ color: item.color }}>{item.val || '—'}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 text-[10px] text-[#777] font-mono-tv">
                {mt5Data.broker_name && <span>Broker: <strong className="text-white">{mt5Data.broker_name}</strong></span>}
                {mt5Data.account_number && <span>Account: <strong className="text-white">#{mt5Data.account_number}</strong></span>}
                {mt5Data.server_name && <span>Server: <strong className="text-white">{mt5Data.server_name}</strong></span>}
              </div>

              {(mt5Data.open_trades ?? []).length > 0 && (
                <div className="mt-4">
                  <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-2">OPEN TRADES ({(mt5Data.open_trades ?? []).length})</div>
                  <div className="space-y-1.5">
                    {(mt5Data.open_trades ?? []).slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center justify-between bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-2 text-[10px] font-mono-tv">
                        <span className="text-white font-bold">{t.symbol}</span>
                        <span className={t.type === 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                          {t.type === 0 ? 'BUY' : 'SELL'} {t.lots}
                        </span>
                        <span className={t.profit >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                          {t.profit >= 0 ? '+' : ''}{t.profit?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Not connected yet */}
          {!loading && !mt5Data.connected && (
            <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] rounded-[12px] px-4 py-3 flex items-center gap-3 text-[11px] text-[#aaa]">
              <span className="text-[16px]">⚠️</span>
              No {selectedPlatform} account synced yet. Follow the steps below to connect.
            </div>
          )}

          {/* Step 1 — Generate token */}
          <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[14px] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-[var(--green-dim)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center text-[9px] font-bold text-[var(--green)] flex-shrink-0">1</div>
              <div className="text-[13px] font-bold text-white">Generate Your API Token</div>
            </div>
            <p className="text-[11px] text-[#777] mb-4 ml-7">
              This token lets the EA prove it belongs to your account. Keep it private — treat it like a password.
            </p>

            {apiToken ? (
              <div className="space-y-2 ml-7">
                <div className="flex items-center gap-2 bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-3 py-2.5">
                  <code className="text-[10px] font-mono-tv text-[var(--green)] flex-1 truncate">{apiToken}</code>
                  <button onClick={() => copy(apiToken ?? '', 'token')}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--green-dim)] text-[var(--green)] border border-[rgba(34,197,94,0.3)] hover:bg-[var(--green)] hover:text-black transition-all flex-shrink-0">
                    {copied === 'token' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <button onClick={generateToken} disabled={generatingToken}
                  className="text-[10px] text-[#555] hover:text-white transition-colors">
                  ↺ Regenerate token (invalidates old one)
                </button>
              </div>
            ) : (
              <div className="ml-7">
                <button onClick={generateToken} disabled={generatingToken}
                  className="btn-primary px-4 py-2.5 rounded-[8px] text-[12px]">
                  {generatingToken ? 'Generating...' : '⚡ Generate API Token'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — EA setup */}
          <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[14px] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-[var(--green-dim)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center text-[9px] font-bold text-[var(--green)] flex-shrink-0">2</div>
              <div className="text-[13px] font-bold text-white">Install the EA in {selectedPlatform}</div>
            </div>
            <div className="space-y-2.5 mb-5 ml-7">
              {[
                `Open ${selectedPlatform} → press F4 to open MetaEditor`,
                'File → New → Expert Advisor (template) → give it any name → Next → Finish',
                'Select all code in the editor (Ctrl+A) and delete it',
                'Paste the EA code below into the empty editor',
                `Find the line: input string API_TOKEN = "PASTE_YOUR_TOKEN_HERE"`,
                'Replace PASTE_YOUR_TOKEN_HERE with your token from Step 1',
                'Press F7 to compile — the Errors tab at the bottom should show 0 errors',
                `Go back to ${selectedPlatform} → open any chart → drag the EA from Navigator onto the chart`,
                'In the EA settings popup, tick "Allow live trading" → OK',
                `Tools → Options → Expert Advisors → tick "Allow WebRequest for listed URL" → add: ${APP_URL}`,
                'The EA syncs every 30 seconds — you will see balance appear above once connected',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-[11px]">
                  <span className="text-[var(--green)] font-mono-tv flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-[#aaa]">{step}</span>
                </div>
              ))}
            </div>

            {/* EA code block */}
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-4 ml-7">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono-tv font-bold text-[#777]">EA CODE — {selectedPlatform}</span>
                <button onClick={() => copy(eaCode(selectedPlatform as 'MT4' | 'MT5'), 'code')}
                  className="text-[9px] px-2.5 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-[#777] hover:text-white transition-colors">
                  {copied === 'code' ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className="text-[9px] text-[#777] font-mono-tv overflow-x-auto max-h-[200px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {eaCode(selectedPlatform as 'MT4' | 'MT5')}
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* ── Manual Entry ── */}
      {selectedPlatform === 'manual' && (
        <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[14px] p-5 space-y-4">
          <div>
            <div className="text-[13px] font-bold text-white mb-0.5">Manual Balance Entry</div>
            <p className="text-[11px] text-[#777]">Update your balance here after each trade for accurate lot sizing.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-mono-tv font-bold text-[#777] tracking-widest mb-1.5">ACCOUNT BALANCE</div>
              <input type="number" value={manualBalance} onChange={e => setManualBalance(e.target.value)}
                placeholder="e.g. 10000" className="tv-select w-full" />
            </div>
            <div>
              <div className="text-[9px] font-mono-tv font-bold text-[#777] tracking-widest mb-1.5">CURRENCY</div>
              <select value={manualCurrency} onChange={e => setManualCurrency(e.target.value as any)} className="tv-select w-full">
                {['USD','GBP','EUR','ZAR','AUD','CAD','JPY','CHF','NZD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button onClick={saveManualBalance} disabled={saving}
            className="btn-primary px-4 py-2.5 rounded-[8px] text-[12px] disabled:opacity-40">
            {saving ? 'Saving...' : '💾 Save Balance'}
          </button>

          {profile?.account_balance && (
            <div className="text-[11px] text-[#777] pt-1 border-t border-[var(--border)]">
              Current saved: <strong className="text-[var(--green)]">
                {profile.account_balance.toLocaleString()} {profile.default_trading_currency}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* Why connect */}
      <div className="mt-5 bg-[rgba(34,197,94,0.04)] border border-[rgba(34,197,94,0.15)] rounded-[14px] p-4">
        <div className="text-[11px] font-bold text-[var(--green)] mb-2">💡 Why connect your broker?</div>
        <div className="space-y-1.5">
          {[
            'Lot sizes auto-calculated from your live balance — no manual updates needed',
            'Risk amounts stay accurate even after wins and losses',
            'Equity-based sizing for prop firm challenges',
            'See your open trades alongside your AI analysis',
          ].map(b => (
            <div key={b} className="flex items-center gap-2 text-[11px] text-[#777]">
              <span className="text-[var(--green)]">✓</span> {b}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
