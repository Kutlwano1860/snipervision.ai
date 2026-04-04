import type { Currency, AccountType, CurrencyConfig, SubscriptionPlan, Tier } from '@/types'

// ── New-profile defaults (used wherever a profile row is auto-created) ──
export const DEFAULT_HOME_CURRENCY: Currency    = 'ZAR'
export const DEFAULT_TRADING_CURRENCY: Currency = 'GBP'
export const DEFAULT_ACCOUNT_TYPE: AccountType  = 'micro'
export const DEFAULT_ACCOUNT_BALANCE            = 0

// ── Tier Limits ──
export const TIER_LIMITS: Record<Tier, number> = {
  free: 3,
  premium: 20,
  platinum: 999,
  diamond: 999,
}

export const TIER_ICONS: Record<Tier, string> = {
  free: '🔍',
  premium: '⚡',
  platinum: '💎',
  diamond: '👑',
}

// ── Currency Config ──
export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$',   flag: '🇺🇸', name: 'US Dollar',        rateToZAR: 18.72 },
  { code: 'GBP', symbol: '£',   flag: '🇬🇧', name: 'British Pound',     rateToZAR: 23.61 },
  { code: 'EUR', symbol: '€',   flag: '🇪🇺', name: 'Euro',              rateToZAR: 20.14 },
  { code: 'ZAR', symbol: 'R',   flag: '🇿🇦', name: 'South African Rand', rateToZAR: 1     },
  { code: 'AUD', symbol: 'A$',  flag: '🇦🇺', name: 'Australian Dollar',  rateToZAR: 12.18 },
  { code: 'CAD', symbol: 'C$',  flag: '🇨🇦', name: 'Canadian Dollar',    rateToZAR: 13.74 },
  { code: 'JPY', symbol: '¥',   flag: '🇯🇵', name: 'Japanese Yen',       rateToZAR: 0.125 },
  { code: 'CHF', symbol: 'Fr',  flag: '🇨🇭', name: 'Swiss Franc',        rateToZAR: 21.04 },
  { code: 'NZD', symbol: 'NZ$', flag: '🇳🇿', name: 'New Zealand Dollar',  rateToZAR: 11.32 },
  { code: 'NGN', symbol: '₦',   flag: '🇳🇬', name: 'Nigerian Naira',     rateToZAR: 0.012 },
  { code: 'KES', symbol: 'KSh', flag: '🇰🇪', name: 'Kenyan Shilling',    rateToZAR: 0.14  },
  { code: 'OTHER', symbol: '$', flag: '🌍', name: 'Other',              rateToZAR: 1     },
]

export const getCurrency = (code: Currency): CurrencyConfig =>
  CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0]

export const convertToHome = (
  amount: number,
  fromCurrency: Currency,
  homeCurrency: Currency
): number => {
  const from = getCurrency(fromCurrency)
  const to = getCurrency(homeCurrency)
  const inZAR = amount * from.rateToZAR
  return inZAR / to.rateToZAR
}

export const formatCurrency = (
  amount: number,
  currency: Currency,
  decimals = 2
): string => {
  const config = getCurrency(currency)
  return `${config.symbol}${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

// ── Image Upload Limits ──
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_SIZE_MB = 10
// Base64 encoding adds ~37% overhead, so max base64 length = MAX_IMAGE_SIZE_MB * 1.37 * 1024 * 1024
export const MAX_IMAGE_BASE64_LENGTH = MAX_IMAGE_SIZE_MB * 1.37 * 1024 * 1024

// ── Subscription Plans ──
export const PLANS: SubscriptionPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    ctaText: 'Get Started',
    features: [
      { text: '3 analyses per day', included: true },
      { text: 'Market bias + confidence score', included: true },
      { text: 'Entry + Stop Loss', included: true },
      { text: 'Basic technical analysis', included: true },
      { text: 'Single timeframe only', included: true },
      { text: 'TP levels', included: false },
      { text: 'Lot sizing suggestions', included: false },
      { text: 'Fundamental / macro analysis', included: false },
      { text: 'Trading style selector', included: false },
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: 19.99,
    period: '/month',
    yearlyPrice: 179,
    ctaText: 'Start 7-Day Free Trial',
    features: [
      { text: '20 analyses per day', included: true },
      { text: '3 Take Profit levels + R:R ratios', included: true },
      { text: 'Smart lot sizing for your account', included: true },
      { text: 'Full technical, patterns & key levels', included: true },
      { text: 'Setup quality grade + confluence score', included: true },
      { text: 'Kill zone + psychological levels', included: true },
      { text: 'Economic event risk alerts', included: true },
      { text: 'Trade journal', included: true },
      { text: 'Trading style selector (Scalper / Day Trader / Swing Trader)', included: true, highlight: true },
    ],
  },
  {
    tier: 'platinum',
    name: 'Platinum',
    price: 49.99,
    period: '/month',
    yearlyPrice: 449,
    ctaText: 'Start 14-Day Free Trial',
    popular: true,
    features: [
      { text: 'Unlimited analyses', included: true, highlight: true },
      { text: 'Multi-timeframe confluence (up to 3 charts)', included: true },
      { text: 'Full fundamental analysis', included: true },
      { text: 'Macro environment analysis', included: true },
      { text: 'Smart Money Concepts (order blocks, FVGs, BOS)', included: true },
      { text: 'Liquidity context analysis', included: true },
      { text: 'Trade management plan', included: true },
      { text: 'Alternative scenario planning', included: true },
      { text: 'HTF storyline narrative', included: true },
    ],
  },
  {
    tier: 'diamond',
    name: 'Diamond',
    price: 149.99,
    period: '/month',
    yearlyPrice: 1299,
    ctaText: 'Start 14-Day Free Trial',
    features: [
      { text: 'Everything in Platinum', included: true },
      { text: 'Community signal feed — post, like, discuss', included: true },
      { text: 'Strategy leaderboard — platform-wide rankings', included: true },
      { text: 'AI daily market brief — session outlook on every scan', included: true },
      { text: 'Setup history — review every scan with outcome tracking', included: true },
      { text: 'Broker connection — balance sync for lot sizing', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access to all new features', included: true },
    ],
  },
]

