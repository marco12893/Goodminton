"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CLUB_ROLE_OWNER } from "@/lib/clubRoles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPublicImageUrl, deleteStorageObject } from "@/lib/storageUploads";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CLUB_JOIN_MODES = new Set(["invite_only", "approval", "open"]);

async function buildUniqueSlug(name) {
  const base = slugify(name) || "club";
  const { data: existing, error } = await supabaseAdmin
    .from("clubs")
    .select("slug")
    .ilike("slug", `${base}%`);

  if (error) {
    throw new Error(error.message);
  }

  const slugs = new Set((existing ?? []).map((club) => club.slug));
  if (!slugs.has(base)) {
    return base;
  }

  let counter = 2;
  while (slugs.has(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

export async function createClubAction(formData) {
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const playSchedule = getString(formData, "play_schedule");
  const description = getString(formData, "description");
  const joinMode = getString(formData, "join_mode") || "invite_only";
  const imageUrl = getString(formData, "image_url") || null;
  const imageStoragePath = getString(formData, "image_storage_path") || null;

  if (!name) {
    redirect("/clubs/new?error=Club name is required.");
  }

  if (!CLUB_JOIN_MODES.has(joinMode)) {
    redirect("/clubs/new?error=Choose a valid join mode.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = await buildUniqueSlug(name);

  const clubInsert = await supabaseAdmin
    .from("clubs")
    .insert({
      name,
      slug,
      city: location || null,
      location: location || null,
      play_schedule: playSchedule || null,
      description: description || null,
      join_mode: joinMode,
      image_url: imageUrl || null,
    })
    .select()
    .single();

  if (clubInsert.error) {
    redirect(`/clubs/new?error=${encodeURIComponent(clubInsert.error.message)}`);
  }

  const club = clubInsert.data;

  if (imageStoragePath && imageUrl !== buildPublicImageUrl(imageStoragePath)) {
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent("Uploaded club image could not be verified.")}`);
  }

  const membershipInsert = await supabaseAdmin.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: CLUB_ROLE_OWNER,
  });

  if (membershipInsert.error) {
    if (imageStoragePath) {
      await deleteStorageObject(imageStoragePath).catch(() => {});
    }
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(membershipInsert.error.message)}`);
  }

  const playerLookup = await supabaseAdmin
    .from("players")
    .select("id, full_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (playerLookup.error) {
    if (imageStoragePath) {
      await deleteStorageObject(imageStoragePath).catch(() => {});
    }
    await supabaseAdmin.from("club_members").delete().eq("club_id", club.id);
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(playerLookup.error.message)}`);
  }

  let playerId = playerLookup.data?.[0]?.id ?? null;

  if (!playerId) {
    const fallbackName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Player";

    const playerInsert = await supabaseAdmin
      .from("players")
      .insert({
        user_id: user.id,
        full_name: fallbackName,
      })
      .select("id")
      .single();

    if (playerInsert.error) {
      if (imageStoragePath) {
        await deleteStorageObject(imageStoragePath).catch(() => {});
      }
      await supabaseAdmin.from("club_members").delete().eq("club_id", club.id);
      await supabaseAdmin.from("clubs").delete().eq("id", club.id);
      redirect(`/clubs/new?error=${encodeURIComponent(playerInsert.error.message)}`);
    }

    playerId = playerInsert.data.id;
  }

  const clubPlayerInsert = await supabaseAdmin.from("club_players").upsert(
    [
      {
        club_id: club.id,
        player_id: playerId,
        joined_at: new Date().toISOString().slice(0, 10),
        status: "active",
      },
    ],
    {
      onConflict: "club_id,player_id",
    }
  );

  if (clubPlayerInsert.error) {
    if (imageStoragePath) {
      await deleteStorageObject(imageStoragePath).catch(() => {});
    }
    await supabaseAdmin.from("club_members").delete().eq("club_id", club.id);
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(clubPlayerInsert.error.message)}`);
  }

  revalidateTag("user-clubs");
  revalidateTag("club-players");
  revalidatePath("/");
  revalidatePath(`/clubs/${club.slug}`, "layout");
  redirect("/");
}
