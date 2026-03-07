import { notFound, redirect } from "next/navigation";
import ClubCompareBuilder from "@/components/ClubCompareBuilder";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubComparePage({ params }) {
  const { clubSlug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const club = await getClubPageData(supabase, user, clubSlug);

  if (!club) {
    notFound();
  }

  const { data: roster, error } = await supabase
    .from("club_players")
    .select(
      `
        id,
        player:players (
          full_name,
          avatar_url
        )
      `
    )
    .eq("club_id", club.id)
    .eq("status", "active")
    .order("full_name", { referencedTable: "players", ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const players = (roster ?? []).map((entry) => ({
    id: entry.id,
    name: entry.player?.full_name ?? "Unknown player",
    avatarUrl: entry.player?.avatar_url ?? "",
  }));

  return <ClubCompareBuilder clubSlug={clubSlug} players={players} />;
}
