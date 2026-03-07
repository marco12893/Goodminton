import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-[0.08em] ${styles}`}>
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

export default async function PlayerMatchLogPage({ params }) {
  const { clubSlug, clubPlayerId } = await params;

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
    .select("match_id")
    .eq("club_player_id", clubPlayerId);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const matchIds = [...new Set((participantRows ?? []).map((row) => row.match_id).filter(Boolean))];

  const { data: matches, error: matchesError } = matchIds.length
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
        .in("id", matchIds)
        .eq("club_id", club.id)
        .order("played_at", { ascending: false })
    : { data: [], error: null };

  if (matchesError) {
    throw new Error(matchesError.message);
  }

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
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">Player Match Log</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Every recorded club match played by {playerRecord.player?.full_name ?? "this player"}.
            </p>
          </div>
          <Link
            href={`/clubs/${clubSlug}/players/${clubPlayerId}`}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {normalizedMatches.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/6 px-5 py-8 text-center text-white/70">
            This player has not played any club matches yet.
          </div>
        ) : (
          normalizedMatches.map((match) => (
            <article
              key={match.id}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)] backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-white/60">{formatPlayedAt(match.played_at)}</p>
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
                      <p
                        key={player.fullName}
                        className={`text-base font-semibold ${player.isTarget ? "text-[#17dccb]" : "text-white"}`}
                      >
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
                      <p
                        key={player.fullName}
                        className={`text-base font-semibold ${player.isTarget ? "text-[#17dccb]" : "text-white"}`}
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
    </section>
  );
}
