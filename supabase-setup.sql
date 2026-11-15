-- 英语拼读复习助手：云端同步初始化（只需执行一次）
create table if not exists public.learning_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.learning_sync enable row level security;
revoke all on table public.learning_sync from anon;
grant select, insert, update on table public.learning_sync to authenticated;
drop policy if exists "own learning data only" on public.learning_sync;
create policy "own learning data only"
on public.learning_sync for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
