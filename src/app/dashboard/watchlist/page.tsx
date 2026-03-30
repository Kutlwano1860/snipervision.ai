'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface WatchlistItem {
  pair:      string
  cls:       string
  price:     string
  chg:       string
  dir:       'up' | 'down'
  bias:      'BULLISH' | 'BEARISH' | 'NEUTRAL'
  data:      number[]
  raw:       number | null
  updatedAt: string
}

function MiniChart({ data, color, id }: { data: number[]; color: string; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    c.width = c.offsetWidth || 200; c.height = 36
    const ctx = c.getContext('2d')!
    const w = c.width, h = 36
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, color + '44'); g.addColorStop(1, color + '00')
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w, y = h - ((v - mn) / rng) * (h - 5) - 3
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
    ctx.fillStyle = g; ctx.fill()
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w, y = h - ((v - mn) / rng) * (h - 5) - 3
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke()
  }, [data])
  return <canvas ref={ref} id={id} className="w-full h-full" />
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-16 bg-[var(--surface3)] rounded" />
        <div className="h-3 w-12 bg-[var(--surface3)] rounded" />
      </div>
      <div className="h-7 w-24 bg-[var(--surface3)] rounded mb-2" />
      <div className="h-3 w-16 bg-[var(--surface3)] rounded mb-3" />
      <div className="h-9 bg-[var(--surface2)] rounded mb-3" />
      <div className="flex justify-between">
        <div className="h-3 w-14 bg-[var(--surface3)] rounded" />
        <div className="h-3 w-20 bg-[var(--surface3)] rounded" />
      </div>
    </div>
  )
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch('/api/market')
      if (!res.ok) throw new Error('Failed to fetch market data')
      const data = await res.json()
      setWatchlist(data.ticker)
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load market data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchMarketData()
  }, [fetchMarketData])

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMarketData, 30_000)
    return () => clearInterval(interval)
  }, [fetchMarketData])

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight">Watchlist</h2>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-[10px] text-[#777] font-mono-tv">
                Live · Updated {lastUpdated} · refreshes every 30s
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMarketData}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[#777] hover:text-white transition-all"
          >
            ↻ Refresh
          </button>
          <button className="btn-primary text-[11px] px-4 py-2 rounded-lg">+ Add Asset</button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-[rgba(239,68,68,0.07)] border border-[rgba(239,68,68,0.2)] rounded-lg px-4 py-3 text-[12px] text-[var(--red)]">
          ⚠️ {error} — showing last known data
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : watchlist.map(item => {
              const biasColor =
                item.bias === 'BULLISH' ? 'var(--green)'
                : item.bias === 'BEARISH' ? 'var(--red)'
                : 'var(--amber)'
              const chartColor = item.dir === 'up' ? '#22c55e' : '#ef4444'

              return (
                <div
                  key={item.pair}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 cursor-pointer hover:border-[var(--border2)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-bold font-mono-tv">{item.pair}</span>
                    <span className="text-[8px] font-mono-tv text-[#777] bg-[var(--surface3)] px-1.5 py-0.5 rounded">
                      {item.cls}
                    </span>
                  </div>
                  <div className="text-[22px] font-extrabold tracking-tight mb-0.5">{item.price}</div>
                  <div className={`text-[11px] font-mono-tv font-semibold mb-3 ${item.dir === 'up' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {item.dir === 'up' ? '▲' : '▼'} {item.chg} today
                  </div>
                  <div className="h-9 bg-[var(--surface2)] rounded-[5px] overflow-hidden mb-3">
                    <MiniChart data={item.data} color={chartColor} id={`wc-${item.pair}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono-tv font-bold">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: biasColor,
                          boxShadow: item.bias !== 'NEUTRAL' ? `0 0 5px ${biasColor}` : 'none',
                        }}
                      />
                      <span style={{ color: biasColor }}>{item.bias}</span>
                    </div>
                    <span className="text-[9px] text-[#777]">Tap to analyse →</span>
                  </div>
                </div>
              )
            })}

        {/* Add Asset card */}
        {!loading && (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border2)] rounded-[12px] p-4 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-[var(--surface2)] transition-colors text-[#777]">
            <div className="text-[28px] opacity-25 mb-2">+</div>
            <div className="text-[12px] font-semibold">Add Asset</div>
          </div>
        )}
      </div>
    </div>
  )
}