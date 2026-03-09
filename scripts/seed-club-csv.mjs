import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const MARCO_NAME = "Marco Alexander";
const CSV_FILE = process.argv[2] ?? "Temp Score - Sheet1.csv";
const SEED_NOTE_PREFIX = `CSV seed: ${path.basename(CSV_FILE)}`;

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

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function canonicalName(name) {
  const normalized = normalizeName(name);
  if (normalized === "patrick wilson") return "Patrick Wilson";
  return name.trim().replace(/\s+/g, " ");
}

function parseDate(value) {
  const [month, day, year] = value.trim().split("-");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function buildPlayedAt(date, index) {
  const base = new Date(`${date}T12:00:00.000Z`);
  base.setUTCMinutes(base.getUTCMinutes() + index);
  return base.toISOString();
}

function deterministicUuid(seed) {
  const hex = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function parseCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const headers = headerLine.split(",");

  return lines.map((line, index) => {
    const columns = line.split(",");
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, columns[columnIndex]?.trim() ?? ""]));

    return {
      index,
      matchDate: parseDate(row["Tanggal"]),
      team1: [canonicalName(row["Tim 1 Player 1"]), canonicalName(row["Tim 1 Player 2"])],
      team2: [canonicalName(row["Tim 2 Player 1"]), canonicalName(row["Tim 2 Player 2"])],
      team1Score: Number.parseInt(row["Tim 1 Score"], 10),
      team2Score: Number.parseInt(row["Tim 2 Score"], 10),
    };
  });
}

async function getSingle(supabase, table, queryLabel, queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`No ${table} found for ${queryLabel}.`);
  }
  if (data.length > 1) {
    throw new Error(`Multiple ${table} rows found for ${queryLabel}.`);
  }
  return data[0];
}

async function ensurePlayer(supabase, fullName, marcoProfileId, marcoPlayerId) {
  if (fullName === MARCO_NAME) {
    const { error } = await supabase
      .from("players")
      .update({ full_name: MARCO_NAME, user_id: marcoProfileId })
      .eq("id", marcoPlayerId);
    if (error) throw error;

    return { id: marcoPlayerId, full_name: MARCO_NAME };
  }

  const { data: existing, error: existingError } = await supabase
    .from("players")
    .select("id, full_name")
    .eq("full_name", fullName)
    .limit(1);
  if (existingError) throw existingError;

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("players")
    .insert({ full_name: fullName })
    .select("id, full_name")
    .single();
  if (insertError) throw insertError;

  return inserted;
}

