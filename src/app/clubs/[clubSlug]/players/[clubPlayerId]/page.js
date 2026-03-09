import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const RANGE_OPTIONS = [
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "1y", label: "1 year", days: 365 },
  { value: "all", label: "All time", days: null },
];

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDecimal(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getRangeConfig(value) {
  return RANGE_OPTIONS.find((option) => option.value === value) ?? RANGE_OPTIONS[RANGE_OPTIONS.length - 1];
}

function formatGender(value) {
  if (!value) return null;
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHandedness(value) {
  if (!value) return null;
  if (value === "right") return "Right-handed";
  if (value === "left") return "Left-handed";
  if (value === "ambidextrous") return "Ambidextrous";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getAgeLabel(value) {
  if (!value) return null;

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} years old` : null;
}

function getRangeStart(config) {
  if (!config.days) return null;
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  date.setDate(date.getDate() - config.days + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildPerformanceSummary(results) {
  if (!results.length) {
    return {
      recent: [],
      longestWinStreak: 0,
      longestLoseStreak: 0,
      currentStreakLabel: "No streak",
    };
  }

  let longestWinStreak = 0;
  let longestLoseStreak = 0;
  let currentRunType = null;
  let currentRunLength = 0;

  for (const result of results) {
    if (result === currentRunType) {
      currentRunLength += 1;
    } else {
      currentRunType = result;
      currentRunLength = 1;
    }

    if (result === "W") {
      longestWinStreak = Math.max(longestWinStreak, currentRunLength);
    } else {
      longestLoseStreak = Math.max(longestLoseStreak, currentRunLength);
    }
  }

  const recentDescending = [...results].reverse().slice(0, 5);
  const currentStreakType = recentDescending[0];
  let currentStreakLength = 0;

  for (const result of recentDescending) {
    if (result === currentStreakType) {
      currentStreakLength += 1;
    } else {
      break;
    }
  }

  return {
    recent: recentDescending,
    longestWinStreak,
    longestLoseStreak,
    currentStreakLabel:
      currentStreakType === "W"
        ? `Win streak (${currentStreakLength})`
        : `Lose streak (${currentStreakLength})`,
  };
}

function StatCard({ label, value, icon, trend }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:-translate-y-1 hover:border-teal-400/30 hover:bg-white/10 hover:shadow-lg hover:shadow-teal-500/10 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-2xl opacity-80 transition-transform group-hover:scale-110 group-hover:opacity-100">{icon}</span>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${trend.type === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.type === 'up' ? '↗' : '↘'} {trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-300">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold text-white drop-shadow-sm">{value}</p>
      </div>
    </div>
  );
}

function BestPartnersSection({ clubSlug, partners, rangeLabel }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Top Partners</h2>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Ranked by win rate (min. 5 matches) in {rangeLabel.toLowerCase()}.
        </p>
      </div>

      {partners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-5 py-8 text-center text-sm font-medium text-slate-400">
          No partner has reached 5 matches in this range.
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((partner, index) => (
            <Link
              key={partner.id}
              href={`/clubs/${clubSlug}/players/${partner.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-3 transition-all hover:bg-white/10 hover:shadow-md active:scale-[0.98]"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 bg-cover bg-center text-lg font-bold text-white shadow-inner ring-2 ring-transparent transition-all group-hover:ring-teal-400/50"
                style={partner.avatarUrl ? { backgroundImage: `url(${partner.avatarUrl})` } : undefined}
              >
                {!partner.avatarUrl ? getInitials(partner.name) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-white group-hover:text-teal-300">
                  {index + 1}. {partner.name}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                  <span className="text-emerald-400">{partner.wins}W</span>
                  <span className="text-slate-600">-</span>
                  <span className="text-rose-400">{partner.losses}L</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">{formatDecimal(partner.winRate)}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementSection({ achievements, rangeLabel }) {
  if (!Array.isArray(achievements)) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Achievements</h2>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Unlocked milestones for {rangeLabel.toLowerCase()}.
        </p>
      </div>

      <div className="-mx-2 flex overflow-x-auto pb-4 pt-2">
        <div className="flex min-w-max gap-3 px-2">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`w-40 shrink-0 rounded-2xl border p-4 transition-all hover:-translate-y-1 ${
                achievement.unlocked
                  ? "border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 shadow-lg"
                  : "border-white/5 bg-white/5 opacity-60 grayscale"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-inner ${
                    achievement.unlocked
                      ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-900 shadow-teal-500/50"
                      : "bg-white/10 text-slate-500"
                  }`}
                >
                  <span aria-hidden="true">{achievement.icon}</span>
                </div>
                <p className={`mt-3 line-clamp-2 text-sm font-bold ${achievement.unlocked ? "text-white" : "text-slate-400"}`}>
                  {achievement.title}
                </p>
                <p className={`mt-1.5 line-clamp-3 text-xs font-medium ${achievement.unlocked ? "text-teal-100/70" : "text-slate-500"}`}>
                  {achievement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RivalSection({ clubSlug, rival, rangeLabel }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Arch Rival</h2>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Lower-rated opponent who keeps winning in {rangeLabel.toLowerCase()}.
        </p>
      </div>

      {!rival ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-5 py-8 text-center text-sm font-medium text-slate-400">
          No rival found in this range.
        </div>
      ) : (
        <Link
          href={`/clubs/${clubSlug}/players/${rival.id}`}
          className="group flex items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 transition-all hover:bg-rose-500/10 hover:shadow-lg active:scale-[0.98]"
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-800 bg-cover bg-center text-xl font-bold text-white shadow-inner ring-2 ring-transparent transition-all group-hover:ring-rose-400/50"
            style={rival.avatarUrl ? { backgroundImage: `url(${rival.avatarUrl})` } : undefined}
          >
            {!rival.avatarUrl ? getInitials(rival.name) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white group-hover:text-rose-300">
              {rival.name}
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <span className="text-emerald-400">{rival.playerWins}W</span>
              <span className="text-slate-600">-</span>
              <span className="text-rose-400">{rival.playerLosses}L</span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Elo {rival.elo} • {formatDecimal(rival.playerWinRate)}% WR
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

function buildAchievements({
  totalMatches,
  totalWins,
  totalLosses,
  totalPointsScored,
  totalPointsConceded,
  participants,
  results,
  performance,
  displayedElo,
  peakRating,
  initialElo,
}) {
  if (!Array.isArray(participants)) return [];
  
  const perfectWin = participants.some(
    (row) => row.team === row.match?.winning_team && row.points_scored === 21 && row.points_allowed === 0
  );
  const closeWins = participants.filter((row) => row.team === row.match?.winning_team && Math.abs((row.points_scored ?? 0) - (row.points_allowed ?? 0)) <= 2).length;
  const dominantWins = participants.filter((row) => row.team === row.match?.winning_team && (row.points_scored ?? 0) - (row.points_allowed ?? 0) >= 10).length;
  const averageScored = totalMatches > 0 ? totalPointsScored / totalMatches : 0;
  const averageConceded = totalMatches > 0 ? totalPointsConceded / totalMatches : 0;

  const achievementCatalog = [
    { id: "streak-5", icon: "⚡", title: "Hot Streak", description: "Win 5 matches in a row.", unlocked: performance.longestWinStreak >= 5 },
    { id: "streak-10", icon: "🔥", title: "Unstoppable", description: "Win 10 matches in a row.", unlocked: performance.longestWinStreak >= 10 },
    { id: "wins-50", icon: "🥉", title: "Half-Century", description: "Reach 50 wins.", unlocked: totalWins >= 50 },
    { id: "wins-100", icon: "🥈", title: "Century Winner", description: "Reach 100 wins.", unlocked: totalWins >= 100 },
    { id: "wins-500", icon: "🏆", title: "Legendary Grind", description: "Reach 500 wins.", unlocked: totalWins >= 500 },
    { id: "wins-1000", icon: "👑", title: "Immortal Winner", description: "Reach 1000 wins.", unlocked: totalWins >= 1000 },
    { id: "matches-100", icon: "🎯", title: "Iron Player", description: "Play 100 recorded matches.", unlocked: totalMatches >= 100 },
    { id: "matches-250", icon: "🧱", title: "Club Marathoner", description: "Play 250 recorded matches.", unlocked: totalMatches >= 250 },
    { id: "perfect-21-0", icon: "💎", title: "Perfect Sweep", description: "Win a match by 21-0.", unlocked: perfectWin },
    { id: "clutch-5", icon: "🧠", title: "Clutch Performer", description: "Win 5 matches by 2 points or fewer.", unlocked: closeWins >= 5 },
    { id: "dominant-10", icon: "🚀", title: "Dominant Force", description: "Win 10 matches by 10 points or more.", unlocked: dominantWins >= 10 },
    { id: "high-scorer", icon: "🎯", title: "High Scorer", description: "Average 18+ points scored (min 10 matches).", unlocked: averageScored >= 18 && totalMatches >= 10 },
    { id: "stonewall", icon: "🛡️", title: "Stonewall", description: "Concede 12 or fewer points on average (min 10 matches).", unlocked: averageConceded <= 12 && totalMatches >= 10 },
    { id: "points-1000", icon: "🔢", title: "Point Machine", description: "Score 1000 total points.", unlocked: totalPointsScored >= 1000 },
    { id: "points-2000", icon: "💥", title: "Score Engine", description: "Score 2000 total points.", unlocked: totalPointsScored >= 2000 },
    { id: "win-rate-70", icon: "📊", title: "Reliable Winner", description: "Maintain 70%+ win rate across 30+ matches.", unlocked: totalMatches >= 30 && totalWins / totalMatches >= 0.7 },
    { id: "peak-1200", icon: "🌟", title: "1200 Club", description: "Reach a peak Elo of 1200+.", unlocked: peakRating != null && peakRating >= 1200 },
    { id: "peak-1400", icon: "⭐", title: "Elite Tier", description: "Reach a peak Elo of 1400+.", unlocked: peakRating != null && peakRating >= 1400 },
    { id: "undefeated-25", icon: "✨", title: "Untouched Run", description: "Stay undefeated across at least 25 matches.", unlocked: totalLosses === 0 && totalMatches >= 25 },
  ];

  const unlocked = achievementCatalog.filter((a) => a.unlocked);
  const locked = achievementCatalog.filter((a) => !a.unlocked);
  return [...unlocked, ...locked];
}

function RangeTabs({ clubSlug, clubPlayerId, activeRange }) {
  return (
    <div className="sticky top-4 z-50 overflow-hidden rounded-full border border-white/10 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-xl">
      <div className="flex w-full items-center justify-between">
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.value === activeRange;
          return (
            <Link
              key={option.value}
              href={`/clubs/${clubSlug}/players/${clubPlayerId}?range=${option.value}`}
              className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-bold transition-all sm:text-sm ${
                isActive
                  ? "bg-teal-400 text-slate-900 shadow-sm"
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function EloChart({ points, rangeLabel }) {
  if (points.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
        <h2 className="text-xl font-bold tracking-tight text-white">Elo History</h2>
        <div className="mt-4 rounded-2xl border border-dashed border-white/20 bg-white/5 px-5 py-8 text-center text-sm font-medium text-slate-400">
          No Elo history available for {rangeLabel.toLowerCase()}.
        </div>
      </div>
    );
  }

  const width = 100;
  const height = 52;
  const chartTop = 4;
  const chartBottom = 44;
  const chartHeight = chartBottom - chartTop;
  const rawMin = Math.min(...points.map((point) => point.elo));
  const rawMax = Math.max(...points.map((point) => point.elo));
  const paddedMin = Math.floor((rawMin - 40) / 50) * 50;
  const paddedMax = Math.ceil((rawMax + 40) / 50) * 50;
  const min = Math.max(0, Math.min(paddedMin, rawMin));
  const max = Math.max(paddedMax, min + 1);
  const range = Math.max(max - min, 1);

  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = chartBottom - ((point.elo - min) / range) * chartHeight;
    return { ...point, x, y };
  });

  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L ${coordinates.at(-1).x.toFixed(2)} ${chartBottom} L ${coordinates[0].x.toFixed(2)} ${chartBottom} Z`;
  const yTicks = [max, Math.round((max + min) / 2), min];
  const bottomLabels = [
    points[0]?.label ?? "Start",
    points[Math.floor((points.length - 1) / 2)]?.label ?? "Mid",
    points.at(-1)?.label ?? "Now",
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Career Elo</h2>
          <p className="mt-1 text-sm font-medium text-slate-400">
            {points.length} recorded point{points.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right text-xs font-bold text-slate-500">
          <p>HIGH <span className="text-teal-400">{max}</span></p>
          <p>LOW <span className="text-rose-400">{min}</span></p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-950/50 p-4 shadow-inner">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex h-40 flex-col justify-between pt-1 text-xs font-medium text-slate-500">
            {yTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="elo-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2dd4bf" /> {/* teal-400 */}
                  <stop offset="100%" stopColor="#06b6d4" /> {/* cyan-500 */}
                </linearGradient>
                <linearGradient id="elo-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(45, 212, 191, 0.4)" />
                  <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
                </linearGradient>
              </defs>
              {yTicks.map((tick) => {
                const y = chartBottom - ((tick - min) / range) * chartHeight;
                return <line key={tick} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />;
              })}
              <path d={areaPath} fill="url(#elo-fill)" />
              <path d={path} fill="none" stroke="url(#elo-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-3">
          <div />
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {bottomLabels.map((label, index) => (
              <span key={`${label}-${index}`} className={index === 1 ? "text-center" : ""}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ClubPlayerProfilePage({ params, searchParams }) {
  const { clubSlug, clubPlayerId } = await params;
  const query = await searchParams;
  const activeRange = getRangeConfig(query?.range ?? "all");
  const rangeStart = getRangeStart(activeRange);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: clubPlayer, error: clubPlayerError } = await supabase
    .from("club_players")
    .select(`id, club_id, elo_initial, elo_current, player:players (full_name, avatar_url, gender, birth_date, handedness)`)
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (clubPlayerError) throw new Error(clubPlayerError.message);
  if (!clubPlayer) notFound();

  const { data: participantRows, error: participantError } = await supabase
    .from("match_participants")
    .select(`match_id, team, points_scored, points_allowed, created_at, match:matches (played_at, status, winning_team, team1_score, team2_score)`)
    .eq("club_player_id", clubPlayerId);

  if (participantError) throw new Error(participantError.message);

  const approvedParticipants = (participantRows ?? [])
    .filter((row) => row.match?.status === "approved")
    .sort((a, b) => new Date(a.match?.played_at ?? a.created_at).getTime() - new Date(b.match?.played_at ?? b.created_at).getTime());

  const filteredParticipants = rangeStart
    ? approvedParticipants.filter((row) => new Date(row.match?.played_at ?? row.created_at).getTime() >= rangeStart.getTime())
    : approvedParticipants;

  const totalPointsScored = filteredParticipants.reduce((sum, row) => sum + (row.points_scored ?? 0), 0);
  const totalPointsConceded = filteredParticipants.reduce((sum, row) => sum + (row.points_allowed ?? 0), 0);
  const results = filteredParticipants.map((row) => (row.team === row.match?.winning_team ? "W" : "L"));
  const performance = buildPerformanceSummary(results);

  const { data: eloRows, error: eloError } = await supabase
    .from("elo_history")
    .select("recorded_on, elo_before, elo_after")
    .eq("club_player_id", clubPlayerId)
    .order("recorded_on", { ascending: true });

  if (eloError) throw new Error(eloError.message);

  const filteredEloRows = rangeStart ? (eloRows ?? []).filter((row) => new Date(row.recorded_on).getTime() >= rangeStart.getTime()) : (eloRows ?? []);
  const chartPoints = filteredEloRows.length > 0 ? [
    { elo: filteredEloRows[0].elo_before, label: "Start" },
    ...filteredEloRows.map(row => ({
      elo: row.elo_after,
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(row.recorded_on))
    }))
  ] : [];

  const totalMatches = filteredParticipants.length;
  const totalWins = results.filter((result) => result === "W").length;
  const totalLosses = results.filter((result) => result === "L").length;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
  
  const peakRating = chartPoints.length > 0 ? Math.max(...chartPoints.map((point) => point.elo)) 
    : activeRange.value === "all" ? Math.max(clubPlayer.elo_initial ?? 1000, clubPlayer.elo_current ?? 1000) : null;
    
  const displayedElo = filteredEloRows.length > 0 ? filteredEloRows.at(-1).elo_after 
    : activeRange.value === "all" ? clubPlayer.elo_current ?? 1000 : null;

  const allTimeTotalMatches = approvedParticipants.length;
  const allTimeTotalWins = approvedParticipants.filter((row) => row.team === row.match?.winning_team).length;
  const allTimeTotalLosses = allTimeTotalMatches - allTimeTotalWins;
  const allTimeTotalPointsScored = approvedParticipants.reduce((sum, row) => sum + (row.points_scored ?? 0), 0);
  const allTimeTotalPointsConceded = approvedParticipants.reduce((sum, row) => sum + (row.points_allowed ?? 0), 0);
  const allTimeResults = approvedParticipants.map((row) => (row.team === row.match?.winning_team ? "W" : "L"));
  const allTimePerformance = buildPerformanceSummary(allTimeResults);
  const allTimePeakRating = (eloRows ?? []).length > 0 ? Math.max(clubPlayer.elo_initial ?? 1000, ...(eloRows ?? []).map((row) => row.elo_after)) : Math.max(clubPlayer.elo_initial ?? 1000, clubPlayer.elo_current ?? 1000);

  const achievements = buildAchievements({
    totalMatches: allTimeTotalMatches,
    totalWins: allTimeTotalWins,
    totalLosses: allTimeTotalLosses,
    totalPointsScored: allTimeTotalPointsScored,
    totalPointsConceded: allTimeTotalPointsConceded,
    participants: approvedParticipants,
    results: allTimeResults,
    performance: allTimePerformance,
    displayedElo: clubPlayer.elo_current ?? 1000,
    peakRating: allTimePeakRating,
    initialElo: clubPlayer.elo_initial ?? 1000,
  });

  const filteredMatchIds = [...new Set(filteredParticipants.map((row) => row.match_id).filter(Boolean))];

  const { data: partnerRows, error: partnerError } = filteredMatchIds.length
    ? await supabase.from("match_participants").select(`match_id, club_player_id, team, club_player:club_players (id, elo_current, player:players (full_name, avatar_url))`).in("match_id", filteredMatchIds)
    : { data: [], error: null };

  if (partnerError) throw new Error(partnerError.message);

  const playerMatchesById = new Map(filteredParticipants.map((row) => [row.match_id, row]));
  const partnerSummary = new Map();
  const rivalSummary = new Map();

  for (const row of partnerRows ?? []) {
    const playerMatch = playerMatchesById.get(row.match_id);
    if (!playerMatch || row.club_player_id === clubPlayerId) continue;

    if (row.team === playerMatch.team) {
      const current = partnerSummary.get(row.club_player_id) ?? { id: row.club_player?.id ?? row.club_player_id, name: row.club_player?.player?.full_name ?? "Unknown", avatarUrl: row.club_player?.player?.avatar_url ?? "", matches: 0, wins: 0, losses: 0 };
      current.matches += 1;
      if (playerMatch.team === playerMatch.match?.winning_team) current.wins += 1; else current.losses += 1;
      partnerSummary.set(row.club_player_id, current);
    } else {
      const current = rivalSummary.get(row.club_player_id) ?? { id: row.club_player?.id ?? row.club_player_id, name: row.club_player?.player?.full_name ?? "Unknown", avatarUrl: row.club_player?.player?.avatar_url ?? "", elo: row.club_player?.elo_current ?? 1000, matches: 0, playerWins: 0, playerLosses: 0 };
      current.matches += 1;
      if (playerMatch.team === playerMatch.match?.winning_team) current.playerWins += 1; else current.playerLosses += 1;
      rivalSummary.set(row.club_player_id, current);
    }
  }

  const topPartners = [...partnerSummary.values()]
    .map((p) => ({ ...p, winRate: p.matches > 0 ? (p.wins / p.matches) * 100 : 0 }))
    .filter((p) => p.matches >= 5)
    .sort((a, b) => b.winRate !== a.winRate ? b.winRate - a.winRate : b.matches !== a.matches ? b.matches - a.matches : b.wins !== a.wins ? b.wins - a.wins : a.name.localeCompare(b.name))
    .slice(0, 5);

  const rival = [...rivalSummary.values()]
    .map((e) => ({ ...e, playerWinRate: e.matches > 0 ? (e.playerWins / e.matches) * 100 : 0 }))
    .filter((e) => e.matches >= 5 && e.playerWinRate < 50 && e.elo < (clubPlayer.elo_current ?? clubPlayer.elo_initial ?? 1000))
    .sort((a, b) => a.playerWinRate !== b.playerWinRate ? a.playerWinRate - b.playerWinRate : b.matches !== a.matches ? b.matches - a.matches : b.playerLosses !== a.playerLosses ? b.playerLosses - a.playerLosses : a.name.localeCompare(b.name))[0] ?? null;

  const bioItems = [getAgeLabel(clubPlayer.player?.birth_date), formatGender(clubPlayer.player?.gender), formatHandedness(clubPlayer.player?.handedness)].filter(Boolean);

  return (
    <section className="mx-auto w-full max-w-xl space-y-6 pb-12">
      
      {/* Time Range Tabs - Sticky untuk Navigasi Cepat */}
      <RangeTabs clubSlug={clubSlug} clubPlayerId={clubPlayerId} activeRange={activeRange.value} />

      {/* Main Profile Header */}
      <div className="relative mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-cyan-500/5 opacity-50" />
        
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div
              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-slate-800 bg-cover bg-center text-3xl font-bold text-white shadow-xl ring-4 ring-slate-950"
              style={clubPlayer.player?.avatar_url ? { backgroundImage: `url(${clubPlayer.player.avatar_url})` } : undefined}
            >
              {!clubPlayer.player?.avatar_url ? getInitials(clubPlayer.player?.full_name ?? "P") : null}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                {clubPlayer.player?.full_name ?? "Unknown player"}
              </h1>
              
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-teal-500/20 px-3 py-1 font-mono text-lg font-bold text-teal-300 ring-1 ring-teal-500/30">
                  {displayedElo != null ? `ELO ${displayedElo}` : 'No matches'}
                </span>
                {performance.recent.length > 0 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold tracking-widest text-white shadow-inner">
                    {performance.recent.join("")}
                  </span>
                )}
              </div>

              {bioItems.length > 0 && (
                <p className="mt-3 text-sm font-medium text-slate-400">
                  {bioItems.join(" • ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {totalMatches === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-10 text-center text-slate-400 backdrop-blur-md">
          <p className="font-medium">This player has no approved matches in {activeRange.label.toLowerCase()}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Stats Grid - Disatukan untuk Efisiensi Layar */}
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-teal-300">Rating Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Current Elo" value={displayedElo ?? "N/A"} icon="⚡" />
              <StatCard
                label={`Peak Rating (${activeRange.label})`}
                value={peakRating ?? "N/A"}
                icon="📈"
                trend={
                  peakRating != null && displayedElo != null
                    ? {
                        type: peakRating >= displayedElo ? "up" : "down",
                        value: `${Math.abs(peakRating - displayedElo)}`,
                      }
                    : null
                }
              />
            </div>

            <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-teal-400">Match Overview</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Matches" value={totalMatches} icon="🎮" />
              <StatCard label="Win Rate" value={`${formatDecimal(winRate)}%`} icon="📈" trend={totalMatches > 1 ? { type: winRate >= 50 ? "up" : "down", value: `${Math.abs(winRate - 50).toFixed(1)}%` } : null} />
              <StatCard label="Wins" value={totalWins} icon="🏆" />
              <StatCard label="Losses" value={totalLosses} icon="💀" />
            </div>

            <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-cyan-400">Points Analysis</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Scored" value={totalPointsScored} icon="⚡" />
              <StatCard label="Avg Scored" value={formatDecimal(totalPointsScored / totalMatches)} icon="🎯" />
              <StatCard label="Conceded" value={totalPointsConceded} icon="🛡️" />
              <StatCard label="Avg Conceded" value={formatDecimal(totalPointsConceded / totalMatches)} icon="📉" />
            </div>
          </div>

          <EloChart points={chartPoints} rangeLabel={activeRange.label} />
          <AchievementSection achievements={achievements} rangeLabel={activeRange.label} />
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <BestPartnersSection clubSlug={clubSlug} partners={topPartners} rangeLabel={activeRange.label} />
            <RivalSection clubSlug={clubSlug} rival={rival} rangeLabel={activeRange.label} />
          </div>

        </div>
      )}

      {/* Button diletakkan agak terpisah di bawah sebagai CTA */}
      <div className="pt-4">
        <Link
          href={`/clubs/${clubSlug}/players/${clubPlayerId}/match-log`}
          className="block w-full rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-4 text-center text-base font-bold text-slate-900 shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 hover:shadow-cyan-500/30 active:scale-[0.98]"
        >
          View Full Match Log
        </Link>
      </div>
    </section>
  );
}
