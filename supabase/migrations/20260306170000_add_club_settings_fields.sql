alter table public.clubs
add column if not exists location text,
add column if not exists play_schedule text,
add column if not exists description text,
add column if not exists image_url text;
