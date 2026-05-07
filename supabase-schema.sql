-- FinanceMe Cloud Sync Schema
-- Run this in your Supabase dashboard: SQL Editor → New query → paste → Run

-- Table to store all Zustand store blobs per user
create table if not exists user_store_data (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  store_name   text not null,
  data         jsonb not null default '{}',
  updated_at   timestamptz default now() not null,
  unique (user_id, store_name)
);

-- Auto-update updated_at on upsert
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_store_data_updated_at
  before update on user_store_data
  for each row execute function update_updated_at();

-- Row Level Security: users can only see/modify their own data
alter table user_store_data enable row level security;

create policy "Users manage their own store data"
  on user_store_data
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
