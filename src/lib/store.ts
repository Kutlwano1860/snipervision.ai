import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  UserProfile, AnalysisResult, AnalysisSettings,
  Tier, Currency, AccountType, TradingMode
} from '@/types'

export type AccentColor = 'green' | 'blue' | 'purple' | 'amber' | 'red'

export interface AppearancePrefs {
  theme: 'dark' | 'light'
  accentColor: AccentColor
  compactMode: boolean
  fontSize: 'small' | 'default' | 'large'
  showMarketBrief: boolean
  showKillZones: boolean
}

export interface PropFirmRules {
  firmName: string
  phase: 1 | 2
  dailyDD: number       // max daily drawdown %
  maxDD: number         // max total drawdown %
  profitTarget: number  // profit target % to pass
  minDays: number       // minimum trading days required
  consistency: number   // max single trade % of total profits (0 = disabled)
  accountSize: number   // account size in home currency
}

interface AppState {
  // User
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void

  // Analysis settings
  settings: AnalysisSettings
  updateSettings: (settings: Partial<AnalysisSettings>) => void

  // Appearance
  appearance: AppearancePrefs
  updateAppearance: (prefs: Partial<AppearancePrefs>) => void

  // Current analysis
  currentAnalysis: AnalysisResult | null
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void
  isAnalysing: boolean
  setIsAnalysing: (v: boolean) => void

  // Daily counter
  dailyUsed: number
  setDailyUsed: (n: number) => void

  // Active trading mode
  activeMode: TradingMode
  setActiveMode: (mode: TradingMode) => void

  // Prop firm custom rules
  propFirmRules: PropFirmRules
  updatePropFirmRules: (rules: Partial<PropFirmRules>) => void

  // Trading currency (can change per session)
  sessionTradingCurrency: Currency
  setSessionTradingCurrency: (c: Currency) => void

  // Clear all session-specific state on logout
  clearSession: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      profile: null,
      setProfile: (profile) => set({ profile }),

      // Settings
      settings: {
        market: 'Auto Detect',
        strategy: 'ICT',
        tradingStyle: 'Day Trader',
        riskAppetite: 'Conservative',
        entryMode: 'Standard',
        session: 'Auto Detect',
        accountType: 'micro',
        tradingCurrency: 'GBP',
        homeCurrency: 'ZAR',
        accountBalance: 800,
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      // Appearance
      appearance: {
        theme: 'dark',
        accentColor: 'green',
        compactMode: false,
        fontSize: 'default',
        showMarketBrief: true,
        showKillZones: true,
      },
      updateAppearance: (partial) =>
        set((state) => ({ appearance: { ...state.appearance, ...partial } })),

      // Analysis
      currentAnalysis: null,
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      isAnalysing: false,
      setIsAnalysing: (v) => set({ isAnalysing: v }),

      // Counter
      dailyUsed: 0,
      setDailyUsed: (n) => set({ dailyUsed: n }),

      // Active trading mode
      activeMode: 'normal',
      setActiveMode: (mode) => set({ activeMode: mode }),

      // Prop firm rules (user-defined)
      propFirmRules: {
        firmName: 'FTMO',
        phase: 1,
        dailyDD: 5,
        maxDD: 10,
        profitTarget: 10,
        minDays: 4,
        consistency: 50,
        accountSize: 10000,
      },
      updatePropFirmRules: (partial) =>
        set((state) => ({ propFirmRules: { ...state.propFirmRules, ...partial } })),

      // Session trading currency
      sessionTradingCurrency: 'GBP',
      setSessionTradingCurrency: (c) => {
        set({ sessionTradingCurrency: c })
        set((state) => ({
          settings: { ...state.settings, tradingCurrency: c }
        }))
      },

      // Clear session state on logout — analysis result and counter reset,
      // but user preferences (settings, currency) are intentionally kept
      clearSession: () => set({
        profile: null,
        currentAnalysis: null,
        isAnalysing: false,
        dailyUsed: 0,
      }),
    }),
    {
      name: 'tradevision-store',
      partialize: (state) => ({
        settings: state.settings,
        appearance: state.appearance,
        sessionTradingCurrency: state.sessionTradingCurrency,
        activeMode: state.activeMode,
        propFirmRules: state.propFirmRules,
      }),
    }
  )
)
