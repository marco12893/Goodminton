  create extension if not exists "pgcrypto";

  create table if not exists public.clubs (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    city text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
  );

  create table if not exists public.players (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    gender text,
    birth_date date,
    handedness text,
    avatar_url text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
  );

  create table if not exists public.club_members (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'player')),
    created_at timestamptz not null default timezone('utc', now()),
    unique (club_id, user_id)
  );

  create table if not exists public.club_players (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    player_id uuid not null references public.players(id) on delete cascade,
    joined_at date,
    jersey_number text,
    status text not null default 'active' check (status in ('active', 'inactive')),
    elo_initial integer not null default 1200,
    elo_current integer not null default 1200,
    total_matches integer not null default 0,
    total_wins integer not null default 0,
    total_losses integer not null default 0,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    unique (club_id, player_id)
  );

  create table if not exists public.matches (
    id uuid primary key default gen_random_uuid(),
    club_id uuid not null references public.clubs(id) on delete cascade,
    match_date date not null,
    team1_score integer not null check (team1_score >= 0),
    team2_score integer not null check (team2_score >= 0),
    winning_team smallint generated always as (
      case
        when team1_score > team2_score then 1
        when team2_score > team1_score then 2
        else null
      end
    ) stored,
    notes text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint matches_non_draw check (team1_score <> team2_score)
  );

  create table if not exists public.match_participants (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    club_player_id uuid not null references public.club_players(id) on delete cascade,
    team smallint not null check (team in (1, 2)),
    slot smallint not null check (slot in (1, 2)),
    points_scored integer not null default 0 check (points_scored >= 0),
    points_allowed integer not null default 0 check (points_allowed >= 0),
    elo_before integer not null,
    elo_after integer not null,
    elo_delta integer not null,
    created_at timestamptz not null default timezone('utc', now()),
    unique (match_id, club_player_id),
    unique (match_id, team, slot)
  );

  create table if not exists public.elo_history (
    id uuid primary key default gen_random_uuid(),
    club_player_id uuid not null references public.club_players(id) on delete cascade,
    match_id uuid references public.matches(id) on delete cascade,
    recorded_on timestamptz not null default timezone('utc', now()),
    elo_before integer not null,
    elo_after integer not null,
    elo_delta integer not null
  );

  create or replace function public.is_club_member(target_club_id uuid)
  returns boolean
  language sql
  stable
  as $$
    select exists (
      select 1
      from public.club_members cm
      where cm.club_id = target_club_id
        and cm.user_id = auth.uid()
    );
  $$;

  create or replace function public.is_club_admin(target_club_id uuid)
  returns boolean
  language sql
  stable
  as $$
    select exists (
      select 1
      from public.club_members cm
      where cm.club_id = target_club_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    );
  $$;

  create index if not exists idx_club_members_user_id on public.club_members(user_id);
  create index if not exists idx_club_players_club_id on public.club_players(club_id);
  create index if not exists idx_club_players_player_id on public.club_players(player_id);
  create index if not exists idx_matches_club_id_match_date on public.matches(club_id, match_date desc);
  create index if not exists idx_match_participants_match_id on public.match_participants(match_id);
  create index if not exists idx_match_participants_club_player_id on public.match_participants(club_player_id);
  create index if not exists idx_elo_history_club_player_id_recorded_on on public.elo_history(club_player_id, recorded_on desc);

  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = timezone('utc', now());
    return new;
  end;
  $$;

  drop trigger if exists set_clubs_updated_at on public.clubs;
  create trigger set_clubs_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

  drop trigger if exists set_players_updated_at on public.players;
  create trigger set_players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

  drop trigger if exists set_club_players_updated_at on public.club_players;
  create trigger set_club_players_updated_at
  before update on public.club_players
  for each row execute function public.set_updated_at();

  drop trigger if exists set_matches_updated_at on public.matches;
  create trigger set_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

  create or replace view public.club_player_leaderboard as
  select
    cp.id as club_player_id,
    cp.club_id,
    cp.player_id,
    p.full_name,
    cp.elo_current,
    cp.total_matches,
    cp.total_wins,
    cp.total_losses,
    case
      when cp.total_matches = 0 then 0
      else round((cp.total_wins::numeric / cp.total_matches::numeric) * 100, 2)
    end as win_rate
  from public.club_players cp
  join public.players p on p.id = cp.player_id;

  alter table public.clubs enable row level security;
  alter table public.players enable row level security;
  alter table public.club_members enable row level security;
  alter table public.club_players enable row level security;
  alter table public.matches enable row level security;
  alter table public.match_participants enable row level security;
  alter table public.elo_history enable row level security;

  drop policy if exists "club members can read clubs" on public.clubs;
  create policy "club members can read clubs"
  on public.clubs
  for select
  using (public.is_club_member(id));

  drop policy if exists "club admins can update clubs" on public.clubs;
  create policy "club admins can update clubs"
  on public.clubs
  for update
  using (public.is_club_admin(id))
  with check (public.is_club_admin(id));

  drop policy if exists "club members can read players in their clubs" on public.players;
  create policy "club members can read players in their clubs"
  on public.players
  for select
  using (
    exists (
      select 1
      from public.club_players cp
      where cp.player_id = players.id
        and public.is_club_member(cp.club_id)
    )
  );

  drop policy if exists "club admins can insert players" on public.players;
  create policy "club admins can insert players"
  on public.players
  for insert
  with check (auth.uid() is not null);

  drop policy if exists "club admins can update players in their clubs" on public.players;
  create policy "club admins can update players in their clubs"
  on public.players
  for update
  using (
    exists (
      select 1
      from public.club_players cp
      where cp.player_id = players.id
        and public.is_club_admin(cp.club_id)
    )
  )
  with check (
    exists (
      select 1
      from public.club_players cp
      where cp.player_id = players.id
        and public.is_club_admin(cp.club_id)
    )
  );

  drop policy if exists "members can read their memberships" on public.club_members;
  create policy "members can read their memberships"
  on public.club_members
  for select
  using (public.is_club_member(club_id));

  drop policy if exists "club admins manage memberships" on public.club_members;
  create policy "club admins manage memberships"
  on public.club_members
  for all
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

  drop policy if exists "members can read club players" on public.club_players;
  create policy "members can read club players"
  on public.club_players
  for select
  using (public.is_club_member(club_id));

  drop policy if exists "club admins manage club players" on public.club_players;
  create policy "club admins manage club players"
  on public.club_players
  for all
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

  drop policy if exists "members can read matches" on public.matches;
  create policy "members can read matches"
  on public.matches
  for select
  using (public.is_club_member(club_id));

  drop policy if exists "club admins manage matches" on public.matches;
  create policy "club admins manage matches"
  on public.matches
  for all
  using (public.is_club_admin(club_id))
  with check (public.is_club_admin(club_id));

  drop policy if exists "members can read participants" on public.match_participants;
  create policy "members can read participants"
  on public.match_participants
  for select
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_participants.match_id
        and public.is_club_member(m.club_id)
    )
  );

  drop policy if exists "club admins manage participants" on public.match_participants;
  create policy "club admins manage participants"
  on public.match_participants
  for all
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_participants.match_id
        and public.is_club_admin(m.club_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_participants.match_id
        and public.is_club_admin(m.club_id)
    )
  );

  drop policy if exists "members can read elo history" on public.elo_history;
  create policy "members can read elo history"
  on public.elo_history
  for select
  using (
    exists (
      select 1
      from public.club_players cp
      where cp.id = elo_history.club_player_id
        and public.is_club_member(cp.club_id)
    )
  );

  drop policy if exists "club admins manage elo history" on public.elo_history;
  create policy "club admins manage elo history"
  on public.elo_history
  for all
  using (
    exists (
      select 1
      from public.club_players cp
      where cp.id = elo_history.club_player_id
        and public.is_club_admin(cp.club_id)
    )
  )
  with check (
    exists (
      select 1
      from public.club_players cp
      where cp.id = elo_history.club_player_id
        and public.is_club_admin(cp.club_id)
    )
  );

  grant select on public.club_player_leaderboard to authenticated;
