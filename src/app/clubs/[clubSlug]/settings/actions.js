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
    throw new Error("Anda tidak memiliki akses admin ke klub ini.");
  }

  return data.club;
}

export async function updateClubSettingsAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const playSchedule = getString(formData, "play_schedule");
  const description = getString(formData, "description");
  const imageUrl = getString(formData, "image_url");

  if (!clubSlug || !name) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Nama club wajib diisi.`);
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
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const { error } = await supabaseAdmin
    .from("clubs")
    .update({
      name,
      city: location || null,
      location: location || null,
      play_schedule: playSchedule || null,
      description: description || null,
      image_url: imageUrl || null,
    })
    .eq("id", club.id);

  if (error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/settings`);
}

export async function addClubPlayerAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const fullName = getString(formData, "full_name");

  if (!clubSlug || !fullName) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Nama pemain wajib diisi.`);
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
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const playerInsert = await supabaseAdmin
    .from("players")
    .insert({
      full_name: fullName,
    })
    .select("id")
    .single();

  if (playerInsert.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(playerInsert.error.message)}`);
  }

  const clubPlayerInsert = await supabaseAdmin
    .from("club_players")
    .insert({
      club_id: club.id,
      player_id: playerInsert.data.id,
      joined_at: new Date().toISOString().slice(0, 10),
      status: "active",
    });

  if (clubPlayerInsert.error) {
    await supabaseAdmin.from("players").delete().eq("id", playerInsert.data.id);
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubPlayerInsert.error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/settings/edit`);
}

export async function removeClubPlayerAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const clubPlayerId = getString(formData, "club_player_id");

  if (!clubSlug || !clubPlayerId) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Data pemain tidak valid.`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await getAuthorizedClub(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const lookup = await supabaseAdmin
    .from("club_players")
    .select("id, player_id")
    .eq("id", clubPlayerId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Player club tidak ditemukan.`);
  }

  const deleteClubPlayer = await supabaseAdmin
    .from("club_players")
    .delete()
    .eq("id", clubPlayerId);

  if (deleteClubPlayer.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(deleteClubPlayer.error.message)}`);
  }

  const remainingUsage = await supabaseAdmin
    .from("club_players")
    .select("id", { head: true, count: "exact" })
    .eq("player_id", lookup.data.player_id);

  if (!remainingUsage.error && remainingUsage.count === 0) {
    await supabaseAdmin
      .from("players")
      .delete()
      .eq("id", lookup.data.player_id)
      .is("user_id", null);
  }

  redirect(`/clubs/${clubSlug}/settings/edit`);
}
