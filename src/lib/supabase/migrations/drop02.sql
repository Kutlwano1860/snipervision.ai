-- Drop 02 Migration — Run this in Supabase SQL Editor for existing deployments

-- 1. Add mode column to journal_entries (only if the table exists)
do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'journal_entries'
  ) then
    alter table public.journal_entries
      add column if not exists mode text default 'normal';
  end if;
end $$;

-- 2. Challenge sessions table
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

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'challenge_sessions' and policyname = 'Users can manage own challenges'
  ) then
    create policy "Users can manage own challenges" on public.challenge_sessions for all using (auth.uid() = user_id);
  end if;
end $$;

-- 3. User badges table
create table if not exists public.user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, badge_id)
);

alter table public.user_badges enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'user_badges' and policyname = 'Users can view own badges'
  ) then
    create policy "Users can view own badges" on public.user_badges for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'user_badges' and policyname = 'Users can insert own badges'
  ) then
    create policy "Users can insert own badges" on public.user_badges for insert with check (auth.uid() = user_id);
  end if;
end $$;
