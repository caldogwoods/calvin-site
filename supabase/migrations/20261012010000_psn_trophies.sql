-- Cached trophy lists for the Play History trophy view, one row per user and game.
-- Run once in the Supabase SQL editor (after 20261012000000_psn_links.sql).
--
-- The `psn` edge function fills a row the first time a user opens a game, and
-- replaces it only when they click Refresh. `game` is null when the game has no
-- trophy list. Row level security is on with no policies, so only the edge
-- function (service role) can read or write it.

create table if not exists public.psn_trophies (
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id text not null,
  game jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

alter table public.psn_trophies enable row level security;
