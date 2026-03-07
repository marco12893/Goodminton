import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Pencil, Trophy } from "lucide-react";
import {
  deleteTournamentAction,
  saveTournamentMatchAction,
  updateTournamentStatusAction,
} from "@/app/clubs/[clubSlug]/tournaments/[tournamentId]/actions";
import { getClubPageData } from "@/lib/clubPageData";
import {
  getCategoryLabel,
  getFormatLabel,
  getRoundLabel,
  getSeedingLabel,
  getTournamentDisplayName,
} from "@/lib/tournaments";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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

function MatchScoreForm({ clubSlug, tournamentId, match, admin }) {
  const title = `${getTournamentDisplayName(match.entry1)} vs ${getTournamentDisplayName(match.entry2)}`;

  return (
    <details className="rounded-[1.3rem] border border-white/8 bg-white/6 px-4 py-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-white/55">{formatDateTime(match.scheduled_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.16em] text-white/45">{match.status}</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {match.score1 != null && match.score2 != null ? `${match.score1} - ${match.score2}` : "TBD"}
            </p>
          </div>
        </div>
      </summary>

      <div className="mt-4 space-y-4">
        <div className="grid gap-2 text-sm text-white/85">
          <div className="flex items-center justify-between gap-4">
            <span>{getTournamentDisplayName(match.entry1)}</span>
            <span>{match.score1 ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>{getTournamentDisplayName(match.entry2)}</span>
            <span>{match.score2 ?? "-"}</span>
          </div>
        </div>

        {admin && match.entry1 && match.entry2 ? (
          <form action={saveTournamentMatchAction} className="space-y-3">
            <input type="hidden" name="club_slug" value={clubSlug} />
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <input type="hidden" name="match_id" value={match.id} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/45">
                  {match.entry1.display_name}
                </span>
                <input
                  name="score1"
                  type="number"
                  min="0"
                  defaultValue={match.score1 ?? ""}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-white/45">
                  {match.entry2.display_name}
                </span>
                <input
                  name="score2"
                  type="number"
                  min="0"
                  defaultValue={match.score2 ?? ""}
                  className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
                />
              </label>
            </div>
            <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-4 py-3 text-sm font-semibold text-[#062232]">
              Save score
            </button>
          </form>
        ) : null}
      </div>
    </details>
  );
}

function BracketCard({ match }) {
  return (
    <div className="w-40 rounded-[1.2rem] border border-white/8 bg-[#1d2027] px-3 py-3 text-white shadow-[0_12px_26px_rgba(0,0,0,0.22)]">
      <div className="space-y-2">
        <div className="rounded-lg bg-white/6 px-3 py-2">
          <p className="truncate text-sm font-semibold">{getTournamentDisplayName(match.entry1)}</p>
          <p className="mt-1 text-xs text-white/55">{match.score1 ?? "-"}</p>
        </div>
        <div className="rounded-lg bg-white/6 px-3 py-2">
          <p className="truncate text-sm font-semibold">{getTournamentDisplayName(match.entry2)}</p>
          <p className="mt-1 text-xs text-white/55">{match.score2 ?? "-"}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-white/45">{formatDate(match.scheduled_at)}</p>
    </div>
  );
}

function TabLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] text-[#062232] shadow-[0_12px_28px_rgba(18,216,201,0.28)]"
          : "border border-white/12 bg-white/6 text-white/75"
      }`}
    >
      {children}
    </Link>
  );
}

function PairConnectorGroup({ matches, showOutbound }) {
  if (matches.length === 1) {
    return (
      <div className="flex w-40 justify-start">
        <BracketCard match={matches[0]} />
      </div>
    );
  }

  return (
    <div className="flex w-40 flex-col gap-6 py-2">
      {matches.map((match) => (
        <BracketCard key={match.id} match={match} />
      ))}
    </div>
  );
}

function KnockoutBracket({ tournament, matches }) {
  const rounds = matches
    .filter((match) => match.stage === "knockout")
    .reduce((accumulator, match) => {
      const key = match.round_number;
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(match);
      return accumulator;
    }, {});

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);
  const totalRounds = Math.max(...roundNumbers);
  const thirdPlace = matches.find((match) => match.stage === "third_place") ?? null;
  const champion = matches.find((match) => match.stage === "knockout" && match.round_number === totalRounds)?.winner_entry;
  const groupedRounds = roundNumbers.map((roundNumber) => {
    const roundMatches = rounds[roundNumber];
    const groups = [];
    for (let index = 0; index < roundMatches.length; index += 2) {
      groups.push(roundMatches.slice(index, index + 2));
    }
    return {
      roundNumber,
      groups,
    };
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-2xl font-semibold text-white">Knockout Bracket</p>
        {champion ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Champion</p>
            <p className="mt-1 text-sm font-semibold text-white">{champion.display_name}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-6">
          {groupedRounds.map((round, roundIndex) => (
            <div key={round.roundNumber} className="w-40 shrink-0 space-y-4">
              <p className="text-center text-xs uppercase tracking-[0.22em] text-white/45">
                {getRoundLabel(tournament.format, "knockout", round.roundNumber, totalRounds)}
              </p>
              {round.groups.map((group, groupIndex) => (
                <PairConnectorGroup
                  key={`${round.roundNumber}-${groupIndex}`}
                  matches={group}
                  showOutbound={roundIndex < groupedRounds.length - 1}
                />
              ))}
            </div>
          ))}

          {thirdPlace ? (
            <div className="w-44 shrink-0 space-y-3">
              <p className="text-center text-xs uppercase tracking-[0.22em] text-white/45">Third Place</p>
              <BracketCard match={thirdPlace} />
            </div>
          ) : null}

          <div className="flex w-40 shrink-0 flex-col items-center justify-center gap-3 rounded-[1.3rem] border border-white/8 bg-white/5 px-4 py-6">
            <Trophy className="h-12 w-12 text-white/80" />
            <p className="text-center text-sm font-semibold text-white/80">
              {champion ? champion.display_name : "Champion TBD"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildLegacyEntries(rows, category) {
  const sortedRows = [...rows].sort((left, right) => {
    const leftSeed = left.seed_number ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = right.seed_number ?? Number.MAX_SAFE_INTEGER;
    if (leftSeed !== rightSeed) return leftSeed - rightSeed;
    return (left.player?.full_name ?? "").localeCompare(right.player?.full_name ?? "");
  });

  if (category === "singles") {
    return sortedRows.map((row, index) => ({
      id: `legacy-${row.club_player_id}`,
      seed_number: row.seed_number ?? index + 1,
      display_name: row.player?.full_name ?? "Unknown player",
      average_elo: row.elo_current ?? 1000,
      members: [row.player?.full_name ?? "Unknown player"],
    }));
  }

  const entries = [];
  for (let index = 0; index < sortedRows.length; index += 2) {
    const pair = sortedRows.slice(index, index + 2);
    if (pair.length === 0) continue;
    entries.push({
      id: `legacy-pair-${index}`,
      seed_number: pair[0].seed_number ?? entries.length + 1,
      display_name: pair.map((row) => row.player?.full_name ?? "Unknown player").join(" / "),
      average_elo: Math.round(pair.reduce((sum, row) => sum + (row.elo_current ?? 1000), 0) / pair.length),
      members: pair.map((row) => row.player?.full_name ?? "Unknown player"),
    });
  }

  return entries;
}

export const dynamic = "force-dynamic";

export default async function TournamentDetailPage({ params, searchParams }) {
  const { clubSlug, tournamentId } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;
  const activeTab = ["bracket", "matches", "entrants"].includes(query?.tab) ? query.tab : "bracket";

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

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (tournamentError) {
    throw new Error(tournamentError.message);
  }

  if (!tournament) {
    notFound();
  }

  const { data: entryRows, error: entryError } = await supabase
    .from("tournament_entries")
    .select(
      `
        id,
        seed_number,
        display_name,
        average_elo,
        members:tournament_entry_players (
          club_player:club_players (
            id,
            player:players (
              full_name
            )
          )
        )
      `
    )
    .eq("tournament_id", tournamentId)
    .order("seed_number", { ascending: true });

  if (entryError) {
    throw new Error(entryError.message);
  }

  const { data: legacyParticipants, error: legacyParticipantsError } = await supabase
    .from("tournament_players")
    .select(
      `
        seed_number,
        club_player:club_players!inner (
          id,
          elo_current,
          player:players (
            full_name
          )
        )
      `
    )
    .eq("tournament_id", tournamentId)
    .order("seed_number", { ascending: true });

  if (legacyParticipantsError) {
    throw new Error(legacyParticipantsError.message);
  }

  const normalizedLegacyParticipants = (legacyParticipants ?? []).map((row) => ({
    seed_number: row.seed_number,
    club_player_id: row.club_player?.id,
    elo_current: row.club_player?.elo_current ?? 1000,
    player: row.club_player?.player ?? null,
  }));

  const effectiveEntries =
    (entryRows ?? []).length > 0 ? entryRows : buildLegacyEntries(normalizedLegacyParticipants, tournament.category);

  const entryMap = new Map(
    effectiveEntries.map((entry) => [
      entry.id,
      {
        ...entry,
        members:
          entry.members?.every((member) => typeof member === "string")
            ? entry.members
            : entry.members?.map((member) => member.club_player?.player?.full_name).filter(Boolean) ?? [],
      },
    ])
  );

  const { data: matchRows, error: matchError } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage", { ascending: true })
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  if (matchError) {
    throw new Error(matchError.message);
  }

  const matches = (matchRows ?? []).map((match) => ({
    ...match,
    entry1: match.entry1_id ? entryMap.get(match.entry1_id) ?? null : null,
    entry2: match.entry2_id ? entryMap.get(match.entry2_id) ?? null : null,
    winner_entry: match.winner_entry_id ? entryMap.get(match.winner_entry_id) ?? null : null,
  }));

  const totalRounds = Math.max(
    ...matches.filter((match) => match.stage === "knockout").map((match) => match.round_number),
    0,
  );

  const roundRobinRounds = matches
    .filter((match) => match.stage === "round_robin")
    .reduce((accumulator, match) => {
      const key = match.round_number;
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(match);
      return accumulator;
    }, {});

  const roundRobinNumbers = Object.keys(roundRobinRounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">{tournament.name}</p>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/75">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDateTime(tournament.scheduled_at)}</span>
            </div>
          </div>
          <StatusBadge status={tournament.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
          <span className="rounded-full bg-white/12 px-3 py-1">{getFormatLabel(tournament.format)}</span>
          <span className="rounded-full bg-white/12 px-3 py-1">{getCategoryLabel(tournament.category)}</span>
          <span className="rounded-full bg-white/12 px-3 py-1">{getSeedingLabel(tournament.seeding)}</span>
          <span className="rounded-full bg-white/12 px-3 py-1">{effectiveEntries.length} entrants</span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/clubs/${clubSlug}/tournaments`}
            className="rounded-full border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white/85"
          >
            Back to tournaments
          </Link>
          {club.role === "admin" ? (
            <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
              <form action={updateTournamentStatusAction} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2">
                <input type="hidden" name="club_slug" value={clubSlug} />
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <select
                  name="status"
                  defaultValue={tournament.status}
                  className="rounded-full border border-white/12 bg-[#0e1b2a] px-3 py-2 text-sm font-semibold text-white outline-none"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-4 py-2 text-sm font-semibold text-[#062232]">
                  Save status
                </button>
              </form>
              <Link
                href={`/clubs/${clubSlug}/tournaments/${tournamentId}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/90"
              >
                <Pencil className="h-4 w-4" />
                Edit settings
              </Link>
              <form action={deleteTournamentAction}>
                <input type="hidden" name="club_slug" value={clubSlug} />
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <button className="rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                  Delete tournament
                </button>
              </form>
            </div>
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

      <div className="flex flex-wrap gap-3">
        <TabLink href={`/clubs/${clubSlug}/tournaments/${tournamentId}?tab=bracket`} active={activeTab === "bracket"}>
          Bracket
        </TabLink>
        <TabLink href={`/clubs/${clubSlug}/tournaments/${tournamentId}?tab=matches`} active={activeTab === "matches"}>
          Matches
        </TabLink>
        <TabLink href={`/clubs/${clubSlug}/tournaments/${tournamentId}?tab=entrants`} active={activeTab === "entrants"}>
          Entrants
        </TabLink>
      </div>

      {activeTab === "bracket" ? (
        tournament.format === "knockout" && totalRounds > 0 ? (
          <KnockoutBracket tournament={tournament} matches={matches} />
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-10 text-center shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
            <p className="font-mono text-2xl font-semibold text-white">Bracket</p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Bracket view is available for knockout tournaments. Round robin tournaments use the matches tab as the main schedule view.
            </p>
          </div>
        )
      ) : null}

      {activeTab === "entrants" ? (
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
          <p className="font-mono text-2xl font-semibold text-white">Entrants</p>
          <div className="mt-5 grid gap-3">
            {effectiveEntries.map((entry) => (
              <div key={entry.id} className="rounded-[1.3rem] border border-white/8 bg-white/6 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{entry.display_name}</p>
                    <p className="mt-1 text-sm text-white/55">{entry.members.join(" / ")}</p>
                  </div>
                  <div className="text-right text-sm text-white/55">
                    <p>Seed #{entry.seed_number ?? "-"}</p>
                    <p className="mt-1">Avg Elo {entry.average_elo ?? 1000}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "matches" ? (
        tournament.format === "round_robin" ? (
          <div className="space-y-4">
            {roundRobinNumbers.map((roundNumber) => (
              <div
                key={roundNumber}
                className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]"
              >
                <p className="font-mono text-2xl font-semibold text-white">
                  {getRoundLabel(tournament.format, "round_robin", roundNumber, roundRobinNumbers.length)}
                </p>
                <div className="mt-4 space-y-3">
                  {roundRobinRounds[roundNumber].map((match) => (
                    <MatchScoreForm
                      key={match.id}
                      clubSlug={clubSlug}
                      tournamentId={tournamentId}
                      match={match}
                      admin={club.role === "admin"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
            <p className="font-mono text-2xl font-semibold text-white">Matches</p>
            <div className="mt-4 space-y-3">
              {matches.map((match) => (
                <MatchScoreForm
                  key={match.id}
                  clubSlug={clubSlug}
                  tournamentId={tournamentId}
                  match={match}
                  admin={club.role === "admin"}
                />
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
