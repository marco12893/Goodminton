import { notFound, redirect } from "next/navigation";
import {
  buildDoublesHeadToHead,
  buildPlayerStats,
  buildRankMap,
  buildSinglesHeadToHead,
  buildTeamStats,
  calculateWinProbability,
} from "@/lib/compareStats";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { FullscreenNavLink } from "@/components/FullscreenNavOverlay";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function getStreakTextClass(type) {
  if (type === "W") return "text-emerald-300";
  if (type === "L") return "text-rose-300";
  return "text-white";
}

function AvatarStack({ items, title, subtitle, stacked = false, align = "center" }) {
  const alignmentClass = align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";
  const textAlignClass = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  return (
    <div className={`flex flex-col gap-3 sm:gap-5 ${alignmentClass} min-w-0 w-full`}>
      <div className={`flex items-center ${stacked ? "-space-x-4 sm:-space-x-6" : "gap-2 sm:gap-4"}`}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 bg-cover bg-center text-sm font-bold text-white shadow-xl ring-1 ring-white/20 sm:h-24 sm:w-24 sm:border-4 sm:text-3xl sm:ring-2"
            style={{
              backgroundImage: item.avatarUrl ? `url(${item.avatarUrl})` : undefined,
              zIndex: items.length - index,
            }}
          >
            {!item.avatarUrl ? getInitials(item.name) : null}
          </div>
        ))}
      </div>
      <div className={`${textAlignClass} w-full min-w-0`}>
        <p className="truncate text-sm font-black tracking-tight text-white drop-shadow-md sm:text-2xl">
          {title}
        </p>
        <p className="mt-0.5 font-mono text-[10px] font-bold text-teal-400 sm:mt-1 sm:text-lg">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function H2HCard({ leftWins, rightWins }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 sm:text-sm">H2H Record</p>
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
        <span className="text-4xl font-black tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(52,200,44,0.3)] sm:text-6xl">{leftWins}</span>
        <div className="h-8 w-px bg-white/10 sm:h-10" />
        <span className="text-4xl font-black tracking-tighter text-rose-500 drop-shadow-[0_0_15px_rgba(255,56,56,0.3)] sm:text-6xl">{rightWins}</span>
      </div>
    </div>
  );
}

