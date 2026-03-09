alter table public.club_members
drop constraint if exists club_members_role_check;

alter table public.club_members
add constraint club_members_role_check
check (role in ('owner', 'admin', 'player'));

with ranked_members as (
  select
    id,
    row_number() over (
      partition by club_id
      order by
        case when role = 'admin' then 0 else 1 end,
        created_at asc,
        id asc
    ) as rank_in_club
  from public.club_members
)
update public.club_members cm
set role = 'owner'
from ranked_members rm
where cm.id = rm.id
  and rm.rank_in_club = 1
  and cm.role <> 'owner';

create unique index if not exists idx_club_members_single_owner
on public.club_members(club_id)
where role = 'owner';

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
      and cm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_club_owner(target_club_id uuid)
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
      and cm.role = 'owner'
  );
$$;

create or replace function public.transfer_club_ownership(
  target_club_id uuid,
  current_owner_user_id uuid,
  new_owner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_owner_user_id = new_owner_user_id then
    raise exception 'Ownership is already assigned to this user.';
  end if;

  if not exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = current_owner_user_id
      and role = 'owner'
  ) then
    raise exception 'Current owner was not found.';
  end if;

  if not exists (
    select 1
    from public.club_members
    where club_id = target_club_id
      and user_id = new_owner_user_id
  ) then
    raise exception 'New owner must already be a club member.';
  end if;

  update public.club_members
  set role = 'admin'
  where club_id = target_club_id
    and user_id = current_owner_user_id
    and role = 'owner';

  update public.club_members
  set role = 'owner'
  where club_id = target_club_id
    and user_id = new_owner_user_id;
end;
$$;
