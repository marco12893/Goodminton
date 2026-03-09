create extension if not exists "pgcrypto";

delete from auth.users;

drop view if exists public.club_player_leaderboard cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_club_admin(uuid) cascade;
drop function if exists public.is_club_member(uuid) cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists public.match_participants cascade;
drop table if exists public.elo_history cascade;
drop table if exists public.matches cascade;
drop table if exists public.club_join_requests cascade;
drop table if exists public.club_players cascade;
drop table if exists public.club_members cascade;
drop table if exists public.players cascade;
drop table if exists public.profiles cascade;
drop table if exists public.clubs cascade;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  join_mode text not null default 'invite_only' check (join_mode in ('open', 'approval', 'invite_only')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  gender text,
  birth_date date,
  handedness text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'player')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (club_id, user_id)
);

create table public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  unique (club_id, user_id)
);

create table public.club_players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at date,
  jersey_number text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  elo_initial integer not null default 1000,
  elo_current integer not null default 1000,
  total_matches integer not null default 0,
  total_wins integer not null default 0,
  total_losses integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (club_id, player_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  match_date date not null,
  played_at timestamptz not null default timezone('utc', now()),
  team1_score integer not null check (team1_score >= 0),
  team2_score integer not null check (team2_score >= 0),
  winning_team smallint generated always as (
    case
      when team1_score > team2_score then 1
      when team2_score > team1_score then 2
      else null
    end
  ) stored,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint matches_non_draw check (team1_score <> team2_score)
);

create table public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  club_player_id uuid not null references public.club_players(id) on delete cascade,
  team smallint not null check (team in (1, 2)),
  slot smallint not null check (slot in (1, 2)),
  points_scored integer not null default 0 check (points_scored >= 0),
  points_allowed integer not null default 0 check (points_allowed >= 0),
  elo_before integer not null default 0,
  elo_after integer not null default 0,
  elo_delta integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (match_id, club_player_id),
  unique (match_id, team, slot)
);

