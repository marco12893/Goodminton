"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function getInt(formData, key) {
  const value = Number.parseInt(getString(formData, key), 10);
  return Number.isNaN(value) ? null : value;
}

async function getClubMembership(clubSlug, userId) {
  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select(
      `
        role,
        club:clubs (
          id,
          slug,
          name
        )
      `
    )
    .eq("user_id", userId)
    .eq("clubs.slug", clubSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.club?.id) {
    throw new Error("You do not have access to this club.");
  }

  return {
    role: data.role,
    club: data.club,
  };
}

function buildParticipants(formData) {
  return [
    { club_player_id: getString(formData, "team1_player1"), team: 1, slot: 1 },
    { club_player_id: getString(formData, "team1_player2"), team: 1, slot: 2 },
    { club_player_id: getString(formData, "team2_player1"), team: 2, slot: 1 },
    { club_player_id: getString(formData, "team2_player2"), team: 2, slot: 2 },
  ];
}

export async function createMatchLogAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const playedAt = getString(formData, "played_at");
  const team1Score = getInt(formData, "team1_score");
  const team2Score = getInt(formData, "team2_score");

  if (!clubSlug || !playedAt) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=Date and time are required.`);
  }

  if (team1Score == null || team2Score == null || team1Score < 0 || team2Score < 0) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=Scores must be numbers greater than or equal to 0.`);
  }

  if (team1Score === team2Score) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=Draw scores are not supported.`);
  }

  const participants = buildParticipants(formData);
  if (participants.some((item) => !item.club_player_id)) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=All four player fields are required.`);
  }

  const uniquePlayerIds = new Set(participants.map((item) => item.club_player_id));
  if (uniquePlayerIds.size !== 4) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=Each player can only be selected once.`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let membership;
  try {
    membership = await getClubMembership(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/match-log?error=${encodeURIComponent(error.message)}`);
  }

  const clubPlayerCheck = await supabaseAdmin
    .from("club_players")
    .select("id")
    .eq("club_id", membership.club.id)
    .in("id", [...uniquePlayerIds]);

  if (clubPlayerCheck.error || (clubPlayerCheck.data?.length ?? 0) !== 4) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=One or more selected players do not belong to this club.`);
  }

  const isAdmin = membership.role === "admin";
  const nowIso = new Date().toISOString();

  const matchInsert = await supabaseAdmin
    .from("matches")
    .insert({
      club_id: membership.club.id,
      match_date: playedAt.slice(0, 10),
      played_at: new Date(playedAt).toISOString(),
      team1_score: team1Score,
      team2_score: team2Score,
      status: isAdmin ? "approved" : "pending",
      created_by: user.id,
      reviewed_by: isAdmin ? user.id : null,
      reviewed_at: isAdmin ? nowIso : null,
    })
    .select("id")
    .single();

  if (matchInsert.error) {
    redirect(`/clubs/${clubSlug}/match-log/new?error=${encodeURIComponent(matchInsert.error.message)}`);
  }

  const participantInsert = await supabaseAdmin.from("match_participants").insert(
    participants.map((item) => ({
      match_id: matchInsert.data.id,
      club_player_id: item.club_player_id,
      team: item.team,
      slot: item.slot,
      points_scored: item.team === 1 ? team1Score : team2Score,
      points_allowed: item.team === 1 ? team2Score : team1Score,
    }))
  );

  if (participantInsert.error) {
    await supabaseAdmin.from("matches").delete().eq("id", matchInsert.data.id);
    redirect(`/clubs/${clubSlug}/match-log/new?error=${encodeURIComponent(participantInsert.error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/match-log`);
}

export async function approveMatchLogAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const matchId = getString(formData, "match_id");

  if (!clubSlug || !matchId) {
    redirect(`/clubs/${clubSlug}/match-log?error=Invalid match data.`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let membership;
  try {
    membership = await getClubMembership(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/match-log?error=${encodeURIComponent(error.message)}`);
  }

  if (membership.role !== "admin") {
    redirect(`/clubs/${clubSlug}/match-log?error=Only admins can review submitted matches.`);
  }

  const { error } = await supabaseAdmin
    .from("matches")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", matchId)
    .eq("club_id", membership.club.id);

  if (error) {
    redirect(`/clubs/${clubSlug}/match-log?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/match-log`);
}

export async function rejectMatchLogAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const matchId = getString(formData, "match_id");

  if (!clubSlug || !matchId) {
    redirect(`/clubs/${clubSlug}/match-log?error=Invalid match data.`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let membership;
  try {
    membership = await getClubMembership(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/match-log?error=${encodeURIComponent(error.message)}`);
  }

  if (membership.role !== "admin") {
    redirect(`/clubs/${clubSlug}/match-log?error=Only admins can review submitted matches.`);
  }

  const { error } = await supabaseAdmin
    .from("matches")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: "Rejected by club admin.",
    })
    .eq("id", matchId)
    .eq("club_id", membership.club.id);

  if (error) {
    redirect(`/clubs/${clubSlug}/match-log?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/match-log`);
}
