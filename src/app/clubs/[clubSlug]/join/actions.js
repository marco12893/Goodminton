"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  addUserToClubWithNewPlayer,
  attachUserToClubPlayer,
  ensureClubMember,
  getClubBySlug,
} from "@/lib/clubJoin";
import { CLUB_ROLE_PLAYER, CLUB_ROLE_SPECTATOR } from "@/lib/clubRoles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function getJoinRole(formData) {
  const value = getString(formData, "join_role") || CLUB_ROLE_PLAYER;
  return value === CLUB_ROLE_SPECTATOR ? CLUB_ROLE_SPECTATOR : CLUB_ROLE_PLAYER;
}

function revalidateClubJoinViews(clubSlug) {
  revalidateTag("user-clubs");
  revalidateTag("club-players");
  revalidatePath("/");
  revalidatePath("/clubs/discover");
  revalidatePath(`/join-club/${clubSlug}`);
  revalidatePath(`/clubs/${clubSlug}`, "layout");
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath(`/clubs/${clubSlug}/settings`);
}

export async function joinOpenClubAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const targetClubPlayerId = getString(formData, "target_club_player_id");
  const newPlayerName = getString(formData, "new_player_name");
  const joinRole = getJoinRole(formData);

  if (!clubSlug) {
    redirect("/clubs/discover?error=Club was not found.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const club = await getClubBySlug(clubSlug);

  if (!club) {
    redirect("/clubs/discover?error=Club was not found.");
  }

  if (club.join_mode !== "open") {
    redirect(`/clubs/discover?error=${encodeURIComponent("This club is not open for direct joining.")}`);
  }

  const membershipLookup = await supabaseAdmin
    .from("club_members")
    .select("id")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .limit(1);

  if (membershipLookup.error) {
    redirect(`/clubs/discover?error=${encodeURIComponent(membershipLookup.error.message)}`);
  }

  if (membershipLookup.data?.length) {
    redirect(`/clubs/${club.slug}`);
  }

  if (joinRole === CLUB_ROLE_PLAYER && !targetClubPlayerId && !newPlayerName) {
    redirect(`/join-club/${club.slug}?error=Choose an existing player or create a new one.`);
  }

  try {
    if (joinRole === CLUB_ROLE_SPECTATOR) {
      await ensureClubMember({ clubId: club.id, userId: user.id, role: CLUB_ROLE_SPECTATOR });
    } else if (targetClubPlayerId) {
      await attachUserToClubPlayer({
        clubId: club.id,
        clubPlayerId: targetClubPlayerId,
        userId: user.id,
        preferredName: newPlayerName || undefined,
      });
    } else {
      await addUserToClubWithNewPlayer({
        clubId: club.id,
        userId: user.id,
        preferredName: newPlayerName,
      });
    }
  } catch (error) {
    redirect(`/join-club/${club.slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateClubJoinViews(club.slug);
  redirect(`/clubs/${club.slug}`);
}
