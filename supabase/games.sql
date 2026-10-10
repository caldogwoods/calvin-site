-- Game reviews table and access rules.
-- Run this once in the Supabase SQL editor.

-- Accounts that may edit or delete games. Adding games is open to
-- everyone (the form is public), but changing them is not.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.site_admins enable row level security;

-- Needed so the admin checks below can see the current user's row
create policy "Users can read their own admin row"
  on public.site_admins for select
  using (user_id = auth.uid());

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null,
  developer text,
  release_date date,
  played_start date,
  played_end date,
  score numeric(3, 1) check (score >= 0 and score <= 10),
  image_url text,
  review text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid(),
  constraint played_range check (played_end is null or played_start is null or played_end >= played_start)
);

alter table public.games enable row level security;

create policy "Anyone can read games"
  on public.games for select
  using (true);

-- The add form at #/media-reviews/new is public, so anyone can insert
create policy "Anyone can insert games"
  on public.games for insert
  with check (true);

create policy "Admins can update games"
  on public.games for update
  using (exists (select 1 from public.site_admins where user_id = auth.uid()));

create policy "Admins can delete games"
  on public.games for delete
  using (exists (select 1 from public.site_admins where user_id = auth.uid()));

-- To edit or delete games from the site later, make your account an admin. Find your user id in
-- Authentication > Users, and run:
--   insert into public.site_admins (user_id) values ('<your-user-id>');
