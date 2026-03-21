"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CLUB_ROLE_ADMIN, CLUB_ROLE_OWNER, CLUB_ROLE_SPECTATOR } from "@/lib/clubRoles";
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
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const membership =
    (data ?? []).find(
      (item) => item.club?.slug === clubSlug && [CLUB_ROLE_OWNER, CLUB_ROLE_ADMIN].includes(item.role)
    ) ?? null;

  if (!membership?.club?.id) {
    throw new Error("You do not have access to manage this club.");
  }

  return {
    ...membership.club,
    role: membership.role,
  };
}

export async function demotePlayerToSpectatorAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const clubPlayerId = getString(formData, "club_player_id");

  if (!clubSlug || !clubPlayerId) {
    redirect(`/clubs/${clubSlug}?error=Invalid player data.`);
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
    redirect(`/clubs/${clubSlug}?error=${encodeURIComponent(error.message)}`);
  }

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        club_id,
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
    redirect(`/clubs/${clubSlug}?error=Club player was not found.`);
  }

  const linkedUserId = clubPlayerLookup.data.player?.user_id ?? null;

  if (!linkedUserId) {
    redirect(`/clubs/${clubSlug}?error=Only linked accounts can be converted to spectators.`);
  }

  const targetMembershipLookup = await supabaseAdmin
    .from("club_members")
    .select("role")
    .eq("club_id", club.id)
    .eq("user_id", linkedUserId)
    .limit(1);

  if (targetMembershipLookup.error) {
    redirect(`/clubs/${clubSlug}?error=${encodeURIComponent(targetMembershipLookup.error.message)}`);
  }

  const targetRole = targetMembershipLookup.data?.[0]?.role ?? null;

  if (targetRole === CLUB_ROLE_OWNER || targetRole === CLUB_ROLE_ADMIN) {
    redirect(`/clubs/${clubSlug}?error=Admins and owners cannot be demoted to spectator.`);
  }

  const membershipUpdate = await supabaseAdmin
    .from("club_members")
    .update({ role: CLUB_ROLE_SPECTATOR })
    .eq("club_id", club.id)
    .eq("user_id", linkedUserId);

  if (membershipUpdate.error) {
    redirect(`/clubs/${clubSlug}?error=${encodeURIComponent(membershipUpdate.error.message)}`);
  }

  revalidateTag("club-players");
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath(`/clubs/${clubSlug}/settings`);
  revalidatePath(`/clubs/${clubSlug}/settings/edit`);
  revalidatePath(`/clubs/${clubSlug}/players/${clubPlayerId}`);

  redirect(`/clubs/${clubSlug}/settings?success=${encodeURIComponent("Player converted to spectator.")}`);
}
