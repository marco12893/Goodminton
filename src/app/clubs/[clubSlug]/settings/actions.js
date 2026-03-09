"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  CLUB_ROLE_ADMIN,
  CLUB_ROLE_OWNER,
  CLUB_ROLE_PLAYER,
  isClubManager,
  isClubOwner,
} from "@/lib/clubRoles";
import {
  addUserToClubWithNewPlayer,
  attachUserToClubPlayer,
} from "@/lib/clubJoin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deleteStorageObject, parseStoragePathFromPublicUrl } from "@/lib/storageUploads";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateClubViews(clubSlug) {
  revalidateTag("user-clubs");
  revalidateTag("club-players");
  revalidatePath("/");
  revalidatePath("/clubs/discover");
  revalidatePath(`/clubs/${clubSlug}`, "layout");
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath(`/clubs/${clubSlug}/settings`);
  revalidatePath(`/clubs/${clubSlug}/settings/edit`);
}

async function getAuthorizedClub(
  clubSlug,
  userId,
  allowedRoles = [CLUB_ROLE_OWNER, CLUB_ROLE_ADMIN]
) {
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
      (item) => item.club?.slug === clubSlug && allowedRoles.includes(item.role)
    ) ?? null;

  if (!membership?.club?.id) {
    throw new Error("You do not have access to manage this club.");
  }

  return {
    ...membership.club,
    role: membership.role,
  };
}

export async function updateClubSettingsAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const playSchedule = getString(formData, "play_schedule");
  const description = getString(formData, "description");
  const joinMode = getString(formData, "join_mode") || "invite_only";
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
      join_mode: joinMode,
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

  revalidateClubViews(clubSlug);
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

  revalidateClubViews(clubSlug);
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
    .limit(1);

  if (profileLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(profileLookup.error.message)}`);
  }

  const profile = profileLookup.data?.[0] ?? null;

  if (!profile) {
    redirect(
      `/clubs/${clubSlug}/settings/edit?error=No registered account was found for that email.`
    );
  }

  const membershipLookup = await supabaseAdmin
    .from("club_members")
    .select("id")
    .eq("club_id", club.id)
    .eq("user_id", profile.id)
    .limit(1);

  if (membershipLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipLookup.error.message)}`);
  }

  if (!membershipLookup.data?.length) {
    const membershipInsert = await supabaseAdmin.from("club_members").insert({
      club_id: club.id,
      user_id: profile.id,
      role: "player",
    });

    if (membershipInsert.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipInsert.error.message)}`);
    }
  }

  const existingLinkedPlayer = await supabaseAdmin
    .from("players")
    .select("id, full_name")
    .eq("user_id", profile.id)
    .limit(1);

  if (existingLinkedPlayer.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(existingLinkedPlayer.error.message)}`);
  }

  const linkedPlayer = existingLinkedPlayer.data?.[0] ?? null;

  if (linkedPlayer && linkedPlayer.id !== currentPlayer.id) {
    const duplicateClubPlayer = await supabaseAdmin
      .from("club_players")
      .select("id")
      .eq("club_id", club.id)
      .eq("player_id", linkedPlayer.id)
      .limit(1);

    if (duplicateClubPlayer.error) {
      redirect(
        `/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(duplicateClubPlayer.error.message)}`
      );
    }

    if (duplicateClubPlayer.data?.length) {
      redirect(
        `/clubs/${clubSlug}/settings/edit?error=That account is already linked to another player in this club.`
      );
    }

    const clubPlayerUpdate = await supabaseAdmin
      .from("club_players")
      .update({
        player_id: linkedPlayer.id,
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
        user_id: profile.id,
        full_name: currentPlayer.full_name || profile.full_name,
      })
      .eq("id", currentPlayer.id);

    if (playerUpdate.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(playerUpdate.error.message)}`);
    }
  }

  revalidateClubViews(clubSlug);
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

  let actingClub;
  try {
    actingClub = await getAuthorizedClub(clubSlug, user.id);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const lookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        club_id,
        player_id,
        player:players (
          id,
          user_id
        )
      `
    )
    .eq("id", clubPlayerId)
    .limit(1);

  if (lookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(lookup.error.message)}`);
  }

  const clubPlayer = lookup.data?.[0] ?? null;

  if (!clubPlayer) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Club player was not found.`);
  }

  const linkedUserId = clubPlayer.player?.user_id ?? null;

  if (linkedUserId) {
    const membershipLookup = await supabaseAdmin
      .from("club_members")
      .select("id, role")
      .eq("club_id", clubPlayer.club_id)
      .eq("user_id", linkedUserId)
      .limit(1);

    if (membershipLookup.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipLookup.error.message)}`);
    }

    const membership = membershipLookup.data?.[0] ?? null;
    const targetRole = membership?.role ?? CLUB_ROLE_PLAYER;

    if (targetRole === CLUB_ROLE_OWNER) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=The club owner cannot be removed from the club roster.`);
    }

    if (!isClubOwner(actingClub.role) && isClubManager(targetRole)) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=Admins cannot remove other admins or the owner.`);
    }
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
    .eq("player_id", clubPlayer.player_id);

  if (linkedUserId) {
    const membershipDelete = await supabaseAdmin
      .from("club_members")
      .delete()
      .eq("club_id", clubPlayer.club_id)
      .eq("user_id", linkedUserId)
      .neq("role", CLUB_ROLE_OWNER);

    if (membershipDelete.error) {
      redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipDelete.error.message)}`);
    }
  }

  if (!remainingUsage.error && remainingUsage.count === 0) {
    await supabaseAdmin
      .from("players")
      .delete()
      .eq("id", clubPlayer.player_id)
      .is("user_id", null);
  }

  revalidateClubViews(clubSlug);
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

  const targetMembershipLookup = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", club.id)
    .eq("user_id", linkedUserId)
    .limit(1);

  if (targetMembershipLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(targetMembershipLookup.error.message)}`);
  }

  const targetRole = targetMembershipLookup.data?.[0]?.role ?? CLUB_ROLE_PLAYER;

  if (targetRole === CLUB_ROLE_OWNER) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=The club owner already has higher access than admin.`);
  }

  if (targetRole === CLUB_ROLE_ADMIN) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=This member is already an admin.`);
  }

  const membershipUpsert = await supabaseAdmin.from("club_members").upsert(
    [
      {
        club_id: club.id,
        user_id: linkedUserId,
        role: CLUB_ROLE_ADMIN,
      },
    ],
    {
      onConflict: "club_id,user_id",
    }
  );

  if (membershipUpsert.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipUpsert.error.message)}`);
  }

  revalidateClubViews(clubSlug);
  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Member promoted to admin successfully.")}`);
}

