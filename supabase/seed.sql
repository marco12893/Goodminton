insert into public.clubs (id, name, slug, city)
values
  ('11111111-1111-1111-1111-111111111111', 'Infor Gacor', 'infor-gacor', 'GOR Surabaya'),
  ('22222222-2222-2222-2222-222222222222', 'UKM Badminton', 'ukm-badminton', 'GOR Talenta'),
  ('33333333-3333-3333-3333-333333333333', 'Badminton Club RKT', 'badminton-club-rkt', 'MERR Arena')
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  city = excluded.city;

insert into public.players (id, full_name, gender, handedness)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Raka Pratama', 'M', 'right'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Dimas Arta', 'M', 'left'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Fikri Mahesa', 'M', 'right'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Bagas Saputra', 'M', 'right'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Nino Prakoso', 'M', 'right'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'Alif Ramadhan', 'M', 'left')
on conflict (id) do update
set
  full_name = excluded.full_name,
  gender = excluded.gender,
  handedness = excluded.handedness;

insert into public.club_players (
  id,
  club_id,
  player_id,
  joined_at,
  jersey_number,
  status,
  elo_initial,
  elo_current,
  total_matches,
  total_wins,
  total_losses
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '2026-01-10',
    '07',
    'active',
    1200,
    1264,
    8,
    6,
    2
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '2026-01-10',
    '11',
    'active',
    1200,
    1241,
    8,
    5,
    3
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '2026-01-11',
    '03',
    'active',
    1200,
    1182,
    8,
    3,
    5
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '2026-01-11',
    '09',
    'active',
    1200,
    1173,
    8,
    2,
    6
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    '2026-01-15',
    '21',
    'active',
    1200,
    1289,
    11,
    8,
    3
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    '2026-01-17',
    '08',
    'active',
    1200,
    1236,
    9,
    5,
    4
  )
on conflict (id) do update
set
  club_id = excluded.club_id,
  player_id = excluded.player_id,
  joined_at = excluded.joined_at,
  jersey_number = excluded.jersey_number,
  status = excluded.status,
  elo_initial = excluded.elo_initial,
  elo_current = excluded.elo_current,
  total_matches = excluded.total_matches,
  total_wins = excluded.total_wins,
  total_losses = excluded.total_losses;

insert into public.matches (
  id,
  club_id,
  match_date,
  team1_score,
  team2_score,
  notes
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '11111111-1111-1111-1111-111111111111',
    '2026-03-01',
    21,
    17,
    'Match sparring internal klub'
  )
on conflict (id) do update
set
  club_id = excluded.club_id,
  match_date = excluded.match_date,
  team1_score = excluded.team1_score,
  team2_score = excluded.team2_score,
  notes = excluded.notes;

insert into public.match_participants (
  id,
  match_id,
  club_player_id,
  team,
  slot,
  points_scored,
  points_allowed,
  elo_before,
  elo_after,
  elo_delta
)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    1,
    1,
    21,
    17,
    1248,
    1264,
    16
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    1,
    2,
    21,
    17,
    1226,
    1241,
    15
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd3',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    2,
    1,
    17,
    21,
    1193,
    1182,
    -11
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd4',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    2,
    2,
    17,
    21,
    1184,
    1173,
    -11
  )
on conflict (id) do update
set
  match_id = excluded.match_id,
  club_player_id = excluded.club_player_id,
  team = excluded.team,
  slot = excluded.slot,
  points_scored = excluded.points_scored,
  points_allowed = excluded.points_allowed,
  elo_before = excluded.elo_before,
  elo_after = excluded.elo_after,
  elo_delta = excluded.elo_delta;

insert into public.elo_history (
  id,
  club_player_id,
  match_id,
  recorded_on,
  elo_before,
  elo_after,
  elo_delta
)
values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '2026-03-01T20:00:00+07:00',
    1248,
    1264,
    16
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '2026-03-01T20:00:00+07:00',
    1226,
    1241,
    15
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '2026-03-01T20:00:00+07:00',
    1193,
    1182,
    -11
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    '2026-03-01T20:00:00+07:00',
    1184,
    1173,
    -11
  )
on conflict (id) do update
set
  club_player_id = excluded.club_player_id,
  match_id = excluded.match_id,
  recorded_on = excluded.recorded_on,
  elo_before = excluded.elo_before,
  elo_after = excluded.elo_after,
  elo_delta = excluded.elo_delta;

-- Untuk cloud seeding penuh, pakai scripts/seed-cloud.mjs.
-- Script tersebut juga membuat user demo:
-- kent@goodminton.app / Kent12345!
-- lalu membuat profile + player account yang terhubung ke auth user,
-- dan menghubungkannya ke tiga klub di atas.