function ProbabilityCard({ leftLabel, rightLabel, leftPercent, rightPercent, note }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 sm:text-sm">Win Probability</p>
      <div className="mt-6 sm:mt-8">
        <div className="flex items-end justify-between font-mono text-xl font-black sm:text-2xl">
          <span className="text-emerald-400">{formatNumber(leftPercent, 1)}%</span>
          <span className="text-rose-500">{formatNumber(rightPercent, 1)}%</span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-950 p-0.5 shadow-inner sm:mt-4 sm:h-4 sm:p-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
            style={{ width: `${leftPercent}%` }}
          />
          <div
            className="h-full rounded-full bg-gradient-to-l from-rose-600 to-orange-500 shadow-[0_0_10px_rgba(244,67,54,0.5)] transition-all duration-1000"
            style={{ width: `${rightPercent}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-xs">
          <span className="max-w-[7rem] truncate sm:max-w-[10rem]">{leftLabel}</span>
          <span className="max-w-[7rem] truncate text-right sm:max-w-[10rem]">{rightLabel}</span>
        </div>
        <p className="mt-5 rounded-xl bg-white/5 p-3 text-center text-[10px] font-medium leading-relaxed text-slate-400 sm:mt-6 sm:p-4 sm:text-xs">{note}</p>
      </div>
    </div>
  );
}

function StatsTable({ title, leftLabel, rightLabel, rows, footnote }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 sm:text-sm">{title}</p>
      
      <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="relative">
            <div className="flex items-center justify-between px-1 py-1 sm:px-2">
              <span className="w-1/3 text-sm font-bold text-white sm:text-lg">{row.left}</span>
              <span className="z-10 px-2 text-[8px] font-black uppercase tracking-tighter text-slate-500 sm:text-[10px] sm:tracking-widest">
                {row.label}
              </span>
              <span className="w-1/3 text-right text-sm font-bold text-white sm:text-lg">{row.right}</span>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
        ))}
      </div>
      
      {footnote && (
        <p className="mt-6 text-center text-[10px] font-medium leading-relaxed text-slate-500 italic sm:mt-8 sm:text-[11px]">
          {footnote}
        </p>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function ClubCompareResultPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const mode = query?.mode === "doubles" ? "doubles" : "singles";
  const selectedIds = mode === "doubles"
    ? [query?.player1, query?.player2, query?.player3, query?.player4].filter(Boolean)
    : [query?.player1, query?.player2].filter(Boolean);

  if (selectedIds.length !== (mode === "doubles" ? 4 : 2) || new Set(selectedIds).size !== selectedIds.length) {
    redirect(`/clubs/${clubSlug}/compare`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: selectedClubPlayers, error: selectedError } = await supabase
    .from("club_players")
    .select(`id, elo_initial, elo_current, player:players (full_name, avatar_url)`)
    .eq("club_id", club.id)
    .in("id", selectedIds);

  if (selectedError) throw new Error(selectedError.message);
  if ((selectedClubPlayers ?? []).length !== selectedIds.length) {
    redirect(`/clubs/${clubSlug}/compare`);
  }

  const { data: allRanksRows, error: rankError } = await supabase
    .from("club_players")
    .select("id, elo_current, total_wins, created_at")
    .eq("club_id", club.id)
    .eq("status", "active")
    .order("elo_current", { ascending: false })
    .order("total_wins", { ascending: false })
    .order("created_at", { ascending: true });

  if (rankError) throw new Error(rankError.message);

  const { data: participantRows, error: participantError } = await supabase
    .from("match_participants")
    .select(`club_player_id, team, points_scored, points_allowed, match:matches (id, club_id, status, winning_team, played_at)`)
    .in("club_player_id", selectedIds);

  if (participantError) throw new Error(participantError.message);

  const { data: eloHistoryRows, error: eloError } = await supabase
    .from("elo_history")
    .select("club_player_id, elo_after")
    .in("club_player_id", selectedIds);

  if (eloError) throw new Error(eloError.message);

  const { data: clubMatches, error: matchError } = await supabase
    .from("matches")
    .select(`id, winning_team, status, participants:match_participants (club_player_id, team)`)
    .eq("club_id", club.id)
    .eq("status", "approved");

  if (matchError) throw new Error(matchError.message);

  const rankMap = buildRankMap(allRanksRows ?? []);
  const participantMap = new Map(selectedIds.map((id) => [id, []]));
  const eloMap = new Map(selectedIds.map((id) => [id, []]));

  for (const row of participantRows ?? []) {
    if (row.match?.status === "approved") participantMap.get(row.club_player_id)?.push(row);
  }

  for (const row of eloHistoryRows ?? []) eloMap.get(row.club_player_id)?.push(row);

  const selectedMap = new Map((selectedClubPlayers ?? []).map((p) => [p.id, p]));
  const orderedClubPlayers = selectedIds.map((id) => selectedMap.get(id));
  const memberStats = orderedClubPlayers.map((cp) => buildPlayerStats(cp, rankMap.get(cp.id), participantMap.get(cp.id) ?? [], eloMap.get(cp.id) ?? []));

  const leftEntity = mode === "singles" ? memberStats[0] : buildTeamStats(memberStats.slice(0, 2), "Team 1");
  const rightEntity = mode === "singles" ? memberStats[1] : buildTeamStats(memberStats.slice(2, 4), "Team 2");

  const h2h = mode === "singles" 
    ? buildSinglesHeadToHead(clubMatches ?? [], selectedIds[0], selectedIds[1])
    : buildDoublesHeadToHead(clubMatches ?? [], selectedIds.slice(0, 2), selectedIds.slice(2, 4));

  const leftProbability = calculateWinProbability(leftEntity.elo, rightEntity.elo) * 100;
  const rightProbability = 100 - leftProbability;

  const statRows = [
    { label: mode === "singles" ? "Elo" : "Avg Elo", left: formatNumber(leftEntity.elo, mode === "singles" ? 0 : 1), right: formatNumber(rightEntity.elo, mode === "singles" ? 0 : 1) },
    { label: mode === "singles" ? "Peak Rating" : "Avg Peak Rating", left: formatNumber(leftEntity.peakRating, mode === "singles" ? 0 : 1), right: formatNumber(rightEntity.peakRating, mode === "singles" ? 0 : 1) },
    {
      label: mode === "singles" ? "Current Streak" : "Team Streak",
      left: (
        <span className={`inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-black uppercase tracking-widest ${getStreakTextClass(leftEntity.currentStreakType)}`}>
          {leftEntity.currentStreakLabel}
        </span>
      ),
      right: (
        <span className={`inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-black uppercase tracking-widest ${getStreakTextClass(rightEntity.currentStreakType)}`}>
          {rightEntity.currentStreakLabel}
        </span>
      ),
    },
    { label: mode === "singles" ? "Longest Win Streak" : "Avg Longest Win Streak", left: formatNumber(leftEntity.longestWinStreak, mode === "singles" ? 0 : 1), right: formatNumber(rightEntity.longestWinStreak, mode === "singles" ? 0 : 1) },
    { label: mode === "singles" ? "Longest Lose Streak" : "Avg Longest Lose Streak", left: formatNumber(leftEntity.longestLoseStreak, mode === "singles" ? 0 : 1), right: formatNumber(rightEntity.longestLoseStreak, mode === "singles" ? 0 : 1) },
    { label: mode === "singles" ? "Rank" : "Avg Rank", left: `#${formatNumber(leftEntity.rank, mode === "singles" ? 0 : 1)}`, right: `#${formatNumber(rightEntity.rank, mode === "singles" ? 0 : 1)}` },
    { label: "Matches", left: formatNumber(leftEntity.totalMatches, mode === "singles" ? 0 : 1), right: formatNumber(rightEntity.totalMatches, mode === "singles" ? 0 : 1) },
    { label: "Win Rate", left: `${formatNumber(leftEntity.winRate, 1)}%`, right: `${formatNumber(rightEntity.winRate, 1)}%` },
    { label: "Avg Scored", left: formatNumber(leftEntity.avgPointsScored, 2), right: formatNumber(rightEntity.avgPointsScored, 2) },
    { label: "Avg Conceded", left: formatNumber(leftEntity.avgPointsConceded, 2), right: formatNumber(rightEntity.avgPointsConceded, 2) },
  ];

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      
      {/* VS Header Section - Kiri vs Kanan */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-2xl sm:rounded-[3rem] sm:px-6 sm:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(20,184,166,0.1),transparent_70%)]" />
        
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-8">
          {/* Sisi Kiri */}
          <AvatarStack
            items={mode === "singles" ? [leftEntity] : leftEntity.members}
            title={mode === "singles" ? leftEntity.name : "Team 1"}
            subtitle={`ELO ${formatNumber(leftEntity.elo)}`}
            stacked={mode === "doubles"}
            align="left"
          />
          
          {/* Tengah (VS) */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-[10px] font-black text-white shadow-xl ring-2 ring-white/5 sm:h-16 sm:w-16 sm:border-2 sm:text-base sm:ring-4">
              VS
            </div>
          </div>

          {/* Sisi Kanan */}
          <AvatarStack
            items={mode === "singles" ? [rightEntity] : rightEntity.members}
            title={mode === "singles" ? rightEntity.name : "Team 2"}
            subtitle={`ELO ${formatNumber(rightEntity.elo)}`}
            stacked={mode === "doubles"}
            align="right"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <H2HCard leftWins={h2h.leftWins} rightWins={h2h.rightWins} />
        <ProbabilityCard
          leftLabel={mode === "singles" ? leftEntity.name : "Team 1"}
          rightLabel={mode === "singles" ? rightEntity.name : "Team 2"}
          leftPercent={leftProbability}
          rightPercent={rightProbability}
          note={mode === "singles" ? "Win probability based on current individual Elo ratings." : "Win probability based on combined team average Elo ratings."}
        />
      </div>

      <StatsTable
        title="Performance Analysis"
        leftLabel={mode === "singles" ? leftEntity.name : "Team 1"}
        rightLabel={mode === "singles" ? rightEntity.name : "Team 2"}
        rows={statRows}
        footnote={mode === "doubles" ? "Team stats are calculated using the mean of each member's individual statistics." : null}
      />

      <div className="pt-4 text-center">
        <FullscreenNavLink href={`/clubs/${clubSlug}/compare`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/10 active:scale-95 sm:px-8 sm:py-3 sm:text-sm">
          ← Compare different players
        </FullscreenNavLink>
      </div>

    </section>
  );
}


