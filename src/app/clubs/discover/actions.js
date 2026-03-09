"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getClubBySlug } from "@/lib/clubJoin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateClubJoinViews(clubSlug) {
  revalidateTag("user-clubs");
  revalidateTag("club-players");
  revalidatePath("/");
  revalidatePath("/clubs/discover");
  revalidatePath(`/clubs/${clubSlug}`, "layout");
  revalidatePath(`/clubs/${clubSlug}`);
  revalidatePath(`/clubs/${clubSlug}/settings`);
}

export async function requestClubJoinAction(formData) {
  const clubSlug = getString(formData, "club_slug");

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

  if (club.join_mode !== "approval") {
    redirect("/clubs/discover?error=This club does not accept approval requests.");
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

  const requestLookup = await supabaseAdmin
    .from("club_join_requests")
    .select("id, status")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .limit(1);

  if (requestLookup.error) {
    redirect(`/clubs/discover?error=${encodeURIComponent(requestLookup.error.message)}`);
  }

  const existingRequest = requestLookup.data?.[0] ?? null;

  if (existingRequest?.status === "pending") {
    redirect("/clubs/discover?success=Your join request is already pending.");
  }

  if (existingRequest) {
    const requestUpdate = await supabaseAdmin
      .from("club_join_requests")
      .update({
        status: "pending",
        resolved_at: null,
        resolved_by: null,
      })
      .eq("id", existingRequest.id);

    if (requestUpdate.error) {
      redirect(`/clubs/discover?error=${encodeURIComponent(requestUpdate.error.message)}`);
    }
  } else {
    const requestInsert = await supabaseAdmin.from("club_join_requests").insert({
      club_id: club.id,
      user_id: user.id,
      status: "pending",
    });

    if (requestInsert.error) {
      redirect(`/clubs/discover?error=${encodeURIComponent(requestInsert.error.message)}`);
    }
  }

  revalidateClubJoinViews(club.slug);
  redirect("/clubs/discover?success=Join request submitted successfully.");
}
