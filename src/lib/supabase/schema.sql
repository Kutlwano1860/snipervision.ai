-- ─────────────────────────────────────────────
-- SniperVision AI — Supabase Schema
-- Paste this entire file into your Supabase SQL Editor and run it
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text,
  home_currency text default 'ZAR',
  default_trading_currency text default 'USD',
  account_type text default 'micro',
  account_balance numeric default 0,
  tier text default 'free',
  daily_analyses_used integer default 0,
  last_analysis_date date,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS on profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ── ANALYSES ──
create table public.analyses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  asset text,
  timeframe text,
  bias text,
  confidence integer,
  entry text,
  stop_loss text,
  tp1 text,
  tp2 text,
  tp3 text,
  rr1 text,
  rr2 text,
  rr3 text,
  risk_rating text,
  technical text,
  patterns text[],
  key_levels text,
  reasoning text,
  invalidation text,
  fundamental text,
  macro text,
  smc text,
  lot_conservative text,
  lot_moderate text,
  lot_scaled text,
  risk_cons text,
  risk_mod text,
  risk_scale text,
  profit_cons text,
  profit_mod text,
  profit_scale text,
  event_risk text,
  trading_currency text,
  home_currency text,
  account_type text,
  account_balance numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.analyses enable row level security;
create policy "Users can view own analyses" on public.analyses for select using (auth.uid() = user_id);
create policy "Users can insert own analyses" on public.analyses for insert with check (auth.uid() = user_id);
create policy "Users can delete own analyses" on public.analyses for delete using (auth.uid() = user_id);

-- ── JOURNAL ENTRIES ──
create table public.journal_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  analysis_id uuid references public.analyses(id) on delete set null,
  asset text not null,
  bias text,
  strategy text,
  entry_price text,
  exit_price text,
  pnl numeric,
  pnl_home_currency numeric,
  home_currency text,
  outcome text default 'live',
  taken_trade boolean default true,
  notes text,
  mode text default 'normal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.journal_entries enable row level security;
create policy "Users can manage own journal" on public.journal_entries for all using (auth.uid() = user_id);

-- ── WATCHLIST ──
create table public.watchlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  pair text not null,
  asset_class text default 'FOREX',
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, pair)
);

alter table public.watchlist enable row level security;
create policy "Users can manage own watchlist" on public.watchlist for all using (auth.uid() = user_id);

-- ── AUTO-CREATE PROFILE ON SIGNUP ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── CHALLENGE SESSIONS ──
create table if not exists public.challenge_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text default 'My Challenge',
  start_balance numeric not null,
  daily_target_pct numeric not null,
  total_days integer not null,
  current_day integer default 0,
  current_balance numeric,
  currency text default 'USD',
  risk_per_trade numeric,
  status text default 'active',
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.challenge_sessions enable row level security;
create policy "Users can manage own challenges" on public.challenge_sessions for all using (auth.uid() = user_id);

-- ── USER BADGES ──
create table if not exists public.user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;
create policy "Users can view own badges" on public.user_badges for select using (auth.uid() = user_id);
create policy "Users can insert own badges" on public.user_badges for insert with check (auth.uid() = user_id);

-- ── RESET DAILY ANALYSES (run via cron) ──
create or replace function public.reset_daily_analyses()
returns void as $$
begin
  update public.profiles
  set daily_analyses_used = 0
  where last_analysis_date < current_date;
end;
$$ language plpgsql security definer;
