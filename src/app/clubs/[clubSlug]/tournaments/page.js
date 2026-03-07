import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Trophy, Volleyball } from "lucide-react";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function StatusBadge({ status }) {
  const styles =
    status === "completed"
      ? "bg-[#7dff4f] text-[#0f2511]"
      : status === "in_progress"
        ? "bg-[#f6e16a] text-[#271b00]"
        : "bg-[#ff7a7a] text-[#321010]";

  const label =
    status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Upcoming";

  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${styles}`}>{label}</span>;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export const dynamic = "force-dynamic";

export default async function ClubTournamentsPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;

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

  const { data: tournaments, error: tournamentsError } = await supabase
    .from("tournaments")
    .select(
      `
        id,
        name,
        scheduled_at,
        status,
        format,
        category,
        seeding,
        entries:tournament_entries (
          id
        ),
        participants:tournament_players (
          id
        )
      `
    )
    .eq("club_id", club.id)
    .order("scheduled_at", { ascending: false });

  if (tournamentsError) {
    throw new Error(tournamentsError.message);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">Tournaments</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Track club tournaments and upcoming events. Tournament brackets will be added later.
            </p>
          </div>
          {club.role === "admin" ? (
            <Link
              href={`/clubs/${clubSlug}/tournaments/new`}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-2xl font-semibold text-white shadow-[0_12px_24px_rgba(2,14,28,0.28)] backdrop-blur-xl"
            >
              +
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      <div className="space-y-4">
        {(tournaments ?? []).length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/6 px-5 py-8 text-center text-white/70">
            No tournaments have been created for this club yet.
          </div>
        ) : (
          tournaments.map((tournament, index) => {
            const entrantCount =
              (tournament.entries ?? []).length > 0
                ? (tournament.entries ?? []).length
                : (tournament.participants ?? []).length;

            return (
            <Link
              key={tournament.id}
              href={`/clubs/${clubSlug}/tournaments/${tournament.id}`}
              className="block rounded-[2rem] bg-gradient-to-br from-[#14d4c6] to-[#1bc1df] px-5 py-5 text-[#072233] shadow-[0_22px_50px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[2rem] font-semibold leading-tight">{tournament.name}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#072233]/80">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDate(tournament.scheduled_at)}</span>
                  </div>
                </div>
                {index % 2 === 0 ? <Volleyball className="h-16 w-16 opacity-85" /> : <Trophy className="h-16 w-16 opacity-85" />}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <StatusBadge status={tournament.status} />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                  {tournament.category === "doubles" ? "Doubles" : "Singles"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#072233]/75">
                <span className="rounded-full bg-white/45 px-3 py-1">
                  {tournament.format === "round_robin" ? "Round Robin" : "Knockout"}
                </span>
                <span className="rounded-full bg-white/45 px-3 py-1">
                  {tournament.seeding === "elo_based" ? "Elo Based" : "Random"}
                </span>
                <span className="rounded-full bg-white/45 px-3 py-1">
                  {entrantCount} entrants
                </span>
              </div>
            </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
