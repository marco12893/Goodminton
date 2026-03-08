import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Pencil, Trophy, Trash2 } from "lucide-react";
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
import { cookies } from "next/headers";

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
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "in_progress"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
        : "border-blue-500/20 bg-blue-500/10 text-blue-400";

  const label =
    status === "completed" ? "Completed" : status === "in_progress" ? "In Progress" : "Upcoming";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${styles}`}>
      {label}
    </span>
  );
}

function MatchScoreForm({ clubSlug, tournamentId, match, admin }) {
  const name1 = getTournamentDisplayName(match.entry1);
  const name2 = getTournamentDisplayName(match.entry2);

  return (
    <details className="group rounded-2xl border border-white/5 bg-white/5 transition-all open:border-teal-500/30 open:bg-slate-900/50 open:shadow-lg">
      <summary className="cursor-pointer list-none p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          
          {/* Top Row: Title & Status - MOBILE OPTIMIZED */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
               {/* Memecah 'vs' ke baris baru di mobile agar tidak nabrak */}
              <div className="text-sm font-bold text-white transition-colors group-hover:text-teal-300 sm:text-base">
                <p className="break-words">{name1}</p>
                <p className="text-slate-500 text-xs my-0.5">vs</p>
                <p className="break-words">{name2}</p>
              </div>
              <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
                {formatDateTime(match.scheduled_at)}
              </p>
            </div>
            
            <div className="flex shrink-0 items-center justify-between border-t border-white/5 pt-3 sm:flex-col sm:items-end sm:justify-start sm:border-0 sm:pt-0">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                match.status === "completed" ? "text-emerald-400" : "text-slate-500"
              }`}>
                {match.status}
              </span>
              <div className="flex items-center gap-2 font-mono text-xl font-bold text-white sm:mt-1 sm:text-2xl">
                <span>{match.score1 ?? "-"}</span>
                <span className="text-sm text-slate-600">:</span>
                <span>{match.score2 ?? "-"}</span>
              </div>
            </div>
          </div>

        </div>
      </summary>

      {admin && match.entry1 && match.entry2 && (
        <div className="border-t border-white/5 p-4 sm:p-5">
          <form action={saveTournamentMatchAction} className="space-y-4">
            <input type="hidden" name="club_slug" value={clubSlug} />
            <input type="hidden" name="tournament_id" value={tournamentId} />
            <input type="hidden" name="match_id" value={match.id} />
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <label className="block">
                <span className="mb-2 block line-clamp-1 text-[10px] font-bold uppercase tracking-widest text-slate-400" title={match.entry1.display_name}>
                  {match.entry1.display_name}
                </span>
                <input
                  name="score1"
                  type="number"
                  min="0"
                  defaultValue={match.score1 ?? ""}
                  placeholder="Score"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-base font-bold text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400 sm:px-4 sm:py-3 sm:text-lg"
                />
              </label>
              <label className="block">
                <span className="mb-2 block line-clamp-1 text-[10px] font-bold uppercase tracking-widest text-slate-400" title={match.entry2.display_name}>
                  {match.entry2.display_name}
                </span>
                <input
                  name="score2"
                  type="number"
                  min="0"
                  defaultValue={match.score2 ?? ""}
                  placeholder="Score"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center text-base font-bold text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400 sm:px-4 sm:py-3 sm:text-lg"
                />
              </label>
            </div>
            
            <button className="w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-4 py-3 text-sm font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 active:scale-[0.98]">
              Save Match Score
            </button>
          </form>
        </div>
      )}
    </details>
  );
}

function BracketCard({ match }) {
  const isComplete = match.status === 'completed';
  const p1Winner = isComplete && match.score1 > match.score2;
  const p2Winner = isComplete && match.score2 > match.score1;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-1">
        {/* Entry 1 */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${p1Winner ? 'bg-teal-500/15' : 'bg-white/5'}`}>
          <p className={`truncate text-xs font-bold ${p1Winner ? 'text-teal-400' : 'text-slate-300'}`} title={getTournamentDisplayName(match.entry1)}>
            {getTournamentDisplayName(match.entry1)}
          </p>
          <p className="ml-2 font-mono text-sm font-bold text-white">{match.score1 ?? "-"}</p>
        </div>

        {/* Entry 2 */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${p2Winner ? 'bg-teal-500/15' : 'bg-white/5'}`}>
          <p className={`truncate text-xs font-bold ${p2Winner ? 'text-teal-400' : 'text-slate-300'}`} title={getTournamentDisplayName(match.entry2)}>
            {getTournamentDisplayName(match.entry2)}
          </p>
          <p className="ml-2 font-mono text-sm font-bold text-white">{match.score2 ?? "-"}</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
        {isComplete ? 'Final' : formatDate(match.scheduled_at)}
      </p>
    </div>
  );
}

function TabLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-full px-2 py-2.5 text-center text-[11px] font-bold transition-all sm:px-4 sm:text-sm ${
        active
          ? "bg-teal-400 text-slate-900 shadow-sm"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function PairConnectorGroup({ matches, showOutbound }) {
  const isPair = matches.length === 2;

  return (
    <div className="relative flex flex-1 flex-col justify-around">
      {/* Connector Lines Drawing */}
      {showOutbound && isPair && (
        <>
          {/* Vertical ']' bracket arm connecting the pair */}
          <div className="absolute bottom-[25%] right-[-1.5rem] top-[25%] z-0 w-[1.5rem] rounded-r-xl border-y-2 border-r-2 border-slate-600/60" />
          {/* Horizontal line shooting to the next round */}
          <div className="absolute right-[-3rem] top-1/2 z-0 w-[1.5rem] border-b-2 border-slate-600/60" />
        </>
      )}
      {showOutbound && !isPair && (
        <div className="absolute right-[-3rem] top-1/2 z-0 w-[3rem] border-b-2 border-slate-600/60" />
      )}

      {/* Actual Matches */}
      {matches.map((match) => (
        <div key={match.id} className="relative z-10 w-full py-2">
          <BracketCard match={match} />
        </div>
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

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = Math.max(...roundNumbers, 0);
  const thirdPlace = matches.find((match) => match.stage === "third_place") ?? null;
  const champion = matches.find((match) => match.stage === "knockout" && match.round_number === totalRounds)?.winner_entry;
  
  const groupedRounds = roundNumbers.map((roundNumber) => {
    const roundMatches = rounds[roundNumber];
    const groups = [];
    for (let index = 0; index < roundMatches.length; index += 2) {
      groups.push(roundMatches.slice(index, index + 2));
    }
    return { roundNumber, groups };
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/40 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
      
      <div className="overflow-x-auto pb-8 custom-scrollbar">
        <div className="flex min-w-max items-stretch gap-8 px-2 pt-2 sm:gap-12">
          
          {/* Generate Progressive Round Columns */}
          {groupedRounds.map((round) => (
            <div key={round.roundNumber} className="flex w-48 shrink-0 flex-col sm:w-56">
              <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-teal-400">
                {getRoundLabel(tournament.format, "knockout", round.roundNumber, totalRounds)}
              </p>
              <div className="flex flex-1 flex-col justify-around">
                {round.groups.map((group, groupIndex) => (
                  <PairConnectorGroup
                    key={`${round.roundNumber}-${groupIndex}`}
                    matches={group}
                    showOutbound={true} // Always true, last round points to champion
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Ultimate Champion Box Column */}
          <div className="flex w-48 shrink-0 flex-col sm:w-56">
            <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              Champion
            </p>
            <div className="flex flex-1 flex-col justify-center">
              <div className="relative flex w-full flex-col items-center justify-center gap-3 rounded-[2rem] border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 px-4 py-8 shadow-[0_0_30px_rgba(234,179,8,0.15)] sm:gap-4 sm:py-10">
                <Trophy className={`h-12 w-12 sm:h-16 sm:w-16 ${champion ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'text-slate-600'}`} />
                <p className="text-center font-mono text-lg font-black text-white sm:text-xl">
                  {champion ? champion.display_name : "TBD"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Third Place Section detached from main diagram math */}
      {thirdPlace && (
        <div className="mt-6 flex justify-start border-t border-white/5 pt-6 sm:mt-8 sm:pt-8 lg:justify-end">
          <div className="w-48 shrink-0 space-y-4 sm:w-56">
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Third Place Playoff
            </p>
            <BracketCard match={thirdPlace} />
          </div>
        </div>
      )}
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (tournamentError) throw new Error(tournamentError.message);
  if (!tournament) notFound();

  const { data: entryRows, error: entryError } = await supabase
    .from("tournament_entries")
    .select(`id, seed_number, display_name, average_elo, members:tournament_entry_players (club_player:club_players (id, player:players (full_name)))`)
    .eq("tournament_id", tournamentId)
    .order("seed_number", { ascending: true });

  if (entryError) throw new Error(entryError.message);

  const { data: legacyParticipants, error: legacyParticipantsError } = await supabase
    .from("tournament_players")
    .select(`seed_number, club_player:club_players!inner (id, elo_current, player:players (full_name))`)
    .eq("tournament_id", tournamentId)
    .order("seed_number", { ascending: true });

  if (legacyParticipantsError) throw new Error(legacyParticipantsError.message);

  const normalizedLegacyParticipants = (legacyParticipants ?? []).map((row) => ({
    seed_number: row.seed_number,
    club_player_id: row.club_player?.id,
    elo_current: row.club_player?.elo_current ?? 1000,
    player: row.club_player?.player ?? null,
  }));

  const effectiveEntries = (entryRows ?? []).length > 0 ? entryRows : buildLegacyEntries(normalizedLegacyParticipants, tournament.category);

  // FIX: Pastikan members selalu diurai dengan benar menjadi array of string
  const entryMap = new Map(
    effectiveEntries.map((entry) => {
      let resolvedMembers = [];
      
      if (Array.isArray(entry.members)) {
         // Cek jika elemennya string (dari data legacy)
        if (typeof entry.members[0] === 'string') {
          resolvedMembers = entry.members;
        } else {
          // Ekstrak dari object relasional Supabase
          resolvedMembers = entry.members
            .map((m) => m?.club_player?.player?.full_name)
            .filter(Boolean);
        }
      }

      return [
        entry.id,
        {
          ...entry,
          members: resolvedMembers,
        },
      ];
    })
  );

  const { data: matchRows, error: matchError } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage", { ascending: true })
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  if (matchError) throw new Error(matchError.message);

  const matches = (matchRows ?? []).map((match) => ({
    ...match,
    entry1: match.entry1_id ? entryMap.get(match.entry1_id) ?? null : null,
    entry2: match.entry2_id ? entryMap.get(match.entry2_id) ?? null : null,
    winner_entry: match.winner_entry_id ? entryMap.get(match.winner_entry_id) ?? null : null,
  }));

  const totalRounds = Math.max(...matches.filter((match) => match.stage === "knockout").map((match) => match.round_number), 0);

  const roundRobinRounds = matches
    .filter((match) => match.stage === "round_robin")
    .reduce((accumulator, match) => {
      const key = match.round_number;
      if (!accumulator[key]) accumulator[key] = [];
      accumulator[key].push(match);
      return accumulator;
    }, {});

  const roundRobinNumbers = Object.keys(roundRobinRounds).map(Number).sort((a, b) => a - b);

  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 sm:space-y-6 pb-12">
      
      {/* Messages */}
      <div className="space-y-3 empty:hidden px-2 sm:px-0">
        {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-md sm:px-5 sm:py-4">{error}</div>}
        {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 backdrop-blur-md sm:px-5 sm:py-4">{success}</div>}
      </div>

      {/* Main Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-5 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">{tournament.name}</h1>
              <StatusBadge status={tournament.status} />
            </div>
            
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:gap-3 sm:text-xs">
              <div className="flex items-center gap-1.5 text-teal-400">
                <CalendarDays className="h-4 w-4" />
                <span>{formatDateTime(tournament.scheduled_at)}</span>
              </div>
              <span className="hidden text-slate-600 sm:inline">•</span>
              <span className="rounded-lg bg-white/5 px-2.5 py-1.5 sm:py-1">{getFormatLabel(tournament.format)}</span>
              <span className="rounded-lg bg-white/5 px-2.5 py-1.5 sm:py-1">{getCategoryLabel(tournament.category)}</span>
              <span className="rounded-lg bg-white/5 px-2.5 py-1.5 sm:py-1">{getSeedingLabel(tournament.seeding)}</span>
              <span className="rounded-lg bg-white/5 px-2.5 py-1.5 sm:py-1">{effectiveEntries.length} entrants</span>
            </div>
          </div>

          {/* Admin Controls */}
          {club.role === "admin" && (
            <div className="flex w-full flex-col gap-3 rounded-2xl bg-white/5 p-4 lg:w-auto lg:items-end lg:bg-transparent lg:p-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:hidden">Admin Controls</p>
              
              <form action={updateTournamentStatusAction} className="flex w-full items-center gap-2">
                <input type="hidden" name="club_slug" value={clubSlug} />
                <input type="hidden" name="tournament_id" value={tournamentId} />
                <select
                  name="status"
                  defaultValue={tournament.status}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-teal-400 sm:py-2 sm:text-sm lg:w-40"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button className="rounded-xl bg-teal-500/20 px-4 py-2.5 text-xs font-bold text-teal-400 transition-colors hover:bg-teal-500/30 sm:py-2 sm:text-sm">
                  Save
                </button>
              </form>
              
              <div className="flex w-full items-center gap-2">
                <Link
                  href={`/clubs/${clubSlug}/tournaments/${tournamentId}/edit`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/10 sm:px-4 sm:py-2 sm:text-sm"
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Edit
                </Link>
                <form action={deleteTournamentAction} className="flex-1">
                  <input type="hidden" name="club_slug" value={clubSlug} />
                  <input type="hidden" name="tournament_id" value={tournamentId} />
                  <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/20 sm:px-4 sm:py-2 sm:text-sm">
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Delete
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-2 z-40 mx-auto max-w-xl overflow-hidden rounded-full border border-white/10 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-xl sm:top-4">
        <div className="flex w-full items-center justify-between">
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
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === "bracket" && (
          tournament.format === "knockout" && totalRounds > 0 ? (
            <KnockoutBracket tournament={tournament} matches={matches} />
          ) : (
            <div className="mx-auto max-w-2xl rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-8 text-center backdrop-blur-md sm:p-10">
              <h2 className="font-mono text-lg font-bold text-white sm:text-xl">Bracket View Unavailable</h2>
              <p className="mt-2 text-sm font-medium text-slate-400">
                Bracket is only available for Knockout format. For Round Robin, please use the Matches tab.
              </p>
            </div>
          )
        )}

        {activeTab === "entrants" && (
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-8">
            <h2 className="font-mono text-xl font-bold text-white sm:text-2xl">Registered Entrants</h2>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
              {effectiveEntries.map((entry) => {
                 // Fallback pengaman untuk array member
                 const memberList = Array.isArray(entry.members) ? entry.members : [];
                 const membersText = memberList.length > 0 ? memberList.join(" / ") : "No players assigned";

                 return (
                  <div key={entry.id} className="group flex flex-col justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-teal-500/30 hover:bg-slate-900/50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white group-hover:text-teal-300 sm:text-base" title={entry.display_name}>
                        {entry.display_name}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-400" title={membersText}>
                        {membersText}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between border-t border-white/5 pt-3 sm:mt-1 sm:border-0 sm:pt-0">
                      <span className="rounded-lg bg-teal-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-teal-400">
                        Seed {entry.seed_number ?? "-"}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        ELO {entry.average_elo ?? 1000}
                      </span>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          tournament.format === "round_robin" ? (
            <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
              {roundRobinNumbers.map((roundNumber) => (
                <div key={roundNumber} className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-8">
                  <h2 className="font-mono text-xl font-bold text-white sm:text-2xl">
                    {getRoundLabel(tournament.format, "round_robin", roundNumber, roundRobinNumbers.length)}
                  </h2>
                  <div className="mt-5 grid gap-3 sm:mt-6 lg:grid-cols-2">
                    {roundRobinRounds[roundNumber].map((match) => (
                      <MatchScoreForm key={match.id} clubSlug={clubSlug} tournamentId={tournamentId} match={match} admin={club.role === "admin"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-8">
              <h2 className="font-mono text-xl font-bold text-white sm:text-2xl">All Matches</h2>
              <div className="mt-5 grid gap-3 sm:mt-6 lg:grid-cols-2">
                {matches.map((match) => (
                  <MatchScoreForm key={match.id} clubSlug={clubSlug} tournamentId={tournamentId} match={match} admin={club.role === "admin"} />
                ))}
              </div>
            </div>
          )
        )}
      </div>

    </section>
  );
}