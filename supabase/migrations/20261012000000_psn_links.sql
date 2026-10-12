-- Linked PlayStation accounts for the Play History page.
-- Run once in the Supabase SQL editor (or with `supabase db push`).
--
-- Each row holds one site user's PSN NPSSO token, encrypted by the `psn` edge
-- function (AES-GCM, key in the PSN_TOKEN_KEY function secret), plus a cached
-- copy of their game list. Row level security is on with no policies, so the
-- browser can never read or write this table; only the edge function can,
-- through the service role key.

create table if not exists public.psn_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  npsso_encrypted text not null,
  status text not null default 'ok' check (status in ('ok', 'expired')),
  linked_at timestamptz not null default now(),
  games jsonb,
  games_updated_at timestamptz
);

alter table public.psn_links enable row level security;
