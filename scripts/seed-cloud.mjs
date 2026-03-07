import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex);
    const value = trimmed.slice(equalIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const clubs = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Infor Gacor",
    slug: "infor-gacor",
    city: "GOR Surabaya",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "UKM Badminton",
    slug: "ukm-badminton",
    city: "GOR Talenta",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Badminton Club RKT",
    slug: "badminton-club-rkt",
    city: "MERR Arena",
  },
];

const players = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", full_name: "Raka Pratama", gender: "M", handedness: "right" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2", full_name: "Dimas Arta", gender: "M", handedness: "left" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3", full_name: "Fikri Mahesa", gender: "M", handedness: "right" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4", full_name: "Bagas Saputra", gender: "M", handedness: "right" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5", full_name: "Nino Prakoso", gender: "M", handedness: "right" },
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6", full_name: "Alif Ramadhan", gender: "M", handedness: "left" },
];

const clubPlayers = [
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1", club_id: clubs[0].id, player_id: players[0].id, joined_at: "2026-01-10", jersey_number: "07", status: "active", elo_initial: 1000, elo_current: 1264, total_matches: 8, total_wins: 6, total_losses: 2 },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", club_id: clubs[0].id, player_id: players[1].id, joined_at: "2026-01-10", jersey_number: "11", status: "active", elo_initial: 1000, elo_current: 1241, total_matches: 8, total_wins: 5, total_losses: 3 },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3", club_id: clubs[0].id, player_id: players[2].id, joined_at: "2026-01-11", jersey_number: "03", status: "active", elo_initial: 1000, elo_current: 1182, total_matches: 8, total_wins: 3, total_losses: 5 },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4", club_id: clubs[0].id, player_id: players[3].id, joined_at: "2026-01-11", jersey_number: "09", status: "active", elo_initial: 1000, elo_current: 1173, total_matches: 8, total_wins: 2, total_losses: 6 },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5", club_id: clubs[1].id, player_id: players[4].id, joined_at: "2026-01-15", jersey_number: "21", status: "active", elo_initial: 1000, elo_current: 1289, total_matches: 11, total_wins: 8, total_losses: 3 },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6", club_id: clubs[2].id, player_id: players[5].id, joined_at: "2026-01-17", jersey_number: "08", status: "active", elo_initial: 1000, elo_current: 1236, total_matches: 9, total_wins: 5, total_losses: 4 },
];

const matches = [
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    club_id: clubs[0].id,
    match_date: "2026-03-01",
    team1_score: 21,
    team2_score: 17,
    notes: "Match sparring internal klub",
  },
];

const matchParticipants = [
  { id: "dddddddd-dddd-dddd-dddd-ddddddddddd1", match_id: matches[0].id, club_player_id: clubPlayers[0].id, team: 1, slot: 1, points_scored: 21, points_allowed: 17, elo_before: 1248, elo_after: 1264, elo_delta: 16 },
  { id: "dddddddd-dddd-dddd-dddd-ddddddddddd2", match_id: matches[0].id, club_player_id: clubPlayers[1].id, team: 1, slot: 2, points_scored: 21, points_allowed: 17, elo_before: 1226, elo_after: 1241, elo_delta: 15 },
  { id: "dddddddd-dddd-dddd-dddd-ddddddddddd3", match_id: matches[0].id, club_player_id: clubPlayers[2].id, team: 2, slot: 1, points_scored: 17, points_allowed: 21, elo_before: 1193, elo_after: 1182, elo_delta: -11 },
  { id: "dddddddd-dddd-dddd-dddd-ddddddddddd4", match_id: matches[0].id, club_player_id: clubPlayers[3].id, team: 2, slot: 2, points_scored: 17, points_allowed: 21, elo_before: 1184, elo_after: 1173, elo_delta: -11 },
];

const eloHistory = [
  { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1", club_player_id: clubPlayers[0].id, match_id: matches[0].id, recorded_on: "2026-03-01T20:00:00+07:00", elo_before: 1248, elo_after: 1264, elo_delta: 16 },
  { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2", club_player_id: clubPlayers[1].id, match_id: matches[0].id, recorded_on: "2026-03-01T20:00:00+07:00", elo_before: 1226, elo_after: 1241, elo_delta: 15 },
  { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3", club_player_id: clubPlayers[2].id, match_id: matches[0].id, recorded_on: "2026-03-01T20:00:00+07:00", elo_before: 1193, elo_after: 1182, elo_delta: -11 },
  { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4", club_player_id: clubPlayers[3].id, match_id: matches[0].id, recorded_on: "2026-03-01T20:00:00+07:00", elo_before: 1184, elo_after: 1173, elo_delta: -11 },
];

async function getOrCreateDemoUser() {
  const targetEmail = "kent@goodminton.app";
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = usersData.users.find((user) => user.email === targetEmail);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email: targetEmail,
    password: "Kent12345!",
    email_confirm: true,
    user_metadata: {
      full_name: "Kent Aditya",
    },
  });

  if (error) throw error;
  return data.user;
}

async function upsert(table, values, onConflict) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const { error } = await supabase.from(table).upsert(values, { onConflict });
    if (!error) return;

    if (!["PGRST204", "PGRST205"].includes(error.code) || attempt === 5) {
      throw error;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
}

async function tryUpsertProfile(profile) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const { error } = await supabase.from("profiles").upsert([profile], {
      onConflict: "id",
    });

    if (!error || error.code === "PGRST205") {
      return;
    }

    if (error.code !== "PGRST204" || attempt === 5) {
      throw error;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
}

async function main() {
  const demoUser = await getOrCreateDemoUser();

  await tryUpsertProfile({
    id: demoUser.id,
    full_name: "Kent Aditya",
    email: demoUser.email,
  });

  await upsert(
    "players",
    [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7",
        user_id: demoUser.id,
        full_name: "Kent Aditya",
        gender: "M",
        handedness: "right",
      },
    ],
    "user_id"
  );

  await upsert("clubs", clubs, "id");
  await upsert("players", players, "id");
  await upsert("club_players", clubPlayers, "id");
  await upsert("matches", matches, "id");
  await upsert("match_participants", matchParticipants, "id");
  await upsert("elo_history", eloHistory, "id");
  await upsert(
    "club_members",
    [
      { club_id: clubs[0].id, user_id: demoUser.id, role: "admin" },
      { club_id: clubs[1].id, user_id: demoUser.id, role: "player" },
      { club_id: clubs[2].id, user_id: demoUser.id, role: "player" },
    ],
    "club_id,user_id"
  );

  console.log("Cloud seed finished.");
  console.log(`Demo user email: ${demoUser.email}`);
  console.log("Demo password: Kent12345!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
