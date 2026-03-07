import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

const CLUB_SLUG = "infor-gacor";
const CSV_PATH = path.join(process.cwd(), "Temp Score - Sheet1.csv");
const DEFAULT_ELO = 1000;
const NAME_ALIASES = new Map([["patrick wilson", "Patrick Wilson"]]);

function normalizeName(name) {
  const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
  const alias = NAME_ALIASES.get(trimmed.toLowerCase());
  return alias ?? trimmed;
}

function parseCsvRows() {
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter((line, index, source) => {
    if (index === source.length - 1 && !line.trim()) return false;
    return true;
  });

  const rows = [];
  const skipped = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const cols = line.split(",");
    const lineNumber = index + 1;

    if (cols.every((col) => !col.trim())) {
      skipped.push({ lineNumber, reason: "blank row" });
      continue;
    }

    if (cols.length < 7) {
      skipped.push({ lineNumber, reason: "incomplete row" });
      continue;
    }

    const [date, team1Player1, team1Player2, team1Score, team2Score, team2Player1, team2Player2] = cols;
    const players = [team1Player1, team1Player2, team2Player1, team2Player2].map(normalizeName);
    const uniquePlayers = new Set(players.map((name) => name.toLowerCase()));

    if (players.some((name) => !name) || uniquePlayers.size !== 4) {
      skipped.push({ lineNumber, reason: "duplicate or missing player in match" });
      continue;
    }

    rows.push({
      lineNumber,
      date: date.trim(),
      team1Player1: players[0],
      team1Player2: players[1],
      team1Score: Number.parseInt(team1Score, 10),
      team2Score: Number.parseInt(team2Score, 10),
      team2Player1: players[2],
      team2Player2: players[3],
    });
  }

  return { rows, skipped };
}

function toIsoDate(input) {
  const [month, day, year] = input.split("-");
  return `${year}-${month}-${day}`;
}

function buildPlayedAt(dateString, indexForDate) {
  const isoDate = toIsoDate(dateString);
  const totalMinutes = 19 * 60 + indexForDate * 7;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${isoDate}T${hours}:${minutes}:00+07:00`;
}

async function main() {
  const { rows, skipped } = parseCsvRows();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();

  if (clubError) throw clubError;
  if (!club) {
    throw new Error(`Club with slug "${CLUB_SLUG}" was not found.`);
  }

  const { data: existingPlayers, error: playersError } = await supabase
    .from("players")
    .select("id, full_name");

  if (playersError) throw playersError;

  const playerMap = new Map(
    (existingPlayers ?? []).map((player) => [normalizeName(player.full_name).toLowerCase(), player])
  );

  const allNames = new Set();
  for (const row of rows) {
    allNames.add(row.team1Player1);
    allNames.add(row.team1Player2);
    allNames.add(row.team2Player1);
    allNames.add(row.team2Player2);
  }

  for (const fullName of allNames) {
    const key = fullName.toLowerCase();
    if (playerMap.has(key)) continue;

    const payload = { id: randomUUID(), full_name: fullName };
    const { data, error } = await supabase.from("players").insert(payload).select("id, full_name").single();
    if (error) throw error;
    playerMap.set(key, data);
  }

  const { data: clubPlayers, error: clubPlayersError } = await supabase
    .from("club_players")
    .select("id, player_id")
    .eq("club_id", club.id);

  if (clubPlayersError) throw clubPlayersError;

  const clubPlayerMap = new Map((clubPlayers ?? []).map((item) => [item.player_id, item]));

  for (const fullName of allNames) {
    const player = playerMap.get(fullName.toLowerCase());
    if (clubPlayerMap.has(player.id)) continue;

    const payload = {
      id: randomUUID(),
      club_id: club.id,
      player_id: player.id,
      status: "active",
      elo_initial: DEFAULT_ELO,
      elo_current: DEFAULT_ELO,
    };

    const { data, error } = await supabase
      .from("club_players")
      .insert(payload)
      .select("id, player_id")
      .single();

    if (error) throw error;
    clubPlayerMap.set(player.id, data);
  }

  const { data: adminMemberships, error: adminMembershipsError } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", club.id)
    .eq("role", "admin")
    .limit(1);

  if (adminMembershipsError) throw adminMembershipsError;

  const reviewerUserId = adminMemberships?.[0]?.user_id ?? null;

  const { error: deleteMatchesError } = await supabase.from("matches").delete().eq("club_id", club.id);
  if (deleteMatchesError) throw deleteMatchesError;

  const { error: resetClubPlayersError } = await supabase
    .from("club_players")
    .update({
      elo_initial: DEFAULT_ELO,
      elo_current: DEFAULT_ELO,
      total_matches: 0,
      total_wins: 0,
      total_losses: 0,
      status: "active",
    })
    .eq("club_id", club.id);

  if (resetClubPlayersError) throw resetClubPlayersError;

  const dateCounter = new Map();
  let importedCount = 0;

  for (const row of rows) {
    const indexForDate = dateCounter.get(row.date) ?? 0;
    dateCounter.set(row.date, indexForDate + 1);

    const matchDate = toIsoDate(row.date);
    const playedAt = buildPlayedAt(row.date, indexForDate);

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        id: randomUUID(),
        club_id: club.id,
        match_date: matchDate,
        played_at: playedAt,
        team1_score: row.team1Score,
        team2_score: row.team2Score,
        status: "pending",
        created_by: reviewerUserId,
      })
      .select("id")
      .single();

    if (matchError) {
      throw new Error(`Line ${row.lineNumber}: ${matchError.message}`);
    }

    const participants = [
      { club_player_id: clubPlayerMap.get(playerMap.get(row.team1Player1.toLowerCase()).id).id, team: 1, slot: 1 },
      { club_player_id: clubPlayerMap.get(playerMap.get(row.team1Player2.toLowerCase()).id).id, team: 1, slot: 2 },
      { club_player_id: clubPlayerMap.get(playerMap.get(row.team2Player1.toLowerCase()).id).id, team: 2, slot: 1 },
      { club_player_id: clubPlayerMap.get(playerMap.get(row.team2Player2.toLowerCase()).id).id, team: 2, slot: 2 },
    ];

    const { error: participantsError } = await supabase.from("match_participants").insert(
      participants.map((participant) => ({
        id: randomUUID(),
        match_id: match.id,
        club_player_id: participant.club_player_id,
        team: participant.team,
        slot: participant.slot,
        points_scored: participant.team === 1 ? row.team1Score : row.team2Score,
        points_allowed: participant.team === 1 ? row.team2Score : row.team1Score,
      }))
    );

    if (participantsError) {
      throw new Error(`Line ${row.lineNumber}: ${participantsError.message}`);
    }

    const { error: approvalError } = await supabase.rpc("process_match_approval", {
      target_match_id: match.id,
      reviewer_user_id: reviewerUserId,
    });

    if (approvalError) {
      throw new Error(`Line ${row.lineNumber}: ${approvalError.message}`);
    }

    importedCount += 1;
  }

  console.log(`Imported ${importedCount} matches into ${club.name}.`);
  console.log(`Created or reused ${allNames.size} players for this club.`);
  if (skipped.length > 0) {
    console.log("Skipped rows:");
    for (const item of skipped) {
      console.log(`- line ${item.lineNumber}: ${item.reason}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
