create or replace function public.is_club_admin_only(target_club_id uuid)
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

create or replace function public.can_manage_club_member_row(target_club_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_club_owner(target_club_id) then target_role <> 'owner'
    when public.is_club_admin_only(target_club_id) then target_role = 'player'
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
    and target_role in ('player', 'admin');
$$;

create or replace function public.can_manage_club_player_row(target_club_id uuid, target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with target_membership as (
    select cm.role
    from public.players p
    join public.club_members cm
      on cm.user_id = p.user_id
     and cm.club_id = target_club_id
    where p.id = target_player_id
    limit 1
  )
  select case
    when public.is_club_owner(target_club_id) then coalesce((select role <> 'owner' from target_membership), true)
    when public.is_club_admin_only(target_club_id) then coalesce((select role = 'player' from target_membership), true)
    else false
  end;
$$;

drop policy if exists "club admins manage memberships" on public.club_members;
drop policy if exists "club managers can insert memberships" on public.club_members;
drop policy if exists "club managers can update memberships" on public.club_members;
drop policy if exists "club managers can delete memberships" on public.club_members;

create policy "club managers can insert memberships"
on public.club_members
for insert
with check (public.can_assign_club_member_role(club_id, role));

create policy "club managers can update memberships"
on public.club_members
for update
using (public.can_manage_club_member_row(club_id, role))
with check (public.can_assign_club_member_role(club_id, role));

create policy "club managers can delete memberships"
on public.club_members
for delete
using (public.can_manage_club_member_row(club_id, role));

drop policy if exists "club admins manage club players" on public.club_players;
drop policy if exists "club managers can insert club players" on public.club_players;
drop policy if exists "club managers can update club players" on public.club_players;
drop policy if exists "club managers can delete club players" on public.club_players;

create policy "club managers can insert club players"
on public.club_players
for insert
with check (public.is_club_admin(club_id));

create policy "club managers can update club players"
on public.club_players
for update
using (public.can_manage_club_player_row(club_id, player_id))
with check (public.can_manage_club_player_row(club_id, player_id));

create policy "club managers can delete club players"
on public.club_players
for delete
using (public.can_manage_club_player_row(club_id, player_id));
