-- ============================================================
-- GroveChat — Complete Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  full_name    text,
  avatar_url   text,
  bio          text,
  is_online    boolean not null default false,
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. CONVERSATIONS ─────────────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 3. CONVERSATION PARTICIPANTS ────────────────────────────
create table if not exists public.conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  unique (conversation_id, user_id)
);

-- ── 4. MESSAGES ─────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null check (char_length(content) between 1 and 2000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- Index for fast message fetching
create index if not exists messages_conversation_id_created_at
  on public.messages (conversation_id, created_at asc);

-- ── 5. ROW LEVEL SECURITY ────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.conversations          enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages               enable row level security;

-- Profiles: anyone can read; only owner can update
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Conversations: only participants can see
create policy "conversations_select" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() is not null);

create policy "conversations_update" on public.conversations
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- Participants: only involved users can see/insert
create policy "participants_select" on public.conversation_participants
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()
    )
  );

create policy "participants_insert" on public.conversation_participants
  for insert with check (auth.uid() is not null);

-- Messages: only conversation participants can read/write
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_update" on public.messages
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ── 6. REALTIME ──────────────────────────────────────────────
-- Enable realtime on messages table
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.profiles;

-- ── 7. STORAGE ───────────────────────────────────────────────
-- Create avatars bucket (run in SQL editor)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 8. ONLINE STATUS FUNCTION ───────────────────────────────
-- Call this from client to update online status
create or replace function public.set_user_online(online boolean)
returns void language plpgsql security definer
as $$
begin
  update public.profiles
  set is_online = online,
      last_seen = case when not online then now() else last_seen end,
      updated_at = now()
  where id = auth.uid();
end;
$$;
