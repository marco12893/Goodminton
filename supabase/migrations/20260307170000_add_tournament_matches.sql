create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  seed_number integer,
  display_name text not null,
  average_elo integer,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tournament_id, seed_number)
);

create table if not exists public.tournament_entry_players (
  id uuid primary key default gen_random_uuid(),
  tournament_entry_id uuid not null references public.tournament_entries(id) on delete cascade,
  club_player_id uuid not null references public.club_players(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tournament_entry_id, club_player_id)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage text not null check (stage in ('round_robin', 'knockout', 'third_place')),
  round_number integer not null check (round_number > 0),
  match_number integer not null check (match_number > 0),
  scheduled_at timestamptz not null,
  entry1_id uuid references public.tournament_entries(id) on delete set null,
  entry2_id uuid references public.tournament_entries(id) on delete set null,
  score1 integer check (score1 is null or score1 >= 0),
  score2 integer check (score2 is null or score2 >= 0),
  winner_entry_id uuid references public.tournament_entries(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  next_match_id uuid references public.tournament_matches(id) on delete set null,
  next_slot smallint check (next_slot in (1, 2)),
  loser_next_match_id uuid references public.tournament_matches(id) on delete set null,
  loser_next_slot smallint check (loser_next_slot in (1, 2)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_scores_non_draw check (
    status <> 'completed' or (score1 is not null and score2 is not null and score1 <> score2)
  )
);

create index if not exists idx_tournament_entries_tournament_id
on public.tournament_entries(tournament_id, seed_number);

create index if not exists idx_tournament_entry_players_entry_id
on public.tournament_entry_players(tournament_entry_id);

create index if not exists idx_tournament_entry_players_club_player_id
on public.tournament_entry_players(club_player_id);

create index if not exists idx_tournament_matches_tournament_id
on public.tournament_matches(tournament_id, stage, round_number, match_number);

drop trigger if exists set_tournament_matches_updated_at on public.tournament_matches;
create trigger set_tournament_matches_updated_at
before update on public.tournament_matches
for each row execute function public.set_updated_at();

alter table public.tournament_entries enable row level security;
alter table public.tournament_entry_players enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists "members can read tournament entries" on public.tournament_entries;
create policy "members can read tournament entries"
on public.tournament_entries
for select
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_entries.tournament_id
      and public.is_club_member(t.club_id)
  )
);

drop policy if exists "club admins manage tournament entries" on public.tournament_entries;
create policy "club admins manage tournament entries"
on public.tournament_entries
for all
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_entries.tournament_id
      and public.is_club_admin(t.club_id)
  )
)
with check (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_entries.tournament_id
      and public.is_club_admin(t.club_id)
  )
);

drop policy if exists "members can read tournament entry players" on public.tournament_entry_players;
create policy "members can read tournament entry players"
on public.tournament_entry_players
for select
using (
  exists (
    select 1
    from public.tournament_entries te
    join public.tournaments t on t.id = te.tournament_id
    where te.id = tournament_entry_players.tournament_entry_id
      and public.is_club_member(t.club_id)
  )
);

drop policy if exists "club admins manage tournament entry players" on public.tournament_entry_players;
create policy "club admins manage tournament entry players"
on public.tournament_entry_players
for all
using (
  exists (
    select 1
    from public.tournament_entries te
    join public.tournaments t on t.id = te.tournament_id
    where te.id = tournament_entry_players.tournament_entry_id
      and public.is_club_admin(t.club_id)
  )
)
with check (
  exists (
    select 1
    from public.tournament_entries te
    join public.tournaments t on t.id = te.tournament_id
    where te.id = tournament_entry_players.tournament_entry_id
      and public.is_club_admin(t.club_id)
  )
);

drop policy if exists "members can read tournament matches" on public.tournament_matches;
create policy "members can read tournament matches"
on public.tournament_matches
for select
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_matches.tournament_id
      and public.is_club_member(t.club_id)
  )
);

drop policy if exists "club admins manage tournament matches" on public.tournament_matches;
create policy "club admins manage tournament matches"
on public.tournament_matches
for all
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_matches.tournament_id
      and public.is_club_admin(t.club_id)
  )
)
with check (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_matches.tournament_id
      and public.is_club_admin(t.club_id)
  )
);
