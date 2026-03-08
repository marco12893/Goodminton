import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTournamentAction } from "@/app/clubs/[clubSlug]/tournaments/new/actions";
import TournamentSetupForm from "@/components/TournamentSetupForm";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;

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

  if (club.role !== "admin") {
    redirect(`/clubs/${clubSlug}/tournaments?error=${encodeURIComponent("Only admins can create tournaments.")}`);
  }

  const { data: players, error: playersError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        elo_current,
        player:players (
          full_name
        )
      `
    )
    .eq("club_id", club.id)
    .eq("status", "active")
    .order("elo_current", { ascending: false });

  if (playersError) {
    throw new Error(playersError.message);
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col-reverse items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Create Tournament
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Choose the format, seeding, and participating players for your next club event.
            </p>
          </div>
          <Link
            href={`/clubs/${clubSlug}/tournaments`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Render the External Form Component */}
      <TournamentSetupForm
        action={createTournamentAction}
        clubSlug={clubSlug}
        players={players ?? []}
        submitLabel="Create Tournament"
        error={error}
        description="For doubles, players will be paired into entrants after you submit the selected roster."
      />
    </section>
  );
}