"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

  if (!name) {
    redirect("/clubs/new?error=Nama club wajib diisi.");
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
      image_url: null,
    })
    .select()
    .single();

  if (clubInsert.error) {
    redirect(`/clubs/new?error=${encodeURIComponent(clubInsert.error.message)}`);
  }

  const club = clubInsert.data;

  const membershipInsert = await supabaseAdmin.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "admin",
  });

  if (membershipInsert.error) {
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(membershipInsert.error.message)}`);
  }

  const playerLookup = await supabaseAdmin
    .from("players")
    .select("id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerLookup.error) {
    await supabaseAdmin.from("club_members").delete().eq("club_id", club.id);
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(playerLookup.error.message)}`);
  }

  let playerId = playerLookup.data?.id;

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
    await supabaseAdmin.from("club_members").delete().eq("club_id", club.id);
    await supabaseAdmin.from("clubs").delete().eq("id", club.id);
    redirect(`/clubs/new?error=${encodeURIComponent(clubPlayerInsert.error.message)}`);
  }

  redirect("/");
}