export async function demoteClubMemberAction(formData) {
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
    club = await getAuthorizedClub(clubSlug, user.id, [CLUB_ROLE_OWNER]);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(`id, player:players (user_id)`)
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .limit(1);

  if (clubPlayerLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubPlayerLookup.error.message)}`);
  }

  const linkedUserId = clubPlayerLookup.data?.[0]?.player?.user_id ?? null;

  if (!linkedUserId) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Only linked admins can be demoted.`);
  }

  const membershipLookup = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", club.id)
    .eq("user_id", linkedUserId)
    .limit(1);

  if (membershipLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(membershipLookup.error.message)}`);
  }

  const targetRole = membershipLookup.data?.[0]?.role ?? null;

  if (targetRole === CLUB_ROLE_OWNER) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Ownership must be transferred instead of demoted.`);
  }

  if (targetRole !== CLUB_ROLE_ADMIN) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=This member is not an admin.`);
  }

  const demoteResult = await supabaseAdmin
    .from("club_members")
    .update({ role: CLUB_ROLE_PLAYER })
    .eq("club_id", club.id)
    .eq("user_id", linkedUserId)
    .eq("role", CLUB_ROLE_ADMIN);

  if (demoteResult.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(demoteResult.error.message)}`);
  }

  revalidateClubViews(clubSlug);
  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Admin demoted to player successfully.")}`);
}

export async function transferClubOwnershipAction(formData) {
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
    club = await getAuthorizedClub(clubSlug, user.id, [CLUB_ROLE_OWNER]);
  } catch (error) {
    redirect(`/clubs/${clubSlug}/settings?error=${encodeURIComponent(error.message)}`);
  }

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(`id, player:players (user_id)`)
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .limit(1);

  if (clubPlayerLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubPlayerLookup.error.message)}`);
  }

  const nextOwnerUserId = clubPlayerLookup.data?.[0]?.player?.user_id ?? null;

  if (!nextOwnerUserId) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=Ownership can only be transferred to a linked account.`);
  }

  if (nextOwnerUserId === user.id) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=You already own this club.`);
  }

  const transferResult = await supabaseAdmin.rpc("transfer_club_ownership", {
    target_club_id: club.id,
    current_owner_user_id: user.id,
    new_owner_user_id: nextOwnerUserId,
  });

  if (transferResult.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(transferResult.error.message)}`);
  }

  revalidateClubViews(clubSlug);
  redirect(`/clubs/${clubSlug}/settings/edit?success=${encodeURIComponent("Ownership transferred successfully.")}`);
}

