// ─────────────────────────────────────────────
// TRADEVISION AI — Core Types
// ─────────────────────────────────────────────

export type Tier = 'free' | 'premium' | 'platinum' | 'diamond'

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL'

export type RiskRating = 'LOW' | 'MEDIUM' | 'HIGH'

export type AccountType = 'micro' | 'standard' | 'pro' | 'prop' | 'funded' | 'cent'

export type Currency =
  | 'USD' | 'GBP' | 'EUR' | 'ZAR' | 'AUD' | 'CAD'
  | 'JPY' | 'CHF' | 'NZD' | 'NGN' | 'KES' | 'OTHER'

export type MarketType =
  | 'Auto Detect' | 'Forex' | 'Crypto'
  | 'Stocks' | 'Indices' | 'Commodities'

export type Strategy =
  | 'ICT'
  | 'SMC'
  | 'Support & Resistance'
  | 'Supply & Demand'
  | 'CRT'
  | 'Price Action MS'
  | 'Top Down Analysis'
  | 'Mix'

export type TradingStyle = 'Scalper' | 'Day Trader' | 'Swing Trader'

export type Session =
  | 'Auto Detect' | 'London' | 'New York'
  | 'Asian' | 'London/NY Overlap'

// ── User Profile ──
// Fields match Supabase snake_case column names
export interface UserProfile {
  id: string
  email: string
  name: string
  home_currency: Currency
  default_trading_currency: Currency
  account_type: AccountType
  account_balance: number
  tier: Tier
  daily_analyses_used: number
  last_analysis_date: string
  created_at: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

// ── Analysis Settings ──
export interface AnalysisSettings {
  market: MarketType
  strategy: Strategy
  riskAppetite: 'Conservative' | 'Moderate' | 'Aggressive'
  entryMode: 'Aggressive' | 'Standard' | 'Comfortable'
  session: Session
  accountType: AccountType
  tradingCurrency: Currency
  homeCurrency: Currency
  accountBalance: number
}

// ── Analysis Result ──
export interface AnalysisResult {
  // Asset Info
  asset: string
  timeframe: string

  // Bias
  bias: Bias
  confidence: number

  // Levels
  entry: string
  stopLoss: string
  tp1: string
  tp2: string
  tp3: string
  rr1: string
  rr2: string
  rr3: string

  // Risk
  riskRating: RiskRating

  // Analysis Text
  technical: string
  patterns: string[]
  keyLevels: string
  reasoning: string
  invalidation: string

  // Tier-gated content
  fundamental: string
  macro: string
  smc: string

  // Lot Sizing
  lotConservative: string
  lotModerate: string
  lotScaled: string
  riskCons: string
  riskMod: string
  riskScale: string
  profitCons: string
  profitMod: string
  profitScale: string

  // Live Context
  eventRisk: string

  // Enhanced analysis fields
  setupQuality: 'A+' | 'A' | 'B' | 'C' | string
  confluenceScore: number        // 1–10 how many factors align
  killZone: string               // which session kill zone this aligns with
  liquidityContext: string       // key liquidity pools above and below
  tradeManagement: string        // when to move SL to BE, partial closes, trail rules
  alternativeScenario: string    // bearish case / what invalidates and what happens next
  storyline: string              // HTF narrative: "Weekly: BEARISH → Daily: Retracement → H4: SHORT confirmed"
  psychLevels: string            // psychological round-number levels near price
  patternProbability: string     // win-rate context for identified patterns

  // Meta
  createdAt?: string
  id?: string
}

// ── Trade Journal Entry ──
export interface JournalEntry {
  id: string
  userId: string
  asset: string
  bias: Bias
  strategy: string
  entry: string
  exit?: string
  pnl?: number
  pnlHomeCurrency?: number
  homeCurrency: Currency
  outcome: 'win' | 'loss' | 'live' | 'skipped'
  analysis: AnalysisResult
  takenTrade: boolean
  notes?: string
  createdAt: string
}

// ── Watchlist Item ──
export interface WatchlistItem {
  id: string
  userId: string
  pair: string
  assetClass: 'FOREX' | 'CRYPTO' | 'STOCKS' | 'INDEX' | 'COMMODITY'
  addedAt: string
}

// ── Market Data ──
export interface TickerItem {
  pair: string
  price: string
  change: string
  direction: 'up' | 'down'
}

export interface LiveMarketData {
  dxy: { price: string; change: string; direction: 'up' | 'down' }
  session: string
  retailLong: number
  eventRisk?: { name: string; timeRemaining: string }
}

// ── Subscription Plans ──
export interface PlanFeature {
  text: string
  included: boolean
  highlight?: boolean
}

export interface SubscriptionPlan {
  tier: Tier
  name: string
  price: number
  period: string
  yearlyPrice?: number
  features: PlanFeature[]
  ctaText: string
  popular?: boolean
  priceId?: string
}

// ── Currency Config ──
export interface CurrencyConfig {
  code: Currency
  symbol: string
  flag: string
  name: string
  rateToZAR: number
}
