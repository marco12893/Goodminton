"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeTournamentStatus } from "@/lib/tournaments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchTournamentClubPlayers,
  getTournamentString,
  replaceTournamentStructure,
  validateTournamentInput,
} from "@/lib/tournamentAdmin";

export async function getAuthorizedTournament(clubSlug, tournamentId, userId) {
  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select(
      `
        role,
        club:clubs (
          id,
          slug,
          tournaments:tournaments!inner (
            id,
            format
          )
        )
      `
    )
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("clubs.slug", clubSlug)
    .eq("clubs.tournaments.id", tournamentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const tournament = data?.club?.tournaments?.[0];

  if (!data?.club?.id || !tournament?.id) {
    throw new Error("You do not have admin access to this tournament.");
  }

  return {
    clubId: data.club.id,
    tournamentId: tournament.id,
    format: tournament.format,
  };
}

export async function saveTournamentMatchAction(formData) {
  const clubSlug = getTournamentString(formData, "club_slug");
  const tournamentId = getTournamentString(formData, "tournament_id");
  const matchId = getTournamentString(formData, "match_id");
  const score1 = Number(getTournamentString(formData, "score1"));
  const score2 = Number(getTournamentString(formData, "score2"));

  if (!clubSlug || !tournamentId || !matchId || Number.isNaN(score1) || Number.isNaN(score2)) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent("Please provide valid match scores.")}`);
  }

  if (score1 < 0 || score2 < 0 || score1 === score2) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent("Scores must be non-negative and cannot end in a draw.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await getAuthorizedTournament(clubSlug, tournamentId, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  const { data: matches, error: matchesError } = await supabaseAdmin
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (matchesError) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(matchesError.message)}`);
  }

  const target = (matches ?? []).find((match) => match.id === matchId);

  if (!target || !target.entry1_id || !target.entry2_id) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent("This match is not ready for scoring yet.")}`);
  }

  const matchMap = new Map((matches ?? []).map((match) => [match.id, { ...match }]));
  const working = matchMap.get(matchId);
  const winnerEntryId = score1 > score2 ? working.entry1_id : working.entry2_id;
  const loserEntryId = score1 > score2 ? working.entry2_id : working.entry1_id;

  working.score1 = score1;
  working.score2 = score2;
  working.winner_entry_id = winnerEntryId;
  working.status = "completed";

  if (working.next_match_id) {
    const nextMatch = matchMap.get(working.next_match_id);
    if (nextMatch) {
      if (working.next_slot === 1) nextMatch.entry1_id = winnerEntryId;
      if (working.next_slot === 2) nextMatch.entry2_id = winnerEntryId;
    }
  }

  if (working.loser_next_match_id) {
    const loserMatch = matchMap.get(working.loser_next_match_id);
    if (loserMatch) {
      if (working.loser_next_slot === 1) loserMatch.entry1_id = loserEntryId;
      if (working.loser_next_slot === 2) loserMatch.entry2_id = loserEntryId;
    }
  }

  const updates = [];

  matchMap.forEach((match) => {
    updates.push({
      id: match.id,
      entry1_id: match.entry1_id,
      entry2_id: match.entry2_id,
      score1: match.score1,
      score2: match.score2,
      winner_entry_id: match.winner_entry_id,
      status: match.status,
    });
  });

  const { error: updateError } = await supabaseAdmin.from("tournament_matches").upsert(updates);

  if (updateError) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(updateError.message)}`);
  }

  const nextStatus = computeTournamentStatus([...matchMap.values()]);
  await supabaseAdmin.from("tournaments").update({ status: nextStatus }).eq("id", tournamentId);

  redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?success=${encodeURIComponent("Tournament match updated successfully.")}`);
}

export async function deleteTournamentAction(formData) {
  const clubSlug = getTournamentString(formData, "club_slug");
  const tournamentId = getTournamentString(formData, "tournament_id");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await getAuthorizedTournament(clubSlug, tournamentId, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  const { error } = await supabaseAdmin.from("tournaments").delete().eq("id", tournamentId);

  if (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/tournaments?success=${encodeURIComponent("Tournament deleted successfully.")}`);
}

export async function updateTournamentAction(formData) {
  const clubSlug = getTournamentString(formData, "club_slug");
  const tournamentId = getTournamentString(formData, "tournament_id");
  const name = getTournamentString(formData, "name");
  const scheduledAt = getTournamentString(formData, "scheduled_at");
  const format = getTournamentString(formData, "format");
  const category = getTournamentString(formData, "category");
  const seeding = getTournamentString(formData, "seeding");
  const playerIds = formData.getAll("player_ids").map((value) => String(value)).filter(Boolean);

  const validationError = validateTournamentInput({
    clubSlug,
    name,
    scheduledAt,
    format,
    category,
    seeding,
    playerIds,
  });

  if (validationError) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}/edit?error=${encodeURIComponent(validationError)}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let tournament;
  try {
    tournament = await getAuthorizedTournament(clubSlug, tournamentId, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  let clubPlayers;
  try {
    clubPlayers = await fetchTournamentClubPlayers(tournament.clubId, playerIds);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  try {
    const payload = await replaceTournamentStructure({
      tournamentId,
      clubPlayers,
      category,
      seeding,
      format,
      scheduledAt,
    });

    const { error } = await supabaseAdmin
      .from("tournaments")
      .update({
        name,
        scheduled_at: scheduledAt,
        format,
        category,
        seeding,
        status: payload.status,
      })
      .eq("id", tournamentId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?success=${encodeURIComponent("Tournament settings updated successfully.")}`);
}

export async function updateTournamentStatusAction(formData) {
  const clubSlug = getTournamentString(formData, "club_slug");
  const tournamentId = getTournamentString(formData, "tournament_id");
  const status = getTournamentString(formData, "status");

  if (!["upcoming", "in_progress", "completed"].includes(status)) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent("Please choose a valid tournament status.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await getAuthorizedTournament(clubSlug, tournamentId, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  const { error } = await supabaseAdmin
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId);

  if (error) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?success=${encodeURIComponent("Tournament status updated successfully.")}`);
}
