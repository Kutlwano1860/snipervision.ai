import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  UserProfile, AnalysisResult, AnalysisSettings,
  Tier, Currency, AccountType
} from '@/types'

export type AccentColor = 'green' | 'blue' | 'purple' | 'amber' | 'red'

export interface AppearancePrefs {
  accentColor: AccentColor
  compactMode: boolean
  fontSize: 'small' | 'default' | 'large'
  showMarketBrief: boolean
  showKillZones: boolean
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
      }),
    }
  )
)
