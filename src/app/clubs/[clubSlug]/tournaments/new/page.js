import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createTournamentAction } from "@/app/clubs/[clubSlug]/tournaments/new/actions";
import TournamentSetupForm from "@/components/TournamentSetupForm";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const club = await getClubPageData(supabase, user, clubSlug);

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
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">Create Tournament</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Choose the format, seeding, and participating players for your next club event.
            </p>
          </div>
          <Link href={`/clubs/${clubSlug}/tournaments`} className="text-sm font-medium text-[#17dccb]">
            Back
          </Link>
        </div>
      </div>

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
