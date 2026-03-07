import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildTournamentEntries,
  computeTournamentStatus,
  generateKnockoutMatches,
  generateRoundRobinMatches,
} from "@/lib/tournaments";

export function getTournamentString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export function validateTournamentInput({ clubSlug, name, scheduledAt, format, category, seeding, playerIds }) {
  if (!clubSlug || !name || !scheduledAt || !format || !category || !seeding) {
    return "Please complete all tournament details.";
  }

  if (playerIds.length < 2) {
    return "Select at least 2 players for the tournament.";
  }

  if (category === "doubles" && playerIds.length < 4) {
    return "Doubles tournaments require at least 4 players.";
  }

  if (category === "doubles" && playerIds.length % 2 !== 0) {
    return "Doubles tournaments require an even number of players.";
  }

  return null;
}

export async function fetchTournamentClubPlayers(clubId, playerIds) {
  const { data, error } = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        elo_current,
        player:players (
          full_name
        )
      `
    )
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("id", playerIds);

  if (error) {
    throw new Error(error.message);
  }

  if ((data ?? []).length !== playerIds.length) {
    throw new Error("One or more selected players are invalid.");
  }

  return data ?? [];
}

export function buildTournamentPayload({ tournamentId, clubPlayers, category, seeding, format, scheduledAt }) {
  const entries = buildTournamentEntries(clubPlayers, category, seeding);

  if (entries.length < 2) {
    throw new Error("Not enough valid entrants were generated for this tournament.");
  }

  const matches =
    format === "round_robin"
      ? generateRoundRobinMatches(tournamentId, entries, scheduledAt)
      : generateKnockoutMatches(tournamentId, entries, scheduledAt);

  const status = computeTournamentStatus(matches);

  const entryRows = entries.map((entry) => ({
    id: entry.id,
    tournament_id: tournamentId,
    seed_number: entry.seed_number,
    display_name: entry.display_name,
    average_elo: entry.average_elo,
  }));

  const entryPlayerRows = entries.flatMap((entry) =>
    entry.players.map((player) => ({
      tournament_entry_id: entry.id,
      club_player_id: player.id,
    })),
  );

  const tournamentPlayerRows = entries.flatMap((entry) =>
    entry.players.map((player) => ({
      tournament_id: tournamentId,
      club_player_id: player.id,
      seed_number: entry.seed_number,
    })),
  );

  return {
    entries,
    entryRows,
    entryPlayerRows,
    matches,
    status,
    tournamentPlayerRows,
  };
}

export async function replaceTournamentStructure({ tournamentId, clubPlayers, category, seeding, format, scheduledAt }) {
  const payload = buildTournamentPayload({
    tournamentId,
    clubPlayers,
    category,
    seeding,
    format,
    scheduledAt,
  });

  const { error: deleteMatchesError } = await supabaseAdmin.from("tournament_matches").delete().eq("tournament_id", tournamentId);
  if (deleteMatchesError) throw new Error(deleteMatchesError.message);

  const { error: deleteEntriesError } = await supabaseAdmin.from("tournament_entries").delete().eq("tournament_id", tournamentId);
  if (deleteEntriesError) throw new Error(deleteEntriesError.message);

  const { error: deletePlayersError } = await supabaseAdmin.from("tournament_players").delete().eq("tournament_id", tournamentId);
  if (deletePlayersError) throw new Error(deletePlayersError.message);

  const { error: entriesError } = await supabaseAdmin.from("tournament_entries").insert(payload.entryRows);
  if (entriesError) throw new Error(entriesError.message);

  const { error: entryPlayersError } = await supabaseAdmin.from("tournament_entry_players").insert(payload.entryPlayerRows);
  if (entryPlayersError) throw new Error(entryPlayersError.message);

  const { error: tournamentPlayersError } = await supabaseAdmin.from("tournament_players").insert(payload.tournamentPlayerRows);
  if (tournamentPlayersError) throw new Error(tournamentPlayersError.message);

  const { error: matchesError } = await supabaseAdmin.from("tournament_matches").insert(payload.matches);
  if (matchesError) throw new Error(matchesError.message);

  return payload;
}
