import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// In-memory cache — resets on cold start, good enough for serverless
let memCache: { ticker: object; ts: number } | null = null
const CACHE_MS = 60_000

type SymbolDef = { pair: string; cls: string; tdSymbol: string }

const DEFAULT_SYMBOLS: SymbolDef[] = [
  { pair: 'XAUUSD', cls: 'COMMODITY', tdSymbol: 'XAU/USD' },
  { pair: 'BTCUSD', cls: 'CRYPTO',    tdSymbol: 'BTC/USD' },
  { pair: 'NAS100', cls: 'INDEX',     tdSymbol: 'NDX'     },
  { pair: 'GBPJPY', cls: 'FOREX',     tdSymbol: 'GBP/JPY' },
  { pair: 'GBPUSD', cls: 'FOREX',     tdSymbol: 'GBP/USD' },
  { pair: 'USDJPY', cls: 'FOREX',     tdSymbol: 'USD/JPY' },
  { pair: 'EURUSD', cls: 'FOREX',     tdSymbol: 'EUR/USD' },
  { pair: 'US30',   cls: 'INDEX',     tdSymbol: 'DJI'     },
]

const PAIR_CATALOGUE: Record<string, { cls: string; tdSymbol: string }> = {
  'AUDUSD': { cls: 'FOREX',     tdSymbol: 'AUD/USD'  },
  'USDCAD': { cls: 'FOREX',     tdSymbol: 'USD/CAD'  },
  'USDCHF': { cls: 'FOREX',     tdSymbol: 'USD/CHF'  },
  'NZDUSD': { cls: 'FOREX',     tdSymbol: 'NZD/USD'  },
  'EURGBP': { cls: 'FOREX',     tdSymbol: 'EUR/GBP'  },
  'EURJPY': { cls: 'FOREX',     tdSymbol: 'EUR/JPY'  },
  'GBPCHF': { cls: 'FOREX',     tdSymbol: 'GBP/CHF'  },
  'GBPAUD': { cls: 'FOREX',     tdSymbol: 'GBP/AUD'  },
  'GBPCAD': { cls: 'FOREX',     tdSymbol: 'GBP/CAD'  },
  'AUDCAD': { cls: 'FOREX',     tdSymbol: 'AUD/CAD'  },
  'CADJPY': { cls: 'FOREX',     tdSymbol: 'CAD/JPY'  },
  'CHFJPY': { cls: 'FOREX',     tdSymbol: 'CHF/JPY'  },
  'ETHUSD': { cls: 'CRYPTO',    tdSymbol: 'ETH/USD'  },
  'SOLUSD': { cls: 'CRYPTO',    tdSymbol: 'SOL/USD'  },
  'XRPUSD': { cls: 'CRYPTO',    tdSymbol: 'XRP/USD'  },
  'BNBUSD': { cls: 'CRYPTO',    tdSymbol: 'BNB/USD'  },
  'SPX500': { cls: 'INDEX',     tdSymbol: 'SPX'      },
  'GER40':  { cls: 'INDEX',     tdSymbol: 'DAX'      },
  'UK100':  { cls: 'INDEX',     tdSymbol: 'FTSE 100' },
  'XAGUSD': { cls: 'COMMODITY', tdSymbol: 'XAG/USD'  },
  'USOIL':  { cls: 'COMMODITY', tdSymbol: 'WTI/USD'  },
}

function buildTicker(symbols: SymbolDef[], quoteData: Record<string, any>) {
  return symbols.map(item => {
    const entry  = quoteData[item.tdSymbol]
    const price  = entry?.close          ? parseFloat(entry.close)          : null
    const change = entry?.percent_change ? parseFloat(entry.percent_change) : null
    const open   = entry?.open           ? parseFloat(entry.open)           : null

    let formattedPrice = '—'
    if (price !== null) {
      if (price > 10_000) formattedPrice = price.toLocaleString('en', { maximumFractionDigits: 0 })
      else if (price > 100) formattedPrice = price.toLocaleString('en', { maximumFractionDigits: 2 })
      else formattedPrice = price.toFixed(4)
    }

    const direction = change !== null ? (change >= 0 ? 'up' : 'down') : 'up'
    const formattedChange = change !== null
      ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
      : '0.00%'

    let chartData: number[] = []
    if (price !== null && open !== null) {
      const step = (price - open) / 7
      chartData = Array.from({ length: 8 }, (_, i) => open + step * i)
    } else {
      chartData = [price ?? 0]
    }

    return {
      pair:      item.pair,
      cls:       item.cls,
      price:     formattedPrice,
      chg:       formattedChange,
      dir:       direction as 'up' | 'down',
      bias:      direction === 'up' ? 'BULLISH' : 'BEARISH',
      data:      chartData,
      raw:       price,
      updatedAt: new Date().toISOString(),
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Twelve Data API key not configured' }, { status: 500 })
    }

    const extraParam = request.nextUrl.searchParams.get('extra') || ''
    const extraPairs = extraParam
      .split(',')
      .map(p => p.trim().toUpperCase())
      .filter(p => p && PAIR_CATALOGUE[p])
      .map(p => ({ pair: p, ...PAIR_CATALOGUE[p] }))

    const allSymbols = [...DEFAULT_SYMBOLS, ...extraPairs]

    // Use in-memory cache for default symbol set only
    if (!extraPairs.length && memCache && Date.now() - memCache.ts < CACHE_MS) {
      return NextResponse.json({ ticker: memCache.ticker, catalogue: Object.keys(PAIR_CATALOGUE), cached: true })
    }

    // Fetch from Twelve Data
    const symbolList = allSymbols.map(s => s.tdSymbol).join(',')
    const quoteRes   = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}`
    )
    const quoteData = await quoteRes.json()

    if (quoteData.code === 429 || quoteData.status === 'error') {
      return NextResponse.json(
        { error: quoteData.message || 'Rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      )
    }

    const ticker = buildTicker(allSymbols, quoteData)

    // Store in memory cache for default set
    if (!extraPairs.length) {
      memCache = { ticker, ts: Date.now() }
    }

    return NextResponse.json({ ticker, catalogue: Object.keys(PAIR_CATALOGUE) }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })

  } catch (error) {
    console.error('Market data error:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
