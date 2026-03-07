"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

async function getAuthorizedClub(clubSlug, userId) {
  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select(
      `
        role,
        club:clubs (
          id,
          slug
        )
      `
    )
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("clubs.slug", clubSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.club?.id) {
    throw new Error("You do not have admin access to this club.");
  }

  return data.club;
}

export async function createTournamentAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const name = getString(formData, "name");
  const scheduledAt = getString(formData, "scheduled_at");
  const format = getString(formData, "format");
  const category = getString(formData, "category");
  const seeding = getString(formData, "seeding");
  const playerIds = formData.getAll("player_ids").map((value) => String(value)).filter(Boolean);

  if (!clubSlug || !name || !scheduledAt || !format || !category || !seeding) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent("Please complete all tournament details.")}`);
  }

  if (playerIds.length < 2) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent("Select at least 2 players for the tournament.")}`);
  }

  if (category === "doubles" && playerIds.length < 4) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent("Doubles tournaments require at least 4 players.")}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let club;
  try {
    club = await getAuthorizedClub(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments?error=${encodeURIComponent(error.message)}`);
  }

  const { data: clubPlayers, error: clubPlayersError } = await supabaseAdmin
    .from("club_players")
    .select("id, elo_current")
    .eq("club_id", club.id)
    .in("id", playerIds);

  if (clubPlayersError) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(clubPlayersError.message)}`);
  }

  if ((clubPlayers ?? []).length !== playerIds.length) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent("One or more selected players are invalid.")}`);
  }

  const { data: tournament, error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .insert({
      club_id: club.id,
      name,
      scheduled_at: scheduledAt,
      format,
      category,
      seeding,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (tournamentError || !tournament) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(tournamentError?.message ?? "Failed to create tournament.")}`);
  }

  const sortedPlayers =
    seeding === "elo_based"
      ? [...clubPlayers].sort((a, b) => (b.elo_current ?? 1000) - (a.elo_current ?? 1000))
      : clubPlayers;

  const participantRows = sortedPlayers.map((player, index) => ({
    tournament_id: tournament.id,
    club_player_id: player.id,
    seed_number: seeding === "elo_based" ? index + 1 : null,
  }));

  const { error: participantsError } = await supabaseAdmin
    .from("tournament_players")
    .insert(participantRows);

  if (participantsError) {
    await supabaseAdmin.from("tournaments").delete().eq("id", tournament.id);
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(participantsError.message)}`);
  }

  redirect(`/clubs/${clubSlug}/tournaments?success=${encodeURIComponent("Tournament created successfully.")}`);
}
