import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTournamentAction, getAuthorizedTournament } from "@/app/clubs/[clubSlug]/tournaments/[tournamentId]/actions";
import TournamentSetupForm from "@/components/TournamentSetupForm";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

function toDateTimeLocal(value) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export const dynamic = "force-dynamic";

export default async function EditTournamentPage({ params, searchParams }) {
  const { clubSlug, tournamentId } = await params;
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
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent("Only admins can edit tournaments.")}`);
  }

  try {
    await getAuthorizedTournament(clubSlug, tournamentId, user.id);
  } catch (authError) {
    redirect(`/clubs/${clubSlug}/tournaments/${tournamentId}?error=${encodeURIComponent(authError.message)}`);
  }

  const [{ data: tournament, error: tournamentError }, { data: players, error: playersError }, { data: entryPlayers, error: entryPlayersError }, { data: legacyPlayers, error: legacyPlayersError }] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select("id, name, scheduled_at, format, category, seeding")
        .eq("id", tournamentId)
        .eq("club_id", club.id)
        .maybeSingle(),
      supabase
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
        .order("elo_current", { ascending: false }),
      supabase
        .from("tournament_entry_players")
        .select(
          `
            club_player_id,
            tournament_entry:tournament_entries!inner (
              tournament_id
            )
          `
        )
        .eq("tournament_entries.tournament_id", tournamentId),
      supabaseAdmin
        .from("tournament_players")
        .select("club_player_id")
        .eq("tournament_id", tournamentId),
    ]);

  if (tournamentError) throw new Error(tournamentError.message);
  if (playersError) throw new Error(playersError.message);
  if (entryPlayersError) throw new Error(entryPlayersError.message);
  if (legacyPlayersError) throw new Error(legacyPlayersError.message);

  if (!tournament) {
    notFound();
  }

  const selectedPlayerIds =
    (entryPlayers ?? []).length > 0
      ? [...new Set(entryPlayers.map((row) => row.club_player_id).filter(Boolean))]
      : [...new Set((legacyPlayers ?? []).map((row) => row.club_player_id).filter(Boolean))];

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Edit Tournament
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
            Updating a tournament will rebuild entrants and matches using the selected format and roster.
          </p>
        </div>
      </div>

      {/* Render the External Form Component */}
      <TournamentSetupForm
        action={updateTournamentAction}
        clubSlug={clubSlug}
        tournamentId={tournamentId}
        players={players ?? []}
        submitLabel="Save Tournament Changes"
        error={error}
        description="Changing the roster, format, or seeding will regenerate the tournament bracket or rounds."
        defaults={{
          name: tournament.name,
          scheduledAt: toDateTimeLocal(tournament.scheduled_at),
          format: tournament.format,
          category: tournament.category,
          seeding: tournament.seeding,
          playerIds: selectedPlayerIds,
        }}
      />
    </section>
  );
}