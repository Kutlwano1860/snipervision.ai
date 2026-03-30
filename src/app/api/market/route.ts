import { NextResponse } from 'next/server'

// Twelve Data symbol mapping
const SYMBOLS = [
  { pair: 'XAUUSD', cls: 'COMMODITY', tdSymbol: 'XAU/USD' },
  { pair: 'EURUSD', cls: 'FOREX',     tdSymbol: 'EUR/USD' },
  { pair: 'BTCUSD', cls: 'CRYPTO',    tdSymbol: 'BTC/USD' },
  { pair: 'NAS100', cls: 'INDEX',     tdSymbol: 'NDX' },
  { pair: 'GBPJPY', cls: 'FOREX',     tdSymbol: 'GBP/JPY' },
  { pair: 'USOIL',  cls: 'COMMODITY', tdSymbol: 'WTI/USD' },
  { pair: 'SPX500', cls: 'INDEX',     tdSymbol: 'SPX' },
  { pair: 'ETHUSD', cls: 'CRYPTO',    tdSymbol: 'ETH/USD' },
  { pair: 'GBPUSD', cls: 'FOREX',     tdSymbol: 'GBP/USD' },
  { pair: 'USDJPY', cls: 'FOREX',     tdSymbol: 'USD/JPY' },
]

export async function GET() {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Twelve Data API key not configured' }, { status: 500 })
    }

    // Build comma-separated symbol list for batch request
    const symbolList = SYMBOLS.map(s => s.tdSymbol).join(',')

    // Fetch current prices (batch request = 1 API call)
    const priceRes = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}`
    )
    const priceData = await priceRes.json()

    // Fetch 24h change data
    const changeRes = await fetch(
      `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}`
    )
    const changeData = await changeRes.json()

    // Build response array
    const ticker = SYMBOLS.map(item => {
      const priceEntry = priceData[item.tdSymbol]
      const quoteEntry = changeData[item.tdSymbol]

      const price = priceEntry?.price ? parseFloat(priceEntry.price) : null
      const change = quoteEntry?.percent_change ? parseFloat(quoteEntry.percent_change) : null
      const open   = quoteEntry?.open ? parseFloat(quoteEntry.open) : null

      // Format price nicely
      let formattedPrice = '—'
      if (price !== null) {
        if (price > 10000)      formattedPrice = price.toLocaleString('en', { maximumFractionDigits: 0 })
        else if (price > 100)   formattedPrice = price.toLocaleString('en', { maximumFractionDigits: 2 })
        else                    formattedPrice = price.toFixed(4)
      }

      const direction = change !== null ? (change >= 0 ? 'up' : 'down') : 'up'
      const formattedChange = change !== null
        ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`
        : '0.00%'

      // Build mini chart data from open → current (8 points)
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
        dir:       direction,
        bias:      direction === 'up' ? 'BULLISH' : 'BEARISH',
        data:      chartData,
        raw:       price,
        updatedAt: new Date().toISOString(),
      }
    })

    return NextResponse.json({ ticker }, {
      headers: {
        // Cache for 30 seconds
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      }
    })

  } catch (error) {
    console.error('Market data error:', error)
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}