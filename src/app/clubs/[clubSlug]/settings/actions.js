"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deleteStorageObject, parseStoragePathFromPublicUrl } from "@/lib/storageUploads";
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

export async function updateClubSettingsAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const playSchedule = getString(formData, "play_schedule");
  const description = getString(formData, "description");
  const imageUrl = getString(formData, "image_url");
  const imageStoragePath = getString(formData, "image_storage_path");
  const currentImageUrl = getString(formData, "current_image_url");
  const currentImageStoragePath =
    getString(formData, "current_image_storage_path") || parseStoragePathFromPublicUrl(currentImageUrl);

  if (!clubSlug || !name) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Club name is required.`);
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

  if (imageStoragePath && currentImageStoragePath && imageStoragePath !== currentImageStoragePath) {
    try {
      await deleteStorageObject(currentImageStoragePath);
    } catch {
      // Ignore storage cleanup failures after settings are saved.
    }
  }

  redirect(`/clubs/${clubSlug}/settings`);
}

export async function addClubPlayerAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const fullName = getString(formData, "full_name");

  if (!clubSlug || !fullName) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Player name is required.`);
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

  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Player added successfully.")}`);
}

export async function linkClubPlayerAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const clubPlayerId = getString(formData, "club_player_id");
  const email = getString(formData, "email").toLowerCase();

  if (!clubSlug || !clubPlayerId || !email) {
    redirect(
      `/clubs/${clubSlug}/settings/edit?error=Club player and account email are required.`
    );
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

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        club_id,
        player_id,
        player:players (
          id,
          full_name,
          user_id
        )
      `
    )
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (clubPlayerLookup.error || !clubPlayerLookup.data) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Club player was not found.`);
  }

  const currentPlayer = clubPlayerLookup.data.player;

  if (currentPlayer?.user_id) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=This player is already linked to an account.`);
  }

  const profileLookup = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", email)
    .maybeSingle();

  if (profileLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(profileLookup.error.message)}`);
  }

  if (!profileLookup.data) {
    redirect(
      `/clubs/${clubSlug}/settings/edit?error=No registered account was found for that email.`
    );
  }

  const membershipLookup = await supabaseAdmin
    .from("club_members")
    .select("id")
    .eq("club_id", club.id)
    .eq("user_id", profileLookup.data.id)
    .maybeSingle();

  if (membershipLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipLookup.error.message)}`);
  }

  if (!membershipLookup.data) {
    const membershipInsert = await supabaseAdmin.from("club_members").insert({
      club_id: club.id,
      user_id: profileLookup.data.id,
      role: "player",
    });

    if (membershipInsert.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipInsert.error.message)}`);
    }
  }

  const existingLinkedPlayer = await supabaseAdmin
    .from("players")
    .select("id, full_name")
    .eq("user_id", profileLookup.data.id)
    .maybeSingle();

  if (existingLinkedPlayer.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(existingLinkedPlayer.error.message)}`);
  }

  if (existingLinkedPlayer.data && existingLinkedPlayer.data.id !== currentPlayer.id) {
    const duplicateClubPlayer = await supabaseAdmin
      .from("club_players")
      .select("id")
      .eq("club_id", club.id)
      .eq("player_id", existingLinkedPlayer.data.id)
      .maybeSingle();

    if (duplicateClubPlayer.error) {
      redirect(
        `/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(duplicateClubPlayer.error.message)}`
      );
    }

    if (duplicateClubPlayer.data) {
      redirect(
        `/clubs/${clubSlug}/settings/edit?error=That account is already linked to another player in this club.`
      );
    }

    const clubPlayerUpdate = await supabaseAdmin
      .from("club_players")
      .update({
        player_id: existingLinkedPlayer.data.id,
      })
      .eq("id", clubPlayerId);

    if (clubPlayerUpdate.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubPlayerUpdate.error.message)}`);
    }

    const remainingUsage = await supabaseAdmin
      .from("club_players")
      .select("id", { head: true, count: "exact" })
      .eq("player_id", currentPlayer.id);

    if (!remainingUsage.error && remainingUsage.count === 0) {
      await supabaseAdmin
        .from("players")
        .delete()
        .eq("id", currentPlayer.id)
        .is("user_id", null);
    }
  } else {
    const playerUpdate = await supabaseAdmin
      .from("players")
      .update({
        user_id: profileLookup.data.id,
        full_name: currentPlayer.full_name || profileLookup.data.full_name,
      })
      .eq("id", currentPlayer.id);

    if (playerUpdate.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(playerUpdate.error.message)}`);
    }
  }

  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Player linked successfully.")}`);
}

export async function removeClubPlayerAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const clubPlayerId = getString(formData, "club_player_id");

  if (!clubSlug || !clubPlayerId) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Invalid player data.`);
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
    redirect(`/clubs/${clubSlug}/settings/edit?error=Club player was not found.`);
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

  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Player removed successfully.")}`);
}

export async function promoteClubMemberAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const clubPlayerId = getString(formData, "club_player_id");

  if (!clubSlug || !clubPlayerId) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Invalid player data.`);
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

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        player:players (
          id,
          user_id
        )
      `
    )
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (clubPlayerLookup.error || !clubPlayerLookup.data) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Club player was not found.`);
  }

  const linkedUserId = clubPlayerLookup.data.player?.user_id;

  if (!linkedUserId) {
    redirect(
      `/clubs/${clubSlug}/settings/edit?error=Only linked accounts can be promoted to admin.`
    );
  }

  const membershipUpsert = await supabaseAdmin.from("club_members").upsert(
    [
      {
        club_id: club.id,
        user_id: linkedUserId,
        role: "admin",
      },
    ],
    {
      onConflict: "club_id,user_id",
    }
  );

  if (membershipUpsert.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipUpsert.error.message)}`);
  }

  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Player promoted to admin successfully.")}`);
}
