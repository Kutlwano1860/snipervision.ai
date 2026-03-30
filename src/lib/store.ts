import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  UserProfile, AnalysisResult, AnalysisSettings,
  Tier, Currency, AccountType
} from '@/types'

interface AppState {
  // User
  profile: UserProfile | null
  setProfile: (profile: UserProfile | null) => void

  // Analysis settings
  settings: AnalysisSettings
  updateSettings: (settings: Partial<AnalysisSettings>) => void

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
        strategy: 'Auto Select',
        riskAppetite: 'Conservative',
        session: 'Auto Detect',
        accountType: 'micro',
        tradingCurrency: 'GBP',
        homeCurrency: 'ZAR',
        accountBalance: 800,
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

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
    }),
    {
      name: 'tradevision-store',
      partialize: (state) => ({
        settings: state.settings,
        sessionTradingCurrency: state.sessionTradingCurrency,
      }),
    }
  )
)
