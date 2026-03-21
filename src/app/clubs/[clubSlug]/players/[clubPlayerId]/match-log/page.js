import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { FullscreenNavLink } from "@/components/FullscreenNavOverlay";

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

function ScorePill({ score, tone }) {
  const styles =
    tone === "win"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
      : tone === "loss"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
        : "border-white/10 bg-white/5 text-slate-300";

  return (
    <span
      className={`inline-flex min-w-[4rem] items-center justify-center rounded-2xl border px-3 py-2.5 font-mono text-3xl font-black tracking-tight sm:min-w-[4.5rem] sm:text-4xl ${styles}`}
    >
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider ${styles}`}>
      {label} Elo
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

function buildPlayerMatchLogUrl(clubSlug, clubPlayerId, page) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query
    ? `/clubs/${clubSlug}/players/${clubPlayerId}/match-log?${query}`
    : `/clubs/${clubSlug}/players/${clubPlayerId}/match-log`;
}

export default async function PlayerMatchLogPage({ params, searchParams }) {
  const { clubSlug, clubPlayerId } = await params;
  const query = await searchParams;
  const parsedPage = Number.parseInt(String(query?.page ?? "1"), 10);
  const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const rangeFrom = (currentPage - 1) * MATCHES_PER_PAGE;
  const rangeTo = rangeFrom + MATCHES_PER_PAGE;

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

  const { data: playerRecord, error: playerError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        player:players (
          full_name
        )
      `
    )
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (playerError) {
    throw new Error(playerError.message);
  }

  if (!playerRecord) {
    notFound();
  }

  const { data: participantRows, error: participantError } = await supabase
    .from("match_participants")
    .select(
      `
        match_id,
        match:matches!inner (
          id,
          played_at
        )
      `
    )
    .eq("club_player_id", clubPlayerId);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const orderedMatchIds = [...new Map(
    (participantRows ?? [])
      .filter((row) => row.match_id && row.match?.played_at)
      .sort((a, b) => new Date(b.match.played_at).getTime() - new Date(a.match.played_at).getTime())
      .map((row) => [row.match_id, row.match_id]),
  ).values()];
  const totalMatches = orderedMatchIds.length;
  const paginatedMatchIds = orderedMatchIds.slice(rangeFrom, rangeTo);

  const { data: matches, error: matchesError } = paginatedMatchIds.length
    ? await supabase
        .from("matches")
        .select(
          `
            id,
            played_at,
            team1_score,
            team2_score,
            status,
            participants:match_participants (
              club_player_id,
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
        .in("id", paginatedMatchIds)
        .eq("club_id", club.id)
        .order("played_at", { ascending: false })
    : { data: [], error: null };

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const totalPages = Math.max(1, Math.ceil(totalMatches / MATCHES_PER_PAGE));
  const previousPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const normalizedMatches = (matches ?? []).map((match) => {
    const team1 = match.participants
      ?.filter((participant) => participant.team === 1)
      .sort((a, b) => a.slot - b.slot)
      .map((participant) => ({
        fullName: participant.club_player?.player?.full_name,
        eloDelta: participant.elo_delta ?? 0,
        isTarget: participant.club_player_id === clubPlayerId,
      }))
      .filter((participant) => participant.fullName) ?? [];

    const team2 = match.participants
      ?.filter((participant) => participant.team === 2)
      .sort((a, b) => a.slot - b.slot)
      .map((participant) => ({
        fullName: participant.club_player?.player?.full_name,
        eloDelta: participant.elo_delta ?? 0,
        isTarget: participant.club_player_id === clubPlayerId,
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
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Match Log
          </h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
            History for <span className="font-bold text-teal-400">{playerRecord.player?.full_name ?? "this player"}</span>.
          </p>
        </div>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-400 backdrop-blur-md">
        <p>
          Showing {normalizedMatches.length === 0 ? 0 : rangeFrom + 1}-
          {Math.min(rangeFrom + normalizedMatches.length, totalMatches)} of {totalMatches}
        </p>
        <p>
          Page {Math.min(currentPage, totalPages)} / {totalPages}
        </p>
      </div>

      {/* Match List */}
      <div className="space-y-5">
        {normalizedMatches.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-10 text-center font-medium text-slate-400 backdrop-blur-md">
            This player has not played any club matches yet.
          </div>
        ) : (
          normalizedMatches.map((match) => (
            <article
              key={match.id}
              className="group rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                <p className="text-sm font-bold text-slate-500">{formatPlayedAt(match.played_at)}</p>
                <StatusBadge status={match.status} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
                
                {/* Team 1 */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team 1</p>
                    {match.status === "approved" && match.team1EloDelta !== 0 && (
                      <EloDeltaBadge value={match.team1EloDelta} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {match.team1.map((player) => (
                      <p
                        key={player.fullName}
                        className={`truncate text-sm sm:text-base ${player.isTarget ? "font-bold text-teal-400" : "font-medium text-slate-300"}`}
                      >
                        {player.fullName}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Score VS */}
                <div className="flex flex-col items-center gap-2 py-2 sm:py-0">
                  <div className="flex items-center gap-3">
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
                    <span className="text-xl font-black text-slate-600">-</span>
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

                {/* Team 2 */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-inner">
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team 2</p>
                    {match.status === "approved" && match.team2EloDelta !== 0 && (
                      <EloDeltaBadge value={match.team2EloDelta} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {match.team2.map((player) => (
                      <p
                        key={player.fullName}
                        className={`truncate text-sm sm:text-base ${player.isTarget ? "font-bold text-teal-400" : "font-medium text-slate-300"}`}
                      >
                        {player.fullName}
                      </p>
                    ))}
                  </div>
                </div>

              </div>
            </article>
          ))
        )}
      </div>

      {/* Pagination Actions */}
      {totalMatches > 0 && (
        <div className="flex items-center justify-between gap-4 pt-4">
          {previousPage ? (
            <FullscreenNavLink
              href={buildPlayerMatchLogUrl(clubSlug, clubPlayerId, previousPage)}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              Previous
            </FullscreenNavLink>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-center text-sm font-bold text-slate-600">
              Previous
            </span>
          )}

          {nextPage ? (
            <FullscreenNavLink
              href={buildPlayerMatchLogUrl(clubSlug, clubPlayerId, nextPage)}
              className="flex-1 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 px-6 py-4 text-center text-sm font-bold text-slate-900 shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Next Page
            </FullscreenNavLink>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-2xl border border-white/5 bg-white/5 px-6 py-4 text-center text-sm font-bold text-slate-600">
              Next Page
            </span>
          )}
        </div>
      )}
    </section>
  );
}
