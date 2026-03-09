import { notFound, redirect } from "next/navigation";
import ClubCompareBuilder from "@/components/ClubCompareBuilder";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";

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

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

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

  const players = (roster ?? [])
    .map((entry) => ({
      id: entry.id,
      name: entry.player?.full_name ?? "Unknown player",
      avatarUrl: entry.player?.avatar_url ?? "",
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
      })
    );

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col-reverse items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Compare Players
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Select two players from <span className="font-bold text-teal-400">{club.name}</span> to compare their head-to-head stats and performance.
            </p>
          </div>
        </div>
      </div>

      {/* Compare Tool Builder */}
      <div className="relative z-10">
        <ClubCompareBuilder clubSlug={clubSlug} players={players} />
      </div>
    </section>
  );
}
