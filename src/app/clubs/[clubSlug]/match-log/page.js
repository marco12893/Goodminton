import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  approveMatchLogAction,
  deleteMatchLogAction,
  rejectMatchLogAction,
} from "@/app/clubs/[clubSlug]/match-log/actions";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const MATCHES_PER_PAGE = 10;

function StatusBadge({ status }) {
  const styles =
    status === "approved"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
      : status === "rejected"
        ? "border-rose-300/20 bg-rose-300/10 text-rose-200"
        : "border-amber-300/20 bg-amber-300/10 text-amber-200";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles}`}>
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
      ? "border-emerald-300/20 bg-emerald-300/12 text-emerald-200"
      : tone === "loss"
        ? "border-rose-300/20 bg-rose-300/12 text-rose-200"
        : "border-white/15 bg-white/8 text-white";

  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-2xl border px-4 py-3 text-3xl font-bold tracking-tight sm:min-w-20 sm:text-4xl ${styles}`}
    >
      {score}
    </span>
  );
}

function EloDeltaBadge({ value }) {
  const styles =
    value > 0
      ? "border-emerald-300/20 bg-emerald-300/12 text-emerald-200"
      : value < 0
        ? "border-rose-300/20 bg-rose-300/12 text-rose-200"
        : "border-white/12 bg-white/7 text-white/65";

  const label = value > 0 ? `+${value}` : `${value}`;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.08em] ${styles}`}
    >
      {label} Elo
    </span>
  );
}

function buildMatchLogUrl(clubSlug, options = {}) {
  const params = new URLSearchParams();

  if (options.dateFrom) {
    params.set("date_from", options.dateFrom);
  }

  if (options.dateTo) {
    params.set("date_to", options.dateTo);
  }

  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.success) {
    params.set("success", options.success);
  }

  if (options.error) {
    params.set("error", options.error);
  }

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

  let countQuery = supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id);

  let matchesQuery = supabase
    .from("matches")
    .select(
      `
        id,
        match_date,
        played_at,
        team1_score,
        team2_score,
        status,
        created_by,
        participants:match_participants (
          team,
          slot,
          elo_delta,
          club_player:club_players (
            id,
            player:players (
              full_name
            )
          )
        )
      `
    )
    .eq("club_id", club.id)
    .order("played_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (dateFrom) {
    countQuery = countQuery.gte("match_date", dateFrom);
    matchesQuery = matchesQuery.gte("match_date", dateFrom);
  }
  if (dateTo) {
    countQuery = countQuery.lte("match_date", dateTo);
    matchesQuery = matchesQuery.lte("match_date", dateTo);
  }

  const [{ count: totalMatches, error: countError }, { data: matches, error: matchesError }] =
    await Promise.all([countQuery, matchesQuery]);

  if (countError) {
    throw new Error(countError.message);
  }

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const totalPages = Math.max(1, Math.ceil((totalMatches ?? 0) / MATCHES_PER_PAGE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const normalizedMatches = (matches ?? []).map((match) => {
    const team1 = match.participants
      ?.filter((participant) => participant.team === 1)
      .sort((a, b) => a.slot - b.slot)
      .map((participant) => ({
        fullName: participant.club_player?.player?.full_name,
        eloDelta: participant.elo_delta ?? 0,
      }))
      .filter((participant) => participant.fullName) ?? [];

    const team2 = match.participants
      ?.filter((participant) => participant.team === 2)
      .sort((a, b) => a.slot - b.slot)
      .map((participant) => ({
        fullName: participant.club_player?.player?.full_name,
        eloDelta: participant.elo_delta ?? 0,
      }))
      .filter((participant) => participant.fullName) ?? [];

    return {
      ...match,
      team1,
      team2,
      team1EloDelta: team1[0]?.eloDelta ?? 0,
      team2EloDelta: team2[0]?.eloDelta ?? 0,
    };
  });

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">Match Log</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Track every club match. Member submissions start as pending unless an admin creates them.
            </p>
          </div>
          <Link
            href={`/clubs/${clubSlug}/match-log/new`}
            className="flex aspect-square h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8 text-2xl font-semibold text-white shadow-[0_12px_24px_rgba(2,14,28,0.28)] backdrop-blur-xl hover:bg-white/12 transition-all duration-200"
          >
            +
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.9),rgba(5,12,22,0.94))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.28)] backdrop-blur-xl"
      >
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45">
              From
            </span>
            <input
              type="date"
              name="date_from"
              defaultValue={dateFrom}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-white/45">
              To
            </span>
            <input
              type="date"
              name="date_to"
              defaultValue={dateTo}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-sm font-semibold text-[#062232]">
            Apply filters
          </button>
          <Link
            href={buildMatchLogUrl(clubSlug)}
            className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white/85"
          >
            Clear filters
          </Link>
        </div>
      </form>

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

      <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/68">
        <p>
          Showing {normalizedMatches.length === 0 ? 0 : rangeFrom + 1}-
          {Math.min(rangeFrom + normalizedMatches.length, totalMatches ?? 0)} of {totalMatches ?? 0} matches
        </p>
        <p>
          Page {Math.min(currentPage, totalPages)} of {totalPages}
        </p>
      </div>

      <div className="space-y-4">
        {normalizedMatches.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/6 px-5 py-8 text-center text-white/70">
            No matches have been submitted yet.
          </div>
        ) : (
          normalizedMatches.map((match) => (
            <article
              key={match.id}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)] backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/60">{formatPlayedAt(match.played_at)}</p>
                </div>
                <StatusBadge status={match.status} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/45">Team 1</p>
                    {match.status === "approved" ? <EloDeltaBadge value={match.team1EloDelta} /> : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {match.team1.map((player) => (
                      <p key={player.fullName} className="text-base font-semibold text-white">
                        {player.fullName}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="text-center text-[11px] uppercase tracking-[0.3em] text-white/45">
                    score
                  </div>
                  <div className="flex items-center gap-2">
                    <ScorePill
                      score={match.team1_score}
                      tone={
                        match.team1_score > match.team2_score
                          ? "win"
                          : match.team1_score < match.team2_score
                            ? "loss"
                            : "neutral"
                      }
                    />
                    <span className="text-lg font-semibold text-white/35">-</span>
                    <ScorePill
                      score={match.team2_score}
                      tone={
                        match.team2_score > match.team1_score
                          ? "win"
                          : match.team2_score < match.team1_score
                            ? "loss"
                            : "neutral"
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm uppercase tracking-[0.18em] text-white/45">Team 2</p>
                    {match.status === "approved" ? <EloDeltaBadge value={match.team2EloDelta} /> : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {match.team2.map((player) => (
                      <p key={player.fullName} className="text-base font-semibold text-white">
                        {player.fullName}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {club.role === "admin" && match.status === "pending" ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <form action={approveMatchLogAction} className="sm:flex-1">
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="match_id" value={match.id} />
                    <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-4 py-3 text-sm font-semibold text-[#062232]">
                      Approve match
                    </button>
                  </form>
                  <form action={rejectMatchLogAction} className="sm:flex-1">
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="match_id" value={match.id} />
                    <button className="w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/85">
                      Reject match
                    </button>
                  </form>
                </div>
              ) : null}

              {club.role === "admin" ? (
                <div className="mt-4">
                  <form action={deleteMatchLogAction}>
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="match_id" value={match.id} />
                    <button className="w-full rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                      Delete match
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {totalMatches ? (
        <div className="flex items-center justify-between gap-3">
          {previousPage ? (
            <Link
              href={buildMatchLogUrl(clubSlug, {
                dateFrom,
                dateTo,
                page: previousPage,
              })}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/85"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/30">
              Previous
            </span>
          )}

          {nextPage ? (
            <Link
              href={buildMatchLogUrl(clubSlug, {
                dateFrom,
                dateTo,
                page: nextPage,
              })}
              className="rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-sm font-semibold text-[#062232]"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white/30">
              Next
            </span>
          )}
        </div>
      ) : null}
    </section>
  );
}
