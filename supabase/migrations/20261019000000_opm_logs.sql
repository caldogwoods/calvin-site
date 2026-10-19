-- Daily One Punch Man workout log for the Exercise Tracker.
-- Run once in the Supabase SQL editor (or with `supabase db push`).
--
-- Each row is one chunk the user logged, for example 25 push-ups. The page adds
-- up the rows of a day. `amount` is in the exercise's unit: reps, except plank
-- (seconds) and cardio (minutes). See src/exercise/onePunchMan.js.

create table if not exists public.opm_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise text not null check (exercise in ('pushups', 'situps', 'plank', 'squats', 'cardio')),
  amount integer not null check (amount > 0),
  log_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists opm_logs_user_date on public.opm_logs (user_id, log_date);

alter table public.opm_logs enable row level security;

create policy "Users read their own OPM logs"
  on public.opm_logs for select
  using (auth.uid() = user_id);

create policy "Users add their own OPM logs"
  on public.opm_logs for insert
  with check (auth.uid() = user_id);

create policy "Users delete their own OPM logs"
  on public.opm_logs for delete
  using (auth.uid() = user_id);
