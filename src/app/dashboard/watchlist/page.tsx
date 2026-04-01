'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const ASSET_CLASSES = ['All', 'FOREX', 'CRYPTO', 'INDEX', 'COMMODITY']

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

const STORAGE_KEY = 'tv-extra-pairs'

function loadExtras(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveExtras(pairs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs))
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
  const [watchlist, setWatchlist]     = useState<WatchlistItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [filterCls, setFilterCls]     = useState('All')
  const [extraPairs, setExtraPairs]   = useState<string[]>([])
  const [catalogue, setCatalogue]     = useState<string[]>([])
  const [showAdd, setShowAdd]         = useState(false)
  const [addSearch, setAddSearch]     = useState('')

  // Load persisted extras on mount
  useEffect(() => { setExtraPairs(loadExtras()) }, [])

  const fetchMarketData = useCallback(async (extras: string[]) => {
    try {
      const qs = extras.length ? `?extra=${extras.join(',')}` : ''
      const res = await fetch(`/api/market${qs}`)
      if (!res.ok) throw new Error('Failed to fetch market data')
      const data = await res.json()
      setWatchlist(data.ticker)
      if (data.catalogue) setCatalogue(data.catalogue)
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load market data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMarketData(extraPairs) }, [extraPairs])

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMarketData(extraPairs), 30_000)
    return () => clearInterval(interval)
  }, [extraPairs, fetchMarketData])

  function addPair(pair: string) {
    const updated = [...extraPairs, pair]
    setExtraPairs(updated)
    saveExtras(updated)
    setShowAdd(false)
    setAddSearch('')
    setLoading(true)
  }

  function removePair(pair: string) {
    // Only allow removing non-default pairs
    const updated = extraPairs.filter(p => p !== pair)
    setExtraPairs(updated)
    saveExtras(updated)
    setWatchlist(prev => prev.filter(w => w.pair !== pair))
  }

  const DEFAULT_PAIRS = ['XAUUSD','BTCUSD','NAS100','GBPJPY','GBPUSD','USDJPY','EURUSD','US30']

  const alreadyAdded = new Set([...DEFAULT_PAIRS, ...extraPairs])
  const searchResults = catalogue.filter(p =>
    !alreadyAdded.has(p) && (addSearch === '' || p.includes(addSearch.toUpperCase()))
  )

  const filtered = filterCls === 'All'
    ? watchlist
    : watchlist.filter(w => w.cls === filterCls)

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
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
          <button onClick={() => { setLoading(true); fetchMarketData(extraPairs) }}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[#777] hover:text-white transition-all">
            ↺ Refresh
          </button>
          <button onClick={() => setShowAdd(true)}
            className="btn-primary text-[11px] px-4 py-2 rounded-lg">
            + Add Asset
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {ASSET_CLASSES.map(cls => (
          <button key={cls} onClick={() => setFilterCls(cls)}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all
              ${filterCls === cls
                ? 'bg-[var(--surface2)] text-white border-[var(--border2)]'
                : 'border-[var(--border)] text-[#777] hover:text-white'}`}>
            {cls}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-[rgba(239,68,68,0.07)] border border-[rgba(239,68,68,0.2)] rounded-lg px-4 py-3 text-[12px] text-[var(--red)]">
          ⚠️ {error} — showing last known data
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map(item => {
              const biasColor = item.bias === 'BULLISH' ? 'var(--green)' : item.bias === 'BEARISH' ? 'var(--red)' : 'var(--amber)'
              const chartColor = item.dir === 'up' ? '#22c55e' : '#ef4444'
              const isCustom = extraPairs.includes(item.pair)

              return (
                <div key={item.pair}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-[12px] p-4 hover:border-[var(--border2)] hover:-translate-y-0.5 transition-all relative group">
                  {/* Remove button for custom-added pairs */}
                  {isCustom && (
                    <button onClick={() => removePair(item.pair)}
                      className="absolute top-2.5 right-2.5 w-5 h-5 bg-[var(--surface3)] border border-[var(--border)] rounded text-[#555] hover:text-[var(--red)] hover:border-[rgba(239,68,68,0.4)] transition-all text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                      title="Remove from watchlist">
                      ✕
                    </button>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-bold font-mono-tv">{item.pair}</span>
                    <span className="text-[8px] font-mono-tv text-[#777] bg-[var(--surface3)] px-1.5 py-0.5 rounded">{item.cls}</span>
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
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: biasColor, boxShadow: `0 0 5px ${biasColor}` }} />
                      <span style={{ color: biasColor }}>{item.bias}</span>
                    </div>
                    <span className="text-[9px] text-[#777]">Upload chart to analyse →</span>
                  </div>
                </div>
              )
            })}

        {/* Add Asset card */}
        {!loading && (
          <div onClick={() => setShowAdd(true)}
            className="bg-[var(--surface)] border border-dashed border-[var(--border2)] rounded-[12px] p-4 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-[var(--surface2)] hover:border-[var(--green)] transition-all text-[#777] hover:text-white">
            <div className="text-[28px] opacity-25 mb-2">+</div>
            <div className="text-[12px] font-semibold">Add Asset</div>
            <div className="text-[9px] text-[#555] mt-0.5">{catalogue.length} pairs available</div>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-[rgba(8,8,8,0.9)] z-50 flex items-center justify-center backdrop-blur-lg p-4"
          onClick={() => { setShowAdd(false); setAddSearch('') }}>
          <div className="bg-[var(--surface)] border border-[var(--border2)] rounded-[18px] p-6 w-full max-w-[440px] animate-fade-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-extrabold">Add Asset to Watchlist</h3>
              <button onClick={() => { setShowAdd(false); setAddSearch('') }}
                className="w-7 h-7 bg-[var(--surface3)] border border-[var(--border)] rounded-md text-[#777] flex items-center justify-center text-xs hover:text-white">✕</button>
            </div>

            <input
              autoFocus
              type="text"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="Search pair e.g. ETHUSD, AUDUSD..."
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] px-3 py-2 text-[13px] outline-none focus:border-[var(--green)] transition-colors mb-3"
            />

            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {searchResults.length === 0 ? (
                <p className="text-[12px] text-[#555] text-center py-6">
                  {addSearch ? 'No matches found' : 'All available pairs already added'}
                </p>
              ) : (
                searchResults.map(pair => (
                  <button key={pair} onClick={() => addPair(pair)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-[9px] text-left hover:bg-[var(--surface2)] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-bold font-mono-tv">{pair}</span>
                      <span className="text-[8px] text-[#555] font-mono-tv bg-[var(--surface3)] px-1.5 py-0.5 rounded">
                        {PAIR_CATALOGUE_CLIENT[pair] || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--green)] opacity-0 group-hover:opacity-100 transition-opacity font-bold">+ Add</span>
                  </button>
                ))
              )}
            </div>

            <p className="text-[9px] text-[#555] mt-3 font-mono-tv text-center">
              Custom pairs are saved in your browser. Data updates every 30s.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Client-side copy of class labels for display in the modal
const PAIR_CATALOGUE_CLIENT: Record<string, string> = {
  'AUDUSD': 'FOREX',     'USDCAD': 'FOREX',     'USDCHF': 'FOREX',
  'NZDUSD': 'FOREX',     'EURGBP': 'FOREX',     'EURJPY': 'FOREX',
  'GBPCHF': 'FOREX',     'GBPAUD': 'FOREX',      'GBPCAD': 'FOREX',
  'AUDCAD': 'FOREX',     'CADJPY': 'FOREX',      'CHFJPY': 'FOREX',
  'ETHUSD': 'CRYPTO',    'SOLUSD': 'CRYPTO',     'XRPUSD': 'CRYPTO',
  'BNBUSD': 'CRYPTO',    'SPX500': 'INDEX',      'GER40':  'INDEX',
  'UK100':  'INDEX',     'XAGUSD': 'COMMODITY',  'USOIL':  'COMMODITY',
}
