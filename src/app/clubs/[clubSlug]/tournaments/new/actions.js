"use server";

import { redirect } from "next/navigation";
import { CLUB_ROLE_ADMIN, CLUB_ROLE_OWNER } from "@/lib/clubRoles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchTournamentClubPlayers,
  getTournamentString,
  replaceTournamentStructure,
  validateTournamentInput,
} from "@/lib/tournamentAdmin";

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
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const membership =
    (data ?? []).find(
      (item) =>
        item.club?.slug === clubSlug &&
        [CLUB_ROLE_OWNER, CLUB_ROLE_ADMIN].includes(item.role)
    ) ?? null;

  if (!membership?.club?.id) {
    throw new Error("You do not have manager access to this club.");
  }

  return membership.club;
}

export async function createTournamentAction(formData) {
  const clubSlug = getTournamentString(formData, "club_slug");
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
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(validationError)}`);
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

  let clubPlayers;
  try {
    clubPlayers = await fetchTournamentClubPlayers(club.id, playerIds);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(error.message)}`);
  }

  const tournamentId = crypto.randomUUID();

  const { error: tournamentError } = await supabaseAdmin
    .from("tournaments")
    .insert({
      id: tournamentId,
      club_id: club.id,
      name,
      scheduled_at: scheduledAt,
      format,
      category,
      seeding,
      status: "upcoming",
      created_by: user.id,
    });

  if (tournamentError) {
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(tournamentError.message)}`);
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

    await supabaseAdmin.from("tournaments").update({ status: payload.status }).eq("id", tournamentId);
  } catch (error) {
    await supabaseAdmin.from("tournaments").delete().eq("id", tournamentId);
    redirect(`/clubs/${clubSlug}/tournaments/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?success=${encodeURIComponent("Tournament created successfully.")}`);
}