export async function approveClubJoinRequestAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const requestId = getString(formData, "request_id");
  const targetClubPlayerId = getString(formData, "target_club_player_id");
  const newPlayerName = getString(formData, "new_player_name");
  const returnTo = getString(formData, "return_to") || `/clubs/${clubSlug}/settings/edit`;

  if (!clubSlug || !requestId) {
    redirect(`${returnTo}?error=Invalid join request data.`);
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

  const requestLookup = await supabaseAdmin
    .from("club_join_requests")
    .select(
      `
        id,
        user_id,
        status
      `
    )
    .eq("id", requestId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (requestLookup.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(requestLookup.error.message)}`);
  }

  if (!requestLookup.data || requestLookup.data.status !== "pending") {
    redirect(`${returnTo}?error=Join request was not found or is no longer pending.`);
  }

  const requesterProfile = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", requestLookup.data.user_id)
    .maybeSingle();

  if (requesterProfile.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(requesterProfile.error.message)}`);
  }

  const targetUserId = requestLookup.data.user_id;
  const fallbackName =
    newPlayerName ||
    requesterProfile.data?.full_name ||
    requesterProfile.data?.email?.split("@")[0] ||
    "Player";

  try {
    if (targetClubPlayerId) {
      await attachUserToClubPlayer({
        clubId: club.id,
        clubPlayerId: targetClubPlayerId,
        userId: targetUserId,
        preferredName: fallbackName,
      });
    } else {
      await addUserToClubWithNewPlayer({
        clubId: club.id,
        userId: targetUserId,
        preferredName: fallbackName,
      });
    }
  } catch (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  const requestUpdate = await supabaseAdmin
    .from("club_join_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", requestId);

  if (requestUpdate.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(requestUpdate.error.message)}`);
  }

  revalidateClubViews(clubSlug);
  redirect(`${returnTo}?success=${encodeURIComponent("Join request approved successfully.")}`);
}

export async function rejectClubJoinRequestAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const requestId = getString(formData, "request_id");
  const returnTo = getString(formData, "return_to") || `/clubs/${clubSlug}/settings/edit`;

  if (!clubSlug || !requestId) {
    redirect(`${returnTo}?error=Invalid join request data.`);
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

  const requestUpdate = await supabaseAdmin
    .from("club_join_requests")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", requestId)
    .eq("club_id", club.id)
    .eq("status", "pending");

  if (requestUpdate.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(requestUpdate.error.message)}`);
  }

  revalidateClubViews(clubSlug);
  redirect(`${returnTo}?success=${encodeURIComponent("Join request rejected.")}`);
}

export async function dissolveClubAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const confirmationName = getString(formData, "confirmation_name");

  if (!clubSlug) {
    redirect("/?error=Club was not found.");
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
    club = await getAuthorizedClub(clubSlug, user.id, [CLUB_ROLE_OWNER]);
  } catch (error) {
    redirect(`/?error=${encodeURIComponent(error.message)}`);
  }

  const clubDetails = await supabaseAdmin
    .from("clubs")
    .select("id, name, image_url")
    .eq("id", club.id)
    .limit(1);

  if (clubDetails.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubDetails.error.message)}`);
  }

  const targetClub = clubDetails.data?.[0] ?? null;

  if (!targetClub) {
    redirect("/?error=Club was not found.");
  }

  if (!confirmationName || confirmationName !== targetClub.name) {
    redirect(
      `/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent("Type the exact club name to dissolve it.")}`
    );
  }

  const clubPlayersLookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        player_id,
        player:players (
          id,
          user_id
        )
      `
    )
    .eq("club_id", targetClub.id);

  if (clubPlayersLookup.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(clubPlayersLookup.error.message)}`);
  }

  const manualPlayerIds = (clubPlayersLookup.data ?? [])
    .filter((item) => !item.player?.user_id)
    .map((item) => item.player_id)
    .filter(Boolean);

  const deleteClub = await supabaseAdmin.from("clubs").delete().eq("id", targetClub.id);

  if (deleteClub.error) {
    redirect(`/clubs/${clubSlug}/settings/edit?error=${encodeURIComponent(deleteClub.error.message)}`);
  }

  const clubImageStoragePath = parseStoragePathFromPublicUrl(targetClub.image_url ?? "");

  if (clubImageStoragePath) {
    try {
      await deleteStorageObject(clubImageStoragePath);
    } catch {
      // Ignore storage cleanup failures after the club record is removed.
    }
  }

  for (const playerId of manualPlayerIds) {
    const remainingUsage = await supabaseAdmin
      .from("club_players")
      .select("id", { head: true, count: "exact" })
      .eq("player_id", playerId);

    if (!remainingUsage.error && remainingUsage.count === 0) {
      await supabaseAdmin
        .from("players")
        .delete()
        .eq("id", playerId)
        .is("user_id", null);
    }
  }

  revalidateClubViews(clubSlug);
  redirect(`/?success=${encodeURIComponent("Club dissolved successfully.")}`);
}
