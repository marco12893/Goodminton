alter table public.clubs
add column if not exists join_mode text not null default 'invite_only'
check (join_mode in ('open', 'approval', 'invite_only'));

create table if not exists public.club_join_requests (
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

create index if not exists idx_club_join_requests_club_id_status
on public.club_join_requests(club_id, status);

create index if not exists idx_club_join_requests_user_id
on public.club_join_requests(user_id);

drop trigger if exists set_club_join_requests_updated_at on public.club_join_requests;
create trigger set_club_join_requests_updated_at
before update on public.club_join_requests
for each row execute function public.set_updated_at();

alter table public.club_join_requests enable row level security;

drop policy if exists "users can read own join requests" on public.club_join_requests;
create policy "users can read own join requests"
on public.club_join_requests
for select
using (user_id = auth.uid());

drop policy if exists "users can create own join requests" on public.club_join_requests;
create policy "users can create own join requests"
on public.club_join_requests
for insert
with check (user_id = auth.uid());

drop policy if exists "users can update own pending join requests" on public.club_join_requests;
create policy "users can update own pending join requests"
on public.club_join_requests
for update
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid());

drop policy if exists "club admins manage join requests" on public.club_join_requests;
create policy "club admins manage join requests"
on public.club_join_requests
for all
using (public.is_club_admin(club_id))
with check (public.is_club_admin(club_id));
