alter table public.matches
add column if not exists played_at timestamptz,
add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
add column if not exists reviewed_at timestamptz,
add column if not exists rejection_reason text;

update public.matches
set played_at = coalesce(
  played_at,
  (match_date::timestamp at time zone 'utc')
)
where played_at is null;

alter table public.matches
alter column played_at set not null;

alter table public.match_participants
alter column elo_before set default 0,
alter column elo_after set default 0,
alter column elo_delta set default 0;
