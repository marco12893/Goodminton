import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClubBottomNav from "@/components/ClubBottomNav";
import ClubHeader from "@/components/ClubHeader";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseClientForCache } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Cache searchable players data
const getCachedSearchablePlayers = unstable_cache(
  async (clubId, cookieStore) => {
    const supabase = createSupabaseClientForCache(cookieStore);
    const { data: searchablePlayers, error: searchablePlayersError } = await supabase
      .from("club_players")
      .select(
        `
          id,
          elo_current,
          total_matches,
          player:players (
            full_name,
            avatar_url
          )
        `
      )
      .eq("club_id", clubId)
      .eq("status", "active")
      .order("elo_current", { ascending: false })
      .order("created_at", { ascending: true });

    if (searchablePlayersError) {
      throw new Error(searchablePlayersError.message);
    }

    return (searchablePlayers ?? []).map((row) => ({
      id: row.id,
      fullName: row.player?.full_name ?? "Unknown player",
      avatarUrl: row.player?.avatar_url ?? "",
      elo: row.elo_current ?? 1000,
      totalMatches: row.total_matches ?? 0,
    }));
  },
  ['searchable-players'],
  {
    revalidate: 300, // 5 minutes
    tags: ['club-players']
  }
);

export default async function ClubLayout({ children, params }) {
  const { clubSlug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) {
    notFound();
  }

  const preparedSearchablePlayers = await getCachedSearchablePlayers(club.id, cookieStore);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />
      <div className="absolute inset-0 bg-[url('/background/photo-1722087642932-9b070e9a066e.webp')] bg-cover bg-center opacity-12 mix-blend-screen" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-4 pt-4">
        <ClubHeader club={club} searchablePlayers={preparedSearchablePlayers} />

        <div className="flex flex-1 flex-col gap-5 pb-24 pt-6">{children}</div>

        <ClubBottomNav clubSlug={clubSlug} />
      </div>
    </main>
  );
}