async function ensureClubPlayer(supabase, clubId, playerId, defaultJoinedAt) {
  const { data: existing, error: existingError } = await supabase
    .from("club_players")
    .select("id, player_id")
    .eq("club_id", clubId)
    .eq("player_id", playerId)
    .limit(1);
  if (existingError) throw existingError;

  if (existing && existing.length > 0) {
    return existing[0];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("club_players")
    .insert({
      club_id: clubId,
      player_id: playerId,
      joined_at: defaultJoinedAt,
      status: "active",
      elo_initial: 1000,
      elo_current: 1000,
    })
    .select("id, player_id")
    .single();
  if (insertError) throw insertError;

  return inserted;
}

async function main() {
  loadEnvFile();

  const csvPath = path.resolve(process.cwd(), CSV_FILE);
  const matchesFromCsv = parseCsv(csvPath);
  const uniqueNames = [...new Set(matchesFromCsv.flatMap((match) => [...match.team1, ...match.team2]))];

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

  const marcoProfilesQuery = supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("full_name", MARCO_NAME);
  const { data: marcoProfiles, error: marcoProfilesError } = await marcoProfilesQuery;
  if (marcoProfilesError) throw marcoProfilesError;
  if (!marcoProfiles || marcoProfiles.length === 0) {
    throw new Error(`Profile ${MARCO_NAME} was not found.`);
  }

  const marcoProfileIds = marcoProfiles.map((profile) => profile.id);
  const { data: ownerMemberships, error: ownerMembershipsError } = await supabase
    .from("club_members")
    .select("id, club_id, user_id, role, created_at")
    .eq("role", "owner")
    .in("user_id", marcoProfileIds);
  if (ownerMembershipsError) throw ownerMembershipsError;
  if (!ownerMemberships || ownerMemberships.length === 0) {
    throw new Error(`No owner club found for ${MARCO_NAME}.`);
  }

  const ownerClubIds = [...new Set(ownerMemberships.map((membership) => membership.club_id))];
  const { data: ownerClubs, error: ownerClubsError } = await supabase
    .from("clubs")
    .select("id, name, slug, city, created_at")
    .in("id", ownerClubIds);
  if (ownerClubsError) throw ownerClubsError;

  const latestOwnerClub = [...ownerClubs].sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
  const latestOwnerMembership = ownerMemberships.find((membership) => membership.club_id === latestOwnerClub.id);
  const marcoProfile = marcoProfiles.find((profile) => profile.id === latestOwnerMembership.user_id);

  const marcoPlayer = await getSingle(
    supabase,
    "players",
    `${MARCO_NAME} player`,
    supabase.from("players").select("id, user_id, full_name, created_at").eq("user_id", marcoProfile.id)
  );

  await supabase
    .from("profiles")
    .update({ full_name: MARCO_NAME })
    .eq("id", marcoProfile.id)
    .throwOnError();

  const playerByName = new Map();
  for (const fullName of uniqueNames) {
    const player = await ensurePlayer(supabase, fullName, marcoProfile.id, marcoPlayer.id);
    playerByName.set(fullName, player);
  }

  const clubPlayerByName = new Map();
  for (const fullName of uniqueNames) {
    const player = playerByName.get(fullName);
    const clubPlayer = await ensureClubPlayer(supabase, latestOwnerClub.id, player.id, latestOwnerClub.created_at.slice(0, 10));
    clubPlayerByName.set(fullName, clubPlayer);
  }

  const { data: existingSeededMatches, error: existingSeededMatchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("club_id", latestOwnerClub.id)
    .like("notes", `${SEED_NOTE_PREFIX}%`);
  if (existingSeededMatchesError) throw existingSeededMatchesError;

  if (existingSeededMatches && existingSeededMatches.length > 0) {
    const { error: deleteMatchesError } = await supabase
      .from("matches")
      .delete()
      .in(
        "id",
        existingSeededMatches.map((match) => match.id)
      );
    if (deleteMatchesError) throw deleteMatchesError;
  }

  const matchesPayload = [];
  const participantsPayload = [];

  for (const match of matchesFromCsv) {
    const matchId = deterministicUuid(`${latestOwnerClub.id}:match:${match.index}`);
    const playedAt = buildPlayedAt(match.matchDate, match.index);

    matchesPayload.push({
      id: matchId,
      club_id: latestOwnerClub.id,
      match_date: match.matchDate,
      played_at: playedAt,
      match_type: "doubles",
      team1_score: match.team1Score,
      team2_score: match.team2Score,
      status: "approved",
      notes: `${SEED_NOTE_PREFIX} row ${match.index + 1}`,
      created_by: marcoProfile.id,
      reviewed_by: marcoProfile.id,
      reviewed_at: playedAt,
    });

    [
      { team: 1, players: match.team1 },
      { team: 2, players: match.team2 },
    ].forEach(({ team, players }) => {
      players.forEach((fullName, slotIndex) => {
        const clubPlayer = clubPlayerByName.get(fullName);
        participantsPayload.push({
          id: deterministicUuid(`${matchId}:participant:${team}:${slotIndex + 1}`),
          match_id: matchId,
          club_player_id: clubPlayer.id,
          team,
          slot: slotIndex + 1,
          points_scored: 0,
          points_allowed: 0,
          elo_before: 0,
          elo_after: 0,
          elo_delta: 0,
        });
      });
    });
  }

  const { error: insertMatchesError } = await supabase.from("matches").insert(matchesPayload);
  if (insertMatchesError) throw insertMatchesError;

  const { error: insertParticipantsError } = await supabase.from("match_participants").insert(participantsPayload);
  if (insertParticipantsError) throw insertParticipantsError;

  const { error: rebuildError } = await supabase.rpc("rebuild_club_elo", {
    target_club_id: latestOwnerClub.id,
  });
  if (rebuildError) throw rebuildError;

  const marcoClubPlayer = clubPlayerByName.get(MARCO_NAME);
  const { data: marcoStats, error: marcoStatsError } = await supabase
    .from("club_players")
    .select("id, elo_initial, elo_current, total_matches, total_wins, total_losses")
    .eq("id", marcoClubPlayer.id)
    .single();
  if (marcoStatsError) throw marcoStatsError;

  console.log(`Seeded ${matchesPayload.length} matches into club ${latestOwnerClub.name} (${latestOwnerClub.id}).`);
  console.log(`Marco profile id: ${marcoProfile.id}`);
  console.log(`Marco player id: ${marcoPlayer.id}`);
  console.log(`Marco club_player id: ${marcoClubPlayer.id}`);
  console.log(`Marco stats: ${JSON.stringify(marcoStats)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
