'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Post {
  id: string
  user_id: string
  user_name: string
  content: string
  image_url?: string | null
  asset?: string
  bias?: string
  feed: 'general' | 'premium'
  parent_id?: string | null
  likes_count: number
  created_at: string
  user_liked?: boolean
}

interface StratRow { strategy: string; wins: number; losses: number; win_rate: number }

const ASSET_TAGS = ['XAUUSD','EURUSD','GBPUSD','USDJPY','BTCUSD','NAS100','GBPJPY','USOIL','ETHUSD']

export default function CommunityPage() {
  const { profile } = useAppStore()
  const [tab, setTab]           = useState<'general' | 'premium' | 'leaderboard'>('general')
  const [generalPosts, setGeneral] = useState<Post[]>([])
  const [premiumPosts, setPremium] = useState<Post[]>([])
  const [leaderboard, setLb]    = useState<StratRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [lbLoading, setLbLoad]  = useState(true)
  const [content, setContent]   = useState('')
  const [postAsset, setPostAsset] = useState('')
  const [postBias, setPostBias] = useState<'' | 'BULLISH' | 'BEARISH'>('')
  const [posting, setPosting]   = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const supabase    = createClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)

  const tier = profile?.tier || 'free'
  const canPostPremium = tier !== 'free'

  function timeAgo(ts: string) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  async function fetchPosts(feed: 'general' | 'premium') {
    if (feed === 'general') setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(name)')
        .eq('feed', feed)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        toast.error('Could not load posts — ' + error.message)
        setLoading(false)
        return
      }

      const ids = (data || []).map((p: any) => p.id)
      let likedIds: string[] = []
      if (ids.length > 0) {
        const { data: likesData } = await supabase
          .from('community_likes').select('post_id').eq('user_id', user.id).in('post_id', ids)
        likedIds = (likesData || []).map((l: any) => l.post_id)
      }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        user_name: p.profiles?.name || 'Trader',
        user_liked: likedIds.includes(p.id),
      }))

      if (feed === 'general') { setGeneral(mapped); setLoading(false) }
      else setPremium(mapped)
    } catch (e: any) {
      toast.error('Error: ' + e.message)
      setLoading(false)
    }
  }

  async function loadLeaderboard() {
    setLbLoad(true)
    try {
      const { data, error } = await supabase.rpc('get_strategy_leaderboard')
      if (!error && data) setLb(data as StratRow[])
    } catch {}
    setLbLoad(false)
  }

  useEffect(() => {
    fetchPosts('general')
    fetchPosts('premium')
    loadLeaderboard()
  }, [])

  // Scroll to bottom when general posts load
  useEffect(() => {
    if (tab === 'general' && !loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [loading, tab])

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploadingImage(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `community/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true })
      if (error) { toast.error('Image upload failed'); return null }
      const { data } = supabase.storage.from('chat-images').getPublicUrl(path)
      return data.publicUrl
    } catch { return null }
    finally { setUploadingImage(false) }
  }

  async function submitPost(feed: 'general' | 'premium') {
    if (!content.trim() && !imageFile) return
    if (content.trim().length > 0 && content.trim().length < 2) { toast.error('Message too short'); return }
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not logged in'); setPosting(false); return }

    let image_url: string | null = null
    if (imageFile) {
      image_url = await uploadImage(imageFile)
    }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      content: content.trim() || ' ',
      feed,
      asset: (feed === 'premium' && postAsset) ? postAsset : null,
      bias:  (feed === 'premium' && postBias)  ? postBias  : null,
      image_url,
      parent_id: null,
    })

    if (error) {
      toast.error('Could not post — ' + error.message)
    } else {
      setContent('')
      setPostAsset('')
      setPostBias('')
      setImageFile(null)
      setImagePreview(null)
      if (fileRef.current) fileRef.current.value = ''
      await fetchPosts(feed)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200)
    }
    setPosting(false)
  }

  async function toggleLike(post: Post) {
    if (likingId) return
    setLikingId(post.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLikingId(null); return }
    try {
      const { data } = await supabase.rpc('toggle_like', { p_post_id: post.id })
      const liked = data as boolean
      const updater = (prev: Post[]) => prev.map(p => p.id === post.id
        ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1), user_liked: liked } : p)
      setGeneral(updater)
      setPremium(updater)
    } catch { toast.error('Could not like') }
    setLikingId(null)
  }

  async function deletePost(id: string, feed: 'general' | 'premium') {
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (!error) {
      if (feed === 'general') setGeneral(prev => prev.filter(p => p.id !== id))
      else setPremium(prev => prev.filter(p => p.id !== id))
    }
  }

  // ── Chat bubble component ──
  function ChatBubble({ post, feed }: { post: Post; feed: 'general' | 'premium' }) {
    const isMe = post.user_id === profile?.id
    return (
      <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end mb-3`}>
        {/* Avatar */}
        {!isMe && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--green)] to-[#16a34a] flex items-center justify-center text-[10px] font-extrabold text-black flex-shrink-0 mb-1">
            {post.user_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          {/* Name + time */}
          {!isMe && (
            <span className="text-[9px] text-[#555] font-mono-tv pl-1">{post.user_name} · {timeAgo(post.created_at)}</span>
          )}
          {isMe && (
            <span className="text-[9px] text-[#555] font-mono-tv pr-1 text-right">{timeAgo(post.created_at)}</span>
          )}

          {/* Bubble */}
          <div className={`rounded-[14px] px-3 py-2 relative group
            ${isMe
              ? 'bg-[var(--green)] text-black rounded-br-[4px]'
              : 'bg-[var(--surface2)] border border-[var(--border)] text-white rounded-bl-[4px]'}`}>

            {/* Tags (premium) */}
            {(post.asset || post.bias) && (
              <div className="flex gap-1.5 mb-1.5">
                {post.asset && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isMe ? 'bg-black/20 text-black' : 'bg-[var(--surface3)] text-[#aaa]'}`}>{post.asset}</span>}
                {post.bias && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${post.bias === 'BULLISH' ? 'bg-[var(--green-dim)] text-[var(--green)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--red)]'}`}>{post.bias === 'BULLISH' ? '▲' : '▼'} {post.bias}</span>}
              </div>
            )}

            {/* Image */}
            {post.image_url && (
              <img src={post.image_url} alt="chart" className="rounded-[8px] max-w-full mb-1.5 max-h-[240px] object-cover cursor-pointer"
                onClick={() => window.open(post.image_url!, '_blank')} />
            )}

            {/* Text */}
            {post.content.trim() && post.content.trim() !== ' ' && (
              <p className={`text-[12px] leading-relaxed ${isMe ? 'text-black' : 'text-white'}`}>{post.content}</p>
            )}

            {/* Delete */}
            {isMe && (
              <button onClick={() => deletePost(post.id, feed)}
                className="absolute -top-2 -left-2 w-5 h-5 bg-[var(--surface)] border border-[var(--border)] rounded-full text-[8px] text-[#555] hover:text-[var(--red)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                ✕
              </button>
            )}
          </div>

          {/* Like */}
          <button onClick={() => toggleLike(post)} disabled={likingId === post.id}
            className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full transition-all
              ${post.user_liked ? 'text-[var(--red)]' : 'text-[#555] hover:text-[var(--red)]'} ${isMe ? 'self-end' : 'self-start'}`}>
            ♥ {post.likes_count > 0 ? post.likes_count : ''}
          </button>
        </div>
      </div>
    )
  }

  // ── Chat input ──
  function ChatInput({ feed }: { feed: 'general' | 'premium' }) {
    return (
      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3">
        {imagePreview && (
          <div className="relative inline-block mb-2">
            <img src={imagePreview} alt="preview" className="h-16 rounded-[8px] object-cover border border-[var(--border)]" />
            <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--red)] rounded-full text-white text-[9px] flex items-center justify-center">✕</button>
          </div>
        )}
        {feed === 'premium' && (
          <div className="flex gap-2 mb-2">
            <select value={postAsset} onChange={e => setPostAsset(e.target.value)}
              className="tv-select flex-1 text-[11px] px-2 py-1.5 rounded-[7px]">
              <option value="">No asset tag</option>
              {ASSET_TAGS.map(a => <option key={a}>{a}</option>)}
            </select>
            {(['','BULLISH','BEARISH'] as const).map(b => (
              <button key={b} onClick={() => setPostBias(b)}
                className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all
                  ${postBias === b
                    ? b === 'BULLISH' ? 'bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.4)]'
                    : b === 'BEARISH' ? 'bg-[rgba(239,68,68,0.1)] text-[var(--red)] border-[rgba(239,68,68,0.4)]'
                    : 'bg-[var(--surface2)] text-white border-[var(--border2)]'
                    : 'border-[var(--border)] text-[#555] hover:text-white'}`}>
                {b || 'None'}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Image upload */}
          <button onClick={() => fileRef.current?.click()}
            className="w-9 h-9 flex-shrink-0 bg-[var(--surface2)] border border-[var(--border)] rounded-full flex items-center justify-center text-[14px] hover:border-[var(--green)] transition-colors">
            📎
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPost(feed) } }}
            maxLength={500}
            rows={1}
            placeholder="Type a message... (Enter to send)"
            className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-[20px] px-4 py-2 text-[12px] text-white resize-none outline-none focus:border-[var(--green)] transition-colors placeholder:text-[#444] max-h-[100px]"
            style={{ lineHeight: '1.4' }}
          />

          <button
            onClick={() => submitPost(feed)}
            disabled={posting || uploadingImage || (!content.trim() && !imageFile)}
            className="w-9 h-9 flex-shrink-0 bg-[var(--green)] rounded-full flex items-center justify-center text-black font-bold text-[14px] hover:brightness-110 transition-all disabled:opacity-40">
            {posting || uploadingImage ? '…' : '↑'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-w-[900px] mx-auto">
      {/* Header + tabs */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tight">Community</h2>
            <p className="text-[11px] text-[#777] mt-0.5">Chat with traders, share charts, signal ideas</p>
          </div>
          <div className="flex gap-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-0.5">
            {([
              { key: 'general',     label: '💬 General' },
              { key: 'premium',     label: '⭐ Premium' },
              { key: 'leaderboard', label: '🏆 Rankings' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-[7px] text-[11px] font-semibold transition-all
                  ${tab === t.key ? 'bg-[var(--surface3)] text-white border border-[var(--border2)]' : 'text-[#777] hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── GENERAL CHAT ── */}
      {tab === 'general' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] mx-4 mb-4 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[12px] text-[#555]">Loading...</div>
            ) : generalPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-[48px] opacity-20 mb-3">💬</div>
                <p className="text-[13px] text-[#777]">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              generalPosts.map(post => <ChatBubble key={post.id} post={post} feed="general" />)
            )}
            <div ref={bottomRef} />
          </div>
          <ChatInput feed="general" />
        </div>
      )}

      {/* ── PREMIUM CHAT ── */}
      {tab === 'premium' && (
        <div className="flex flex-col flex-1 min-h-0 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] mx-4 mb-4 overflow-hidden">
          <div className="px-4 py-2 bg-[rgba(245,158,11,0.05)] border-b border-[var(--border)] text-[10px] text-[#777]">
            ⭐ Premium feed — exclusive setups from subscribed traders
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {premiumPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-[48px] opacity-20 mb-3">⭐</div>
                <p className="text-[13px] text-[#777]">{canPostPremium ? 'No premium setups yet. Share the first one!' : 'Upgrade to Premium to post here.'}</p>
              </div>
            ) : (
              premiumPosts.map(post => <ChatBubble key={post.id} post={post} feed="premium" />)
            )}
            <div />
          </div>
          {canPostPremium
            ? <ChatInput feed="premium" />
            : (
              <div className="border-t border-[var(--border)] p-4 text-center">
                <p className="text-[12px] text-[#777]">🔒 Upgrade to Premium to post in this feed</p>
              </div>
            )
          }
        </div>
      )}

      {/* ── LEADERBOARD ── */}
      {tab === 'leaderboard' && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
            <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-4">
              🏆 TOP STRATEGIES BY WIN RATE (PLATFORM-WIDE)
            </div>
            {lbLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[var(--surface2)] rounded-[8px] animate-pulse" />)}</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[36px] opacity-20 mb-2">🏆</div>
                <p className="text-[12px] text-[#777]">Not enough closed trades yet. Keep trading!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((row, i) => {
                  const wr = Number(row.win_rate)
                  const color = wr >= 65 ? 'var(--green)' : wr >= 50 ? 'var(--amber)' : 'var(--red)'
                  const medals = ['🥇','🥈','🥉']
                  return (
                    <div key={row.strategy} className="flex items-center gap-3 bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-4 py-3">
                      <span className="text-[18px] w-7 text-center flex-shrink-0">{medals[i] || `#${i+1}`}</span>
                      <div className="flex-1">
                        <div className="text-[12px] font-bold">{row.strategy}</div>
                        <div className="text-[9px] text-[#777] font-mono-tv">{row.wins}W · {row.losses}L</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[18px] font-extrabold font-mono-tv" style={{ color }}>{wr}%</div>
                      </div>
                      <div className="w-16">
                        <div className="h-1.5 bg-[var(--border2)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] rounded-[12px] p-4 text-[11px] text-[#777]">
            💡 Strategies need at least 3 closed trades to appear here. Log your outcomes in the Journal to contribute.
          </div>
        </div>
      )}
    </div>
  )
}
