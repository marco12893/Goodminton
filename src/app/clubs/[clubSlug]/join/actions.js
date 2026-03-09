"use server";

import { redirect } from "next/navigation";
import {
  addUserToClubWithNewPlayer,
  attachUserToClubPlayer,
  getClubBySlug,
} from "@/lib/clubJoin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export async function joinOpenClubAction(formData) {
  const clubSlug = getString(formData, "club_slug");
  const targetClubPlayerId = getString(formData, "target_club_player_id");
  const newPlayerName = getString(formData, "new_player_name");

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
    .maybeSingle();

  if (membershipLookup.error) {
    redirect(`/clubs/discover?error=${encodeURIComponent(membershipLookup.error.message)}`);
  }

  if (membershipLookup.data) {
    redirect(`/clubs/${club.slug}`);
  }

  if (!targetClubPlayerId && !newPlayerName) {
    redirect(`/join-club/${club.slug}?error=Choose an existing player or create a new one.`);
  }

  try {
    if (targetClubPlayerId) {
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

  redirect(`/clubs/${club.slug}`);
}
