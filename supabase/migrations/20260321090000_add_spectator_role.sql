-- Add spectator role support and join request role tracking

alter table public.club_members
  drop constraint if exists club_members_role_check;

alter table public.club_members
  add constraint club_members_role_check
  check (role in ('owner', 'admin', 'player', 'spectator'));

alter table public.club_join_requests
  add column if not exists requested_role text not null default 'player';

alter table public.club_join_requests
  drop constraint if exists club_join_requests_requested_role_check;

alter table public.club_join_requests
  add constraint club_join_requests_requested_role_check
  check (requested_role in ('player', 'spectator'));

create or replace function public.can_manage_club_member_row(target_club_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_club_owner(target_club_id) then target_role <> 'owner'
    when public.is_club_admin_only(target_club_id) then target_role in ('player', 'spectator')
    else false
  end;
$$;

create or replace function public.can_assign_club_member_role(target_club_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_club_admin(target_club_id)
    and target_role in ('player', 'admin', 'spectator');
$$;

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
join public.players p on p.id = cp.player_id
left join public.club_members cm
  on cm.user_id = p.user_id
 and cm.club_id = cp.club_id
where coalesce(cm.role, 'player') <> 'spectator';
