import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Trophy, Volleyball } from "lucide-react";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

function StatusBadge({ status }) {
  const styles =
    status === "completed"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "in_progress"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
        : "border-blue-500/20 bg-blue-500/10 text-blue-400";

  const label =
    status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Upcoming";

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${styles}`}>
      {label}
    </span>
  );
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

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

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
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Tournaments</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Track club tournaments and upcoming events. Tournament brackets will be added later.
            </p>
          </div>
          {club.role === "admin" ? (
            <Link
              href={`/clubs/${clubSlug}/tournaments/new`}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-3xl font-light text-slate-900 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 hover:opacity-90 hover:shadow-cyan-500/40 active:scale-95"
            >
              +
            </Link>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 empty:hidden">
        {error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm font-medium text-rose-200 backdrop-blur-md">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-200 backdrop-blur-md">
            {success}
          </div>
        ) : null}
      </div>

      {/* Tournament List */}
      <div className="space-y-5">
        {(tournaments ?? []).length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-10 text-center font-medium text-slate-400 backdrop-blur-md">
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
                className="group relative block overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
              >
                {/* Top Accent Line on Hover */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-mono text-2xl font-bold text-white transition-colors group-hover:text-teal-300">
                      {tournament.name}
                    </h2>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-400">
                      <CalendarDays className="h-4 w-4 text-teal-500" />
                      <span>{formatDate(tournament.scheduled_at)}</span>
                    </div>
                  </div>
                  
                  {/* Icon Box */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900/50 text-slate-500 shadow-inner ring-1 ring-white/5 transition-colors group-hover:bg-teal-500/10 group-hover:text-teal-400 group-hover:ring-teal-500/30">
                    {index % 2 === 0 ? <Volleyball className="h-7 w-7" /> : <Trophy className="h-7 w-7" />}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-5">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tournament.status} />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {tournament.category === "doubles" ? "Doubles" : "Singles"}
                    </span>
                  </div>

                  {/* Info Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors group-hover:bg-white/10 group-hover:text-slate-200">
                      {tournament.format === "round_robin" ? "Round Robin" : "Knockout"}
                    </span>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors group-hover:bg-white/10 group-hover:text-slate-200">
                      {tournament.seeding === "elo_based" ? "Elo Based" : "Random"}
                    </span>
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors group-hover:bg-white/10 group-hover:text-slate-200">
                      {entrantCount} entrants
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}