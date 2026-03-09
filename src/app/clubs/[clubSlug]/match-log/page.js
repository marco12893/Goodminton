import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  approveMatchLogAction,
  deleteMatchLogAction,
  rejectMatchLogAction,
} from "@/app/clubs/[clubSlug]/match-log/actions";
import { isClubManager } from "@/lib/clubRoles";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Calendar, Filter, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";

const MATCHES_PER_PAGE = 10;

function StatusBadge({ status }) {
  const styles =
    status === "approved"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "rejected"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
        : "border-amber-500/20 bg-amber-500/10 text-amber-400";

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${styles}`}>
      {status}
    </span>
  );
}

function formatPlayedAt(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ScorePill({ score, tone }) {
  const styles =
    tone === "win"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : tone === "loss"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
        : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-xl border px-2 py-2 font-mono text-2xl font-black tracking-tighter sm:min-w-[4rem] sm:text-3xl ${styles}`}>
      {score}
    </span>
  );
}

function EloDeltaBadge({ value }) {
  const styles =
    value > 0
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : value < 0
        ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
        : "border-white/10 bg-white/5 text-slate-400";

  const label = value > 0 ? `+${value}` : `${value}`;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${styles}`}>
      {label} Elo
    </span>
  );
}

function buildMatchLogUrl(clubSlug, options = {}) {
  const params = new URLSearchParams();
  if (options.dateFrom) params.set("date_from", options.dateFrom);
  if (options.dateTo) params.set("date_to", options.dateTo);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  if (options.success) params.set("success", options.success);
  if (options.error) params.set("error", options.error);
  const query = params.toString();
  return query ? `/clubs/${clubSlug}/match-log?${query}` : `/clubs/${clubSlug}/match-log`;
}

export default async function ClubMatchLogPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;
  const dateFrom = query?.date_from ?? "";
  const dateTo = query?.date_to ?? "";
  const parsedPage = Number.parseInt(String(query?.page ?? "1"), 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const rangeFrom = (currentPage - 1) * MATCHES_PER_PAGE;
  const rangeTo = rangeFrom + MATCHES_PER_PAGE - 1;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  let countQuery = supabase.from("matches").select("id", { count: "exact", head: true }).eq("club_id", club.id);
  let matchesQuery = supabase.from("matches").select(`id, match_date, played_at, team1_score, team2_score, status, created_by, participants:match_participants (team, slot, elo_delta, club_player:club_players (id, player:players (full_name)))`).eq("club_id", club.id).order("played_at", { ascending: false }).range(rangeFrom, rangeTo);

  if (dateFrom) { countQuery = countQuery.gte("match_date", dateFrom); matchesQuery = matchesQuery.gte("match_date", dateFrom); }
  if (dateTo) { countQuery = countQuery.lte("match_date", dateTo); matchesQuery = matchesQuery.lte("match_date", dateTo); }

  const [{ count: totalMatches, error: countError }, { data: matches, error: matchesError }] = await Promise.all([countQuery, matchesQuery]);

  if (countError || matchesError) throw new Error(countError?.message || matchesError?.message);

  const totalPages = Math.max(1, Math.ceil((totalMatches ?? 0) / MATCHES_PER_PAGE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const normalizedMatches = (matches ?? []).map((match) => {
    const getTeam = (teamId) => match.participants?.filter(p => p.team === teamId).sort((a, b) => a.slot - b.slot).map(p => ({ fullName: p.club_player?.player?.full_name, eloDelta: p.elo_delta ?? 0 })).filter(p => p.fullName) ?? [];
    const team1 = getTeam(1);
    const team2 = getTeam(2);
    return { ...match, team1, team2, team1EloDelta: team1[0]?.eloDelta ?? 0, team2EloDelta: team2[0]?.eloDelta ?? 0 };
  });

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Club Match Log</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Review and manage every match. Submissions require admin approval to affect ELO.
            </p>
          </div>
          <Link
            href={`/clubs/${clubSlug}/match-log/new`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <form method="get" className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-teal-400">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter by Date</span>
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="date" name="date_from" defaultValue={dateFrom} className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="date" name="date_to" defaultValue={dateTo} className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/15 active:scale-[0.98]">Apply Filters</button>
          <Link href={buildMatchLogUrl(clubSlug)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-center text-xs font-bold text-slate-400 transition-all hover:bg-white/5">Clear</Link>
        </div>
      </form>

      {/* Feedback Messages */}
      <div className="space-y-3 empty:hidden">
        {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">{success}</div>}
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        <p>Showing {normalizedMatches.length === 0 ? 0 : rangeFrom + 1}-{Math.min(rangeFrom + normalizedMatches.length, totalMatches ?? 0)} of {totalMatches ?? 0}</p>
        <p>Page {currentPage} / {totalPages}</p>
      </div>

      {/* Match Cards List */}
      <div className="space-y-5">
        {normalizedMatches.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-12 text-center font-medium text-slate-500 backdrop-blur-sm">No matches found matching your criteria.</div>
        ) : (
          normalizedMatches.map((match) => (
            <article key={match.id} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl transition-all hover:border-white/20">
              <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-6 py-4">
                <span className="text-xs font-bold text-slate-500">{formatPlayedAt(match.played_at)}</span>
                <StatusBadge status={match.status} />
              </div>

              <div className="p-6">
                <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  {/* Team 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Team 1</span>
                      {match.status === "approved" && <EloDeltaBadge value={match.team1EloDelta} />}
                    </div>
                    {match.team1.map(p => <p key={p.fullName} className="truncate text-base font-bold text-white">{p.fullName}</p>)}
                  </div>

                  {/* VS / Score */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <ScorePill score={match.team1_score} tone={match.team1_score > match.team2_score ? "win" : "loss"} />
                      <span className="text-xl font-black text-slate-700">-</span>
                      <ScorePill score={match.team2_score} tone={match.team2_score > match.team1_score ? "win" : "loss"} />
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="space-y-3 sm:text-right">
                    <div className="flex flex-row-reverse items-center justify-between sm:flex-row">
                      {match.status === "approved" && <EloDeltaBadge value={match.team2EloDelta} />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Team 2</span>
                    </div>
                    {match.team2.map(p => <p key={p.fullName} className="truncate text-base font-bold text-white">{p.fullName}</p>)}
                  </div>
                </div>

                {/* Admin Actions Footer */}
                {isClubManager(club.role) && (
                  <div className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-end">
                    {match.status === "pending" && (
                      <>
                        <form action={approveMatchLogAction} className="sm:w-36">
                          <input type="hidden" name="club_slug" value={clubSlug} />
                          <input type="hidden" name="match_id" value={match.id} />
                          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500/10 px-4 py-2.5 text-xs font-bold text-teal-400 transition-colors hover:bg-teal-500/20">
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </button>
                        </form>
                        <form action={rejectMatchLogAction} className="sm:w-36">
                          <input type="hidden" name="club_slug" value={clubSlug} />
                          <input type="hidden" name="match_id" value={match.id} />
                          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/20">
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </form>
                      </>
                    )}
                    <form action={deleteMatchLogAction} className="sm:w-36">
                      <input type="hidden" name="club_slug" value={clubSlug} />
                      <input type="hidden" name="match_id" value={match.id} />
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/20">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {totalMatches > 0 && (
        <div className="flex items-center justify-between gap-4 pt-4">
          <Link href={buildMatchLogUrl(clubSlug, { dateFrom, dateTo, page: previousPage })} className={`flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm font-bold transition-all ${!previousPage ? "pointer-events-none opacity-20" : "hover:bg-white/10 active:scale-95 text-white"}`}>Previous</Link>
          <Link href={buildMatchLogUrl(clubSlug, { dateFrom, dateTo, page: nextPage })} className={`flex-1 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 py-4 text-center text-sm font-bold text-slate-900 shadow-lg shadow-cyan-500/20 transition-all ${!nextPage ? "pointer-events-none opacity-20" : "hover:opacity-90 active:scale-95"}`}>Next Page</Link>
        </div>
      )}
    </section>
  );
}
