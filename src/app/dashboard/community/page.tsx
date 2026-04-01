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

const SETUP_SQL = `-- Run this in Supabase SQL Editor if community is not working:

-- Add missing columns (safe to re-run)
alter table community_posts add column if not exists feed text default 'premium';
alter table community_posts add column if not exists parent_id uuid references community_posts(id) on delete cascade;
alter table community_posts add column if not exists asset text;
alter table community_posts add column if not exists user_name text;
alter table community_posts add column if not exists likes_count integer default 0;

-- Toggle like function
create or replace function toggle_like(p_post_id uuid)
returns boolean language plpgsql security definer as $$
declare v_liked boolean; begin
  select exists(select 1 from community_likes where post_id=p_post_id and user_id=auth.uid()) into v_liked;
  if v_liked then
    delete from community_likes where post_id=p_post_id and user_id=auth.uid();
    update community_posts set likes_count=likes_count-1 where id=p_post_id; return false;
  else
    insert into community_likes(post_id,user_id) values(p_post_id,auth.uid());
    update community_posts set likes_count=likes_count+1 where id=p_post_id; return true;
  end if; end; $$;

-- Leaderboard function
create or replace function get_strategy_leaderboard()
returns table(strategy text,wins bigint,losses bigint,win_rate numeric)
language sql security definer as $$
  select strategy,
    count(*) filter(where outcome='win') as wins,
    count(*) filter(where outcome='loss') as losses,
    case when count(*) filter(where outcome in('win','loss'))=0 then 0
    else round(count(*) filter(where outcome='win')::numeric/
      count(*) filter(where outcome in('win','loss'))*100,1) end as win_rate
  from journal_entries where outcome in('win','loss','live')
  group by strategy having count(*) filter(where outcome in('win','loss'))>=3
  order by win_rate desc $$;`

export default function CommunityPage() {
  const { profile } = useAppStore()
  const [tab, setTab]             = useState<'general' | 'premium' | 'leaderboard'>('general')
  const [generalPosts, setGeneral]= useState<Post[]>([])
  const [premiumPosts, setPremium]= useState<Post[]>([])
  const [replies, setReplies]     = useState<Record<string, Post[]>>({})
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())
  const [loadingReplies, setLR]   = useState<Set<string>>(new Set())
  const [leaderboard, setLb]      = useState<StratRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [lbLoading, setLbLoad]    = useState(true)
  const [dbMissing, setDbMissing] = useState(false)
  const [content, setContent]     = useState('')
  const [postAsset, setPostAsset] = useState('')
  const [postBias, setPostBias]   = useState<'' | 'BULLISH' | 'BEARISH'>('')
  const [posting, setPosting]     = useState(false)
  const [likingId, setLikingId]   = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyPosting, setReplyPosting] = useState(false)
  const supabase    = createClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyRef    = useRef<HTMLTextAreaElement>(null)

  const tier       = profile?.tier || 'free'
  const canPostPremium = tier !== 'free'

  function timeAgo(ts: string) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  async function fetchPosts(feed: 'general' | 'premium') {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(name)')
        .eq('feed', feed)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setDbMissing(true)
        }
        setLoading(false)
        return
      }

      const ids = (data || []).map((p: any) => p.id)
      let likedIds: string[] = []
      if (ids.length > 0) {
        const { data: likesData } = await supabase
          .from('community_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', ids)
        likedIds = (likesData || []).map((l: any) => l.post_id)
      }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        user_name: p.profiles?.name || 'Trader',
        user_liked: likedIds.includes(p.id),
      }))

      if (feed === 'general') setGeneral(mapped)
      else setPremium(mapped)
    } catch {}
    setLoading(false)
  }

  async function fetchReplies(postId: string) {
    setLR(prev => new Set(prev).add(postId))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(name)')
        .eq('parent_id', postId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        const ids = data.map((r: any) => r.id)
        let likedIds: string[] = []
        if (ids.length > 0) {
          const { data: likesData } = await supabase
            .from('community_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', ids)
          likedIds = (likesData || []).map((l: any) => l.post_id)
        }
        setReplies(prev => ({
          ...prev,
          [postId]: data.map((r: any) => ({
            ...r,
            user_name: r.profiles?.name || 'Trader',
            user_liked: likedIds.includes(r.id),
          })),
        }))
      }
    } catch {}
    setLR(prev => { const s = new Set(prev); s.delete(postId); return s })
  }

  function toggleReplies(postId: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(postId)) { s.delete(postId) }
      else {
        s.add(postId)
        if (!replies[postId]) fetchReplies(postId)
      }
      return s
    })
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

  async function submitPost(feed: 'general' | 'premium') {
    if (!content.trim()) return
    if (content.trim().length < 10) { toast.error('Post must be at least 10 characters'); return }
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not logged in'); setPosting(false); return }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      content: content.trim(),
      feed,
      asset: (feed === 'premium' && postAsset) ? postAsset : null,
      bias:  (feed === 'premium' && postBias)  ? postBias  : null,
      parent_id: null,
    })

    if (error) {
      toast.error('Could not post — ' + error.message)
    } else {
      toast.success('Posted!')
      setContent('')
      setPostAsset('')
      setPostBias('')
      await fetchPosts(feed)
    }
    setPosting(false)
  }

  async function submitReply(parentId: string) {
    if (!replyContent.trim() || replyContent.trim().length < 2) return
    setReplyPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setReplyPosting(false); return }

    const { error } = await supabase.from('community_posts').insert({
      user_id: user.id,
      content: replyContent.trim(),
      feed: 'general',
      parent_id: parentId,
    })

    if (error) {
      toast.error('Could not reply — ' + error.message)
    } else {
      toast.success('Reply posted!')
      setReplyContent('')
      setReplyingTo(null)
      await fetchReplies(parentId)
      setExpanded(prev => new Set(prev).add(parentId))
    }
    setReplyPosting(false)
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
        ? { ...p, likes_count: p.likes_count + (liked ? 1 : -1), user_liked: liked }
        : p)
      setGeneral(updater)
      setPremium(updater)
      // Also update in replies
      setReplies(prev => {
        const next = { ...prev }
        for (const key in next) {
          next[key] = next[key].map(r => r.id === post.id
            ? { ...r, likes_count: r.likes_count + (liked ? 1 : -1), user_liked: liked }
            : r)
        }
        return next
      })
    } catch {
      toast.error('Could not update like')
    }
    setLikingId(null)
  }

  async function deletePost(id: string, feed: 'general' | 'premium', parentId?: string | null) {
    const { error } = await supabase.from('community_posts').delete().eq('id', id)
    if (!error) {
      if (parentId) {
        setReplies(prev => ({ ...prev, [parentId]: (prev[parentId] || []).filter(r => r.id !== id) }))
      } else if (feed === 'general') {
        setGeneral(prev => prev.filter(p => p.id !== id))
      } else {
        setPremium(prev => prev.filter(p => p.id !== id))
      }
      toast.success('Deleted')
    }
  }

  // Render a single post card (used in both general and premium feeds)
  function PostCard({ post, showReplies = false }: { post: Post; showReplies?: boolean }) {
    const postReplies = replies[post.id] || []
    const isExpanded  = expanded.has(post.id)
    const isReplying  = replyingTo === post.id
    const loadingR    = loadingReplies.has(post.id)

    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] hover:border-[var(--border2)] transition-all overflow-hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--green)] to-[#16a34a] flex items-center justify-center text-[10px] font-extrabold text-black flex-shrink-0">
                {post.user_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[12px] font-bold">{post.user_name}</span>
                <span className="text-[9px] text-[#555] font-mono-tv ml-2">{timeAgo(post.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {post.asset && <span className="tag text-[8px]">{post.asset}</span>}
              {post.bias && (
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border
                  ${post.bias === 'BULLISH'
                    ? 'text-[var(--green)] border-[rgba(34,197,94,0.3)] bg-[var(--green-dim)]'
                    : 'text-[var(--red)] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)]'}`}>
                  {post.bias === 'BULLISH' ? '▲' : '▼'} {post.bias}
                </span>
              )}
              {post.user_id === profile?.id && (
                <button onClick={() => deletePost(post.id, post.feed, post.parent_id)}
                  className="text-[10px] text-[#444] hover:text-[var(--red)] transition-colors">✕</button>
              )}
            </div>
          </div>

          <p className="text-[12px] text-[#ccc] leading-relaxed mb-3">{post.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleLike(post)}
              disabled={likingId === post.id}
              className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-[6px] border transition-all
                ${post.user_liked
                  ? 'text-[var(--red)] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.15)]'
                  : 'text-[#555] border-[var(--border)] hover:text-[var(--red)] hover:border-[rgba(239,68,68,0.3)]'}`}>
              ♥ {post.likes_count}
            </button>

            {showReplies && (
              <button
                onClick={() => {
                  if (isReplying) { setReplyingTo(null) } else { setReplyingTo(post.id); setTimeout(() => replyRef.current?.focus(), 50) }
                  if (!isExpanded) toggleReplies(post.id)
                }}
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-[6px] border border-[var(--border)] text-[#555] hover:text-white transition-all">
                💬 Reply
              </button>
            )}

            {showReplies && postReplies.length === 0 && !isExpanded && (
              <span className="text-[9px] text-[#444] font-mono-tv">no replies yet</span>
            )}

            {showReplies && (postReplies.length > 0 || isExpanded) && (
              <button
                onClick={() => toggleReplies(post.id)}
                className="text-[10px] text-[#666] hover:text-[#999] transition-colors font-mono-tv">
                {loadingR ? '...' : isExpanded ? `▲ hide replies` : `▼ ${postReplies.length} ${postReplies.length === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>
        </div>

        {/* Reply input */}
        {showReplies && isReplying && (
          <div className="px-4 pb-3 bg-[var(--surface2)] border-t border-[var(--border)]">
            <div className="pt-3 flex gap-2 items-end">
              <textarea
                ref={replyRef}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Write a reply..."
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-2.5 text-[11px] text-white resize-none outline-none focus:border-[var(--green)] transition-colors placeholder:text-[#444]"
              />
              <div className="flex flex-col gap-1.5">
                <button onClick={() => submitReply(post.id)} disabled={replyPosting || replyContent.trim().length < 2}
                  className="btn-primary text-[11px] px-3 py-1.5 rounded-[7px] disabled:opacity-40">
                  {replyPosting ? '...' : 'Send'}
                </button>
                <button onClick={() => { setReplyingTo(null); setReplyContent('') }}
                  className="text-[10px] text-[#444] hover:text-white transition-colors text-center">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Replies list */}
        {showReplies && isExpanded && (
          <div className="border-t border-[var(--border)] bg-[var(--surface2)]">
            {loadingR && (
              <div className="px-5 py-3 text-[10px] text-[#555] font-mono-tv">Loading replies...</div>
            )}
            {!loadingR && postReplies.length === 0 && (
              <div className="px-5 py-3 text-[10px] text-[#444]">No replies yet. Be the first!</div>
            )}
            {postReplies.map(reply => (
              <div key={reply.id} className="px-5 py-3 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-[var(--surface3)] flex items-center justify-center text-[8px] font-bold text-[#aaa] flex-shrink-0">
                    {reply.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-semibold text-[#ccc]">{reply.user_name}</span>
                  <span className="text-[8px] text-[#444] font-mono-tv">{timeAgo(reply.created_at)}</span>
                  {reply.user_id === profile?.id && (
                    <button onClick={() => deletePost(reply.id, 'general', reply.parent_id)}
                      className="ml-auto text-[9px] text-[#333] hover:text-[var(--red)] transition-colors">✕</button>
                  )}
                </div>
                <p className="text-[11px] text-[#aaa] leading-relaxed pl-7">{reply.content}</p>
                <div className="pl-7 mt-1.5">
                  <button onClick={() => toggleLike(reply)} disabled={likingId === reply.id}
                    className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border transition-all
                      ${reply.user_liked
                        ? 'text-[var(--red)] border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)]'
                        : 'text-[#444] border-transparent hover:text-[var(--red)]'}`}>
                    ♥ {reply.likes_count}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-[900px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[20px] font-extrabold tracking-tight">Community</h2>
          <p className="text-[11px] text-[#777] mt-0.5">Connect with traders, share setups, and track top strategies</p>
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

      {/* DB setup banner */}
      {dbMissing && (
        <div className="bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-[12px] p-5 mb-6">
          <div className="text-[13px] font-bold text-[var(--amber)] mb-2">⚙️ Database setup required</div>
          <p className="text-[12px] text-[#aaa] mb-3 leading-relaxed">Run this SQL in Supabase → SQL Editor:</p>
          <pre className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] p-3 text-[10px] font-mono-tv text-[#aaa] overflow-x-auto whitespace-pre-wrap leading-relaxed">{SETUP_SQL}</pre>
          <button onClick={() => { setDbMissing(false); fetchPosts('general'); fetchPosts('premium') }}
            className="mt-3 btn-ghost-green text-[11px] px-3 py-2 rounded-lg">
            Done — try again
          </button>
        </div>
      )}

      {/* ── GENERAL TAB ── */}
      {tab === 'general' && !dbMissing && (
        <div className="space-y-4">
          <div className="bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] rounded-[10px] px-4 py-2.5 text-[11px] text-[#777]">
            💬 General chat — open to all traders. Share thoughts, ask questions, reply to others.
          </div>

          {/* Composer */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Start a discussion, ask a question, share a thought..."
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 text-[12px] text-white resize-none outline-none focus:border-[var(--green)] transition-colors placeholder:text-[#555]"
            />
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-[9px] text-[#555] font-mono-tv">{content.length}/500</span>
              <button onClick={() => submitPost('general')} disabled={posting || content.trim().length < 10}
                className="btn-primary text-[11px] px-4 py-1.5 rounded-[8px] disabled:opacity-40">
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>

          {/* Posts */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-4 animate-pulse h-[120px]" />
            ))
          ) : generalPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-[48px] opacity-20 mb-3">💬</div>
              <p className="text-[13px] text-[#777]">No posts yet. Start the conversation!</p>
            </div>
          ) : (
            generalPosts.map(post => <PostCard key={post.id} post={post} showReplies />)
          )}

          <button onClick={() => fetchPosts('general')} disabled={loading}
            className="w-full py-2 text-[11px] text-[#555] hover:text-[#777] transition-colors disabled:opacity-40">
            ↺ Refresh
          </button>
        </div>
      )}

      {/* ── PREMIUM TAB ── */}
      {tab === 'premium' && !dbMissing && (
        <div className="space-y-4">
          <div className="bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)] rounded-[10px] px-4 py-2.5 text-[11px] text-[#777]">
            ⭐ Premium feed — exclusive setups and signals from subscribed traders.
          </div>

          {/* Composer */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-4">
            {canPostPremium ? (
              <>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Share a trade setup, analysis, or signal..."
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-3 text-[12px] text-white resize-none outline-none focus:border-[var(--green)] transition-colors placeholder:text-[#555]"
                />
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <select value={postAsset} onChange={e => setPostAsset(e.target.value)}
                    className="tv-select w-auto text-[11px] px-2 py-1.5 rounded-[7px]">
                    <option value="">No asset</option>
                    {ASSET_TAGS.map(a => <option key={a}>{a}</option>)}
                  </select>
                  {(['','BULLISH','BEARISH'] as const).map(b => (
                    <button key={b} onClick={() => setPostBias(b)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all
                        ${postBias === b
                          ? b === 'BULLISH' ? 'bg-[var(--green-dim)] text-[var(--green)] border-[rgba(34,197,94,0.4)]'
                          : b === 'BEARISH' ? 'bg-[rgba(239,68,68,0.1)] text-[var(--red)] border-[rgba(239,68,68,0.4)]'
                          : 'bg-[var(--surface2)] text-white border-[var(--border2)]'
                          : 'border-[var(--border)] text-[#555] hover:text-white'}`}>
                      {b || 'No bias'}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-[9px] text-[#555] font-mono-tv">{content.length}/500</span>
                  <button onClick={() => submitPost('premium')} disabled={posting || content.trim().length < 10}
                    className="btn-primary text-[11px] px-4 py-1.5 rounded-[8px] disabled:opacity-40">
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="text-[13px] font-bold mb-1">🔒 Subscription required to post here</div>
                <p className="text-[11px] text-[#777]">Upgrade to Premium or above to share setups in the premium feed. You can still read, like, and post in General.</p>
              </div>
            )}
          </div>

          {/* Posts */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-4 animate-pulse h-[120px]" />
            ))
          ) : premiumPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-[48px] opacity-20 mb-3">⭐</div>
              <p className="text-[13px] text-[#777]">No premium setups yet. Share the first one!</p>
            </div>
          ) : (
            premiumPosts.map(post => <PostCard key={post.id} post={post} />)
          )}

          <button onClick={() => fetchPosts('premium')} disabled={loading}
            className="w-full py-2 text-[11px] text-[#555] hover:text-[#777] transition-colors disabled:opacity-40">
            ↺ Refresh
          </button>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {tab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
            <div className="text-[9px] font-mono-tv font-bold tracking-widest text-[#777] mb-4">
              🏆 TOP STRATEGIES BY WIN RATE (PLATFORM-WIDE)
            </div>

            {lbLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-[var(--surface2)] rounded-[8px] animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[36px] opacity-20 mb-2">🏆</div>
                <p className="text-[12px] text-[#777]">Not enough closed trades yet. Keep trading!</p>
                <p className="text-[10px] text-[#555] mt-1">Strategies need at least 3 closed trades to appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((row, i) => {
                  const wr = Number(row.win_rate)
                  const color = wr >= 65 ? 'var(--green)' : wr >= 50 ? 'var(--amber)' : 'var(--red)'
                  const medals = ['🥇','🥈','🥉']
                  return (
                    <div key={row.strategy}
                      className="flex items-center gap-3 bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-4 py-3">
                      <span className="text-[18px] w-7 text-center flex-shrink-0">
                        {medals[i] || `#${i + 1}`}
                      </span>
                      <div className="flex-1">
                        <div className="text-[12px] font-bold">{row.strategy}</div>
                        <div className="text-[9px] text-[#777] font-mono-tv">
                          {row.wins}W · {row.losses}L · {Number(row.wins) + Number(row.losses)} trades
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[18px] font-extrabold font-mono-tv" style={{ color }}>{wr}%</div>
                        <div className="text-[8px] text-[#555]">win rate</div>
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
            💡 Strategies need at least 3 closed trades across all platform users to appear here. Record your outcomes in the Journal tab to contribute to the rankings.
          </div>
        </div>
      )}
    </div>
  )
}
