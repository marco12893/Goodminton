create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  scheduled_at timestamptz not null,
  format text not null check (format in ('round_robin', 'knockout')),
  category text not null check (category in ('singles', 'doubles')),
  seeding text not null check (seeding in ('random', 'elo_based')),
  status text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed')),
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  club_player_id uuid not null references public.club_players(id) on delete cascade,
  seed_number integer,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tournament_id, club_player_id)
);

create index if not exists idx_tournaments_club_id_scheduled_at
on public.tournaments(club_id, scheduled_at desc);

create index if not exists idx_tournament_players_tournament_id
on public.tournament_players(tournament_id);

create index if not exists idx_tournament_players_club_player_id
on public.tournament_players(club_player_id);

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;

drop policy if exists "members can read tournaments" on public.tournaments;
create policy "members can read tournaments"
on public.tournaments
for select
using (public.is_club_member(club_id));

drop policy if exists "club admins manage tournaments" on public.tournaments;
create policy "club admins manage tournaments"
on public.tournaments
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

drop policy if exists "members can read tournament players" on public.tournament_players;
create policy "members can read tournament players"
on public.tournament_players
for select
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_players.tournament_id
      and public.is_club_member(t.club_id)
  )
);

drop policy if exists "club admins manage tournament players" on public.tournament_players;
create policy "club admins manage tournament players"
on public.tournament_players
for all
using (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_players.tournament_id
      and public.is_club_admin(t.club_id)
  )
)
with check (
  exists (
    select 1
    from public.tournaments t
    where t.id = tournament_players.tournament_id
      and public.is_club_admin(t.club_id)
  )
);