create table public.elo_history (
  id uuid primary key default gen_random_uuid(),
  club_player_id uuid not null references public.club_players(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  recorded_on timestamptz not null default timezone('utc', now()),
  elo_before integer not null,
  elo_after integer not null,
  elo_delta integer not null
);

create index idx_club_members_user_id on public.club_members(user_id);
create index idx_club_join_requests_club_id_status on public.club_join_requests(club_id, status);
create index idx_club_join_requests_user_id on public.club_join_requests(user_id);
create index idx_club_players_club_id on public.club_players(club_id);
create index idx_club_players_player_id on public.club_players(player_id);
create index idx_players_user_id on public.players(user_id);
create index idx_matches_club_id_match_date on public.matches(club_id, match_date desc);
create index idx_match_participants_match_id on public.match_participants(match_id);
create index idx_match_participants_club_player_id on public.match_participants(club_player_id);
create index idx_elo_history_club_player_id_recorded_on on public.elo_history(club_player_id, recorded_on desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_club_member(target_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.club_members cm
    where cm.club_id = target_club_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = timezone('utc', now());

  insert into public.players (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.process_match_approval(target_match_id uuid, reviewer_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k_factor constant numeric := 32;
  match_record public.matches%rowtype;
  participant_record record;
  team1_avg numeric;
  team2_avg numeric;
  team1_count integer;
  team2_count integer;
  expected_team1 numeric;
  team1_delta integer;
  team2_delta integer;
  winner_team smallint;
  player_delta integer;
  player_elo_before integer;
  player_elo_after integer;
begin
  select *
  into match_record
  from public.matches
  where id = target_match_id
  for update;

  if not found then
    raise exception 'Match not found.';
  end if;

  if match_record.status <> 'pending' then
    raise exception 'Only pending matches can be approved.';
  end if;

  select avg(cp.elo_current)::numeric, count(*)
  into team1_avg, team1_count
  from public.match_participants mp
  join public.club_players cp on cp.id = mp.club_player_id
  where mp.match_id = target_match_id
    and mp.team = 1;

  select avg(cp.elo_current)::numeric, count(*)
  into team2_avg, team2_count
  from public.match_participants mp
  join public.club_players cp on cp.id = mp.club_player_id
  where mp.match_id = target_match_id
    and mp.team = 2;

  if team1_count <> 2 or team2_count <> 2 then
    raise exception 'A doubles match must have exactly two players on each team.';
  end if;

  winner_team := case
    when match_record.team1_score > match_record.team2_score then 1
    else 2
  end;

  expected_team1 := 1 / (1 + power(10::numeric, (team2_avg - team1_avg) / 400));
  team1_delta := round(
    k_factor * (
      (case when winner_team = 1 then 1 else 0 end) - expected_team1
    )
  );
  team2_delta := -team1_delta;

  delete from public.elo_history
  where match_id = target_match_id;

  for participant_record in
    select
      mp.id as match_participant_id,
      mp.club_player_id,
      mp.team,
      cp.elo_current
    from public.match_participants mp
    join public.club_players cp on cp.id = mp.club_player_id
    where mp.match_id = target_match_id
    order by mp.team, mp.slot
  loop
    player_delta := case
      when participant_record.team = 1 then team1_delta
      else team2_delta
    end;
    player_elo_before := participant_record.elo_current;
    player_elo_after := participant_record.elo_current + player_delta;

    update public.match_participants
    set
      points_scored = case
        when participant_record.team = 1 then match_record.team1_score
        else match_record.team2_score
      end,
      points_allowed = case
        when participant_record.team = 1 then match_record.team2_score
        else match_record.team1_score
      end,
      elo_before = player_elo_before,
      elo_after = player_elo_after,
      elo_delta = player_delta
    where id = participant_record.match_participant_id;

    update public.club_players
    set
      elo_current = player_elo_after,
      total_matches = total_matches + 1,
      total_wins = total_wins + case when participant_record.team = winner_team then 1 else 0 end,
      total_losses = total_losses + case when participant_record.team = winner_team then 0 else 1 end
    where id = participant_record.club_player_id;

    insert into public.elo_history (
      club_player_id,
      match_id,
      recorded_on,
      elo_before,
      elo_after,
      elo_delta
    )
    values (
      participant_record.club_player_id,
      target_match_id,
      coalesce(match_record.played_at, timezone('utc', now())),
      player_elo_before,
      player_elo_after,
      player_delta
    );
  end loop;

  update public.matches
  set
    status = 'approved',
    reviewed_by = reviewer_user_id,
    reviewed_at = timezone('utc', now()),
    rejection_reason = null
  where id = target_match_id;
end;
$$;

create trigger set_clubs_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger set_club_players_updated_at
before update on public.club_players
for each row execute function public.set_updated_at();

create trigger set_club_join_requests_updated_at
before update on public.club_join_requests
for each row execute function public.set_updated_at();

create trigger set_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  updated_at = timezone('utc', now());

insert into public.players (user_id, full_name)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (user_id) do update
set
  full_name = excluded.full_name,
  updated_at = timezone('utc', now());

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
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.club_members enable row level security;
alter table public.club_join_requests enable row level security;
alter table public.club_players enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.elo_history enable row level security;

create policy "club members can read clubs"
on public.clubs
for select
using (public.is_club_member(id));

create policy "club admins can update clubs"
on public.clubs
for update
using (public.is_club_admin(id))
with check (public.is_club_admin(id));

create policy "users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

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
  or user_id = auth.uid()
);

create policy "authenticated users can insert players"
on public.players
for insert
with check (auth.uid() is not null);

create policy "users can update own player"
on public.players
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

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

create policy "members can read their memberships"
on public.club_members
for select
using (user_id = auth.uid() or public.is_club_admin(club_id));

create policy "club admins manage memberships"
on public.club_members
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

create policy "users can read own join requests"
on public.club_join_requests
for select
using (user_id = auth.uid());

create policy "users can create own join requests"
on public.club_join_requests
for insert
with check (user_id = auth.uid());

create policy "users can update own pending join requests"
on public.club_join_requests
for update
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid());

create policy "club admins manage join requests"
on public.club_join_requests
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

create policy "members can read club players"
on public.club_players
for select
using (public.is_club_member(club_id));

create policy "club admins manage club players"
on public.club_players
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

create policy "members can read matches"
on public.matches
for select
using (public.is_club_member(club_id));

create policy "club admins manage matches"
on public.matches
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));

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
grant select, update on public.profiles to authenticated;
