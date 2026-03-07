import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function StatCard({ label, value }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-gradient-to-r from-[#14d4c6] to-[#1bc1df] px-4 py-4 text-center text-[#072233] shadow-[0_16px_34px_rgba(6,28,38,0.24)]">
      <p className="text-sm font-medium text-[#072233]/80">{label}</p>
      <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function BestPartnersSection({ clubSlug, partners, rangeLabel }) {
  return (
    <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold text-white">Top 5 Best Partners</p>
          <p className="mt-2 text-sm text-white/60">
            Ranked by win rate among partners with at least 5 matches in {rangeLabel.toLowerCase()}.
          </p>
        </div>
      </div>

      {partners.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/12 bg-white/5 px-5 py-6 text-center text-white/65">
          No partner has reached 5 matches with this player in the selected time range.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {partners.map((partner, index) => (
            <Link
              key={partner.id}
              href={`/clubs/${clubSlug}/players/${partner.id}`}
              className="flex items-center gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-4 py-4 transition hover:bg-white/[0.06]"
            >
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-[#163047] to-[#0f2236] bg-cover bg-center text-2xl font-semibold text-white"
                style={partner.avatarUrl ? { backgroundImage: `url(${partner.avatarUrl})` } : undefined}
              >
                {!partner.avatarUrl ? getInitials(partner.name) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[1.7rem] font-semibold text-white">
                  {index + 1}. {partner.name}
                </p>
                <p className="mt-2 text-lg">
                  <span className="font-semibold text-[#2cd85b]">{partner.wins} wins</span>
                  <span className="mx-2 text-white/35">•</span>
                  <span className="font-semibold text-[#ff5252]">{partner.losses} losses</span>
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {formatDecimal(partner.winRate)}% win rate across {partner.matches} matches
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementSection({ achievements, rangeLabel }) {
  if (Array.isArray(achievements)) {
    return (
      <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-semibold text-white">Achievements</p>
            <p className="mt-2 text-sm text-white/60">
              Unlocked milestones for {rangeLabel.toLowerCase()}. Locked achievements stay on the right.
            </p>
          </div>
        </div>

        <div className="mt-5 -mx-1 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 px-1">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`w-[10.5rem] shrink-0 rounded-[1.35rem] border px-3 py-3 ${
                  achievement.unlocked
                    ? "border-white/8 bg-white/[0.04]"
                    : "border-white/6 bg-white/[0.02] opacity-55 grayscale"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-[1.4rem] text-[2.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${
                      achievement.unlocked
                        ? "bg-gradient-to-br from-[#13d8c8] via-[#18b8df] to-[#1d86d4]"
                        : "bg-white/10 text-white/55"
                    }`}
                  >
                    <span aria-hidden="true">{achievement.icon}</span>
                  </div>
                  <p className={`mt-3 line-clamp-2 text-[1.02rem] font-semibold leading-5 ${achievement.unlocked ? "text-white" : "text-white/72"}`}>
                    {achievement.title}
                  </p>
                  <p className={`mt-2 line-clamp-3 text-xs leading-5 ${achievement.unlocked ? "text-white/65" : "text-white/42"}`}>
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

  return (
    <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold text-white">Achievements</p>
          <p className="mt-2 text-sm text-white/60">
            Unlocked milestones for {rangeLabel.toLowerCase()}.
          </p>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/12 bg-white/5 px-5 py-6 text-center text-white/65">
          No achievements unlocked in the selected time range yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-4 py-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#12d8c9] to-[#18c3e5] text-2xl">
                  {achievement.icon}
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">{achievement.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{achievement.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RivalSection({ clubSlug, rival, rangeLabel }) {
  return (
    <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold text-white">Rival</p>
          <p className="mt-2 text-sm text-white/60">
            A lower-rated opponent who still keeps beating this player in {rangeLabel.toLowerCase()}.
          </p>
        </div>
      </div>

      {!rival ? (
        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/12 bg-white/5 px-5 py-6 text-center text-white/65">
          No rival found in the selected time range.
        </div>
      ) : (
        <Link
          href={`/clubs/${clubSlug}/players/${rival.id}`}
          className="mt-5 flex items-center gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.04] px-4 py-4 transition hover:bg-white/[0.06]"
        >
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-[#163047] to-[#0f2236] bg-cover bg-center text-2xl font-semibold text-white"
            style={rival.avatarUrl ? { backgroundImage: `url(${rival.avatarUrl})` } : undefined}
          >
            {!rival.avatarUrl ? getInitials(rival.name) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.7rem] font-semibold text-white">{rival.name}</p>
            <p className="mt-2 text-lg">
              <span className="font-semibold text-[#2cd85b]">{rival.playerWins} wins</span>
              <span className="mx-2 text-white/35">•</span>
              <span className="font-semibold text-[#ff5252]">{rival.playerLosses} losses</span>
            </p>
            <p className="mt-1 text-sm text-white/55">
              Elo {rival.elo} • {formatDecimal(rival.playerWinRate)}% win rate across {rival.matches} matches
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
  if (Array.isArray(participants)) {
    const perfectWin = participants.some(
      (row) =>
        row.team === row.match?.winning_team &&
        row.points_scored === 21 &&
        row.points_allowed === 0,
    );

    const closeWins = participants.filter((row) => {
      if (row.team !== row.match?.winning_team) {
        return false;
      }

      return Math.abs((row.points_scored ?? 0) - (row.points_allowed ?? 0)) <= 2;
    }).length;

    const dominantWins = participants.filter((row) => {
      if (row.team !== row.match?.winning_team) {
        return false;
      }

      return (row.points_scored ?? 0) - (row.points_allowed ?? 0) >= 10;
    }).length;

    const averageScored = totalMatches > 0 ? totalPointsScored / totalMatches : 0;
    const averageConceded = totalMatches > 0 ? totalPointsConceded / totalMatches : 0;

    const achievementCatalog = [
      {
        id: "streak-5",
        icon: "⚡",
        title: "Hot Streak",
        description: "Win 5 matches in a row.",
        unlocked: performance.longestWinStreak >= 5,
      },
      {
        id: "streak-10",
        icon: "🔥",
        title: "Unstoppable",
        description: "Win 10 matches in a row.",
        unlocked: performance.longestWinStreak >= 10,
      },
      {
        id: "wins-50",
        icon: "🥉",
        title: "Half-Century",
        description: "Reach 50 wins.",
        unlocked: totalWins >= 50,
      },
      {
        id: "wins-100",
        icon: "🥈",
        title: "Century Winner",
        description: "Reach 100 wins.",
        unlocked: totalWins >= 100,
      },
      {
        id: "wins-500",
        icon: "🏆",
        title: "Legendary Grind",
        description: "Reach 500 wins.",
        unlocked: totalWins >= 500,
      },
      {
        id: "wins-1000",
        icon: "👑",
        title: "Immortal Winner",
        description: "Reach 1000 wins.",
        unlocked: totalWins >= 1000,
      },
      {
        id: "matches-100",
        icon: "🎯",
        title: "Iron Player",
        description: "Play 100 recorded matches.",
        unlocked: totalMatches >= 100,
      },
      {
        id: "matches-250",
        icon: "🧱",
        title: "Club Marathoner",
        description: "Play 250 recorded matches.",
        unlocked: totalMatches >= 250,
      },
      {
        id: "perfect-21-0",
        icon: "💎",
        title: "Perfect Sweep",
        description: "Win a match by 21-0.",
        unlocked: perfectWin,
      },
      {
        id: "clutch-5",
        icon: "🧠",
        title: "Clutch Performer",
        description: "Win 5 matches by 2 points or fewer.",
        unlocked: closeWins >= 5,
      },
      {
        id: "dominant-10",
        icon: "🚀",
        title: "Dominant Force",
        description: "Win 10 matches by 10 points or more.",
        unlocked: dominantWins >= 10,
      },
      {
        id: "high-scorer",
        icon: "🎯",
        title: "High Scorer",
        description: "Average at least 18 points scored across 10 or more matches.",
        unlocked: averageScored >= 18 && totalMatches >= 10,
      },
      {
        id: "stonewall",
        icon: "🛡️",
        title: "Stonewall",
        description: "Concede 12 points or fewer on average across 10 or more matches.",
        unlocked: averageConceded <= 12 && totalMatches >= 10,
      },
      {
        id: "points-1000",
        icon: "🔢",
        title: "Point Machine",
        description: "Score 1000 total points.",
        unlocked: totalPointsScored >= 1000,
      },
      {
        id: "points-2000",
        icon: "💥",
        title: "Score Engine",
        description: "Score 2000 total points.",
        unlocked: totalPointsScored >= 2000,
      },
      {
        id: "win-rate-70",
        icon: "📊",
        title: "Reliable Winner",
        description: "Maintain at least 70% win rate across 30 or more matches.",
        unlocked: totalMatches >= 30 && totalWins / totalMatches >= 0.7,
      },
      {
        id: "elo-plus-100",
        icon: "📈",
        title: "Rating Climber",
        description: "Improve Elo by at least 100 points.",
        unlocked: displayedElo != null && initialElo != null && displayedElo - initialElo >= 100,
      },
      {
        id: "peak-1200",
        icon: "🌟",
        title: "1200 Club",
        description: "Reach a peak Elo of 1200 or higher.",
        unlocked: peakRating != null && peakRating >= 1200,
      },
      {
        id: "peak-1400",
        icon: "⭐",
        title: "Elite Tier",
        description: "Reach a peak Elo of 1400 or higher.",
        unlocked: peakRating != null && peakRating >= 1400,
      },
      {
        id: "undefeated-25",
        icon: "✨",
        title: "Untouched Run",
        description: "Stay undefeated across at least 25 matches.",
        unlocked: totalLosses === 0 && totalMatches >= 25,
      },
    ];

    const availableAchievements = achievementCatalog.filter(
      (achievement) => achievement.id !== "elo-plus-100",
    );
    const unlocked = availableAchievements.filter((achievement) => achievement.unlocked);
    const locked = availableAchievements.filter((achievement) => !achievement.unlocked);

    return [...unlocked, ...locked];
  }

  const achievements = [];

  const perfectWin = participants.some(
    (row) =>
      row.team === row.match?.winning_team &&
      row.points_scored === 21 &&
      row.points_allowed === 0,
  );

  const closeWins = participants.filter((row) => {
    if (row.team !== row.match?.winning_team) {
      return false;
    }

    return Math.abs((row.points_scored ?? 0) - (row.points_allowed ?? 0)) <= 2;
  }).length;

  const averageScored = totalMatches > 0 ? totalPointsScored / totalMatches : 0;
  const averageConceded = totalMatches > 0 ? totalPointsConceded / totalMatches : 0;
  const comebackStreak = results.slice(-3).every((result) => result === "W");

  if (performance.longestWinStreak >= 10) {
    achievements.push({
      id: "streak-10",
      icon: "🔥",
      title: "Unstoppable",
      description: "Won 10 matches in a row.",
    });
  }

  if (performance.longestWinStreak >= 5) {
    achievements.push({
      id: "streak-5",
      icon: "⚡",
      title: "Hot Streak",
      description: "Won 5 matches in a row.",
    });
  }

  if (totalWins >= 100) {
    achievements.push({
      id: "wins-100",
      icon: "👑",
      title: "Century Winner",
      description: "Reached 100 wins.",
    });
  }

  if (totalWins >= 50) {
    achievements.push({
      id: "wins-50",
      icon: "🏆",
      title: "Half-Century",
      description: "Reached 50 wins.",
    });
  }

  if (totalMatches >= 100) {
    achievements.push({
      id: "matches-100",
      icon: "🎯",
      title: "Iron Player",
      description: "Played 100 recorded matches.",
    });
  }

  if (perfectWin) {
    achievements.push({
      id: "perfect-21-0",
      icon: "💎",
      title: "Perfect Sweep",
      description: "Won a match by 21-0.",
    });
  }

  if (closeWins >= 5) {
    achievements.push({
      id: "clutch",
      icon: "🧠",
      title: "Clutch Performer",
      description: "Won at least 5 matches by a margin of 2 points or fewer.",
    });
  }

  if (averageScored >= 18 && totalMatches >= 10) {
    achievements.push({
      id: "high-scorer",
      icon: "🚀",
      title: "High Scorer",
      description: "Averaged at least 18 points scored across 10 or more matches.",
    });
  }

  if (averageConceded <= 12 && totalMatches >= 10) {
    achievements.push({
      id: "stonewall",
      icon: "🛡️",
      title: "Stonewall",
      description: "Conceded 12 points or fewer on average across 10 or more matches.",
    });
  }

  if (displayedElo != null && initialElo != null && displayedElo - initialElo >= 100) {
    achievements.push({
      id: "elo-plus-100",
      icon: "📈",
      title: "Rating Climber",
      description: "Improved Elo by at least 100 points.",
    });
  }

  if (peakRating != null && peakRating >= 1200) {
    achievements.push({
      id: "peak-1200",
      icon: "🌟",
      title: "1200 Club",
      description: "Reached a peak Elo of 1200 or higher.",
    });
  }

  if (comebackStreak && totalWins >= 3) {
    achievements.push({
      id: "on-a-roll",
      icon: "🎮",
      title: "On a Roll",
      description: "Ended the selected range with a 3-match winning streak.",
    });
  }

  if (totalLosses === 0 && totalMatches >= 10) {
    achievements.push({
      id: "untouched",
      icon: "✨",
      title: "Untouched",
      description: "Stayed undefeated across at least 10 matches.",
    });
  }

  return achievements;
}

function RangeTabs({ clubSlug, clubPlayerId, activeRange }) {
  return (
    <div className="overflow-x-auto rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.92),rgba(5,12,22,0.94))] p-3 shadow-[0_20px_50px_rgba(3,12,22,0.28)]">
      <div className="flex min-w-max flex-nowrap gap-3">
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.value === activeRange;
          return (
            <Link
              key={option.value}
              href={`/clubs/${clubSlug}/players/${clubPlayerId}?range=${option.value}`}
              className={`rounded-full px-4 py-3 text-center text-sm font-semibold whitespace-nowrap transition ${
                isActive
                  ? "bg-white/85 text-[#11151a]"
                  : "bg-transparent text-white/62 hover:bg-white/8 hover:text-white"
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
      <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-white/5 px-5 py-8 text-center text-white/65">
        No Elo history is available for the {rangeLabel.toLowerCase()} range.
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

  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${path} L ${coordinates.at(-1).x.toFixed(2)} ${chartBottom} L ${coordinates[0].x.toFixed(2)} ${chartBottom} Z`;
  const yTicks = [max, Math.round((max + min) / 2), min];
  const bottomLabels = [
    points[0]?.label ?? "Start",
    points[Math.floor((points.length - 1) / 2)]?.label ?? "Mid",
    points.at(-1)?.label ?? "Now",
  ];

  return (
    <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold text-white">Career Elo Chart</p>
          <p className="mt-2 text-sm text-white/60">
            {points.length} recorded point{points.length === 1 ? "" : "s"} in {rangeLabel.toLowerCase()}
          </p>
        </div>
        <div className="text-right text-sm text-white/55">
          <p>High {max}</p>
          <p>Low {min}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(24,206,195,0.15),transparent_40%),rgba(255,255,255,0.03)] px-4 py-4">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div className="flex h-40 flex-col justify-between pt-1 text-xs text-white/45">
            {yTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="elo-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#14d4c6" />
                  <stop offset="100%" stopColor="#1bc1df" />
                </linearGradient>
                <linearGradient id="elo-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(43, 196, 226, 0.38)" />
                  <stop offset="100%" stopColor="rgba(43, 196, 226, 0.12)" />
                </linearGradient>
              </defs>
              {yTicks.map((tick) => {
                const y = chartBottom - ((tick - min) / range) * chartHeight;
                return (
                  <line
                    key={tick}
                    x1="0"
                    y1={y}
                    x2={width}
                    y2={y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="0.6"
                  />
                );
              })}
              <path d={areaPath} fill="url(#elo-fill)" />
              <path d={path} fill="none" stroke="url(#elo-stroke)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
        <div />
        <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-white/45">
          {bottomLabels.map((label, index) => (
            <span key={`${label}-${index}`} className={index === 1 ? "text-center" : ""}>
              {label}
            </span>
          ))}
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

  const { data: clubPlayer, error: clubPlayerError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        club_id,
        elo_initial,
        elo_current,
        player:players (
          full_name,
          avatar_url
        )
      `
    )
    .eq("id", clubPlayerId)
    .eq("club_id", club.id)
    .maybeSingle();

  if (clubPlayerError) {
    throw new Error(clubPlayerError.message);
  }

  if (!clubPlayer) {
    notFound();
  }

  const { data: participantRows, error: participantError } = await supabase
    .from("match_participants")
    .select(
      `
        match_id,
        team,
        points_scored,
        points_allowed,
        created_at,
        match:matches (
          played_at,
          status,
          winning_team,
          team1_score,
          team2_score
        )
      `
    )
    .eq("club_player_id", clubPlayerId);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const approvedParticipants = (participantRows ?? [])
    .filter((row) => row.match?.status === "approved")
    .sort(
      (a, b) =>
        new Date(a.match?.played_at ?? a.created_at).getTime() -
        new Date(b.match?.played_at ?? b.created_at).getTime()
    );

  const filteredParticipants = rangeStart
    ? approvedParticipants.filter(
        (row) => new Date(row.match?.played_at ?? row.created_at).getTime() >= rangeStart.getTime()
      )
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

  if (eloError) {
    throw new Error(eloError.message);
  }

  const filteredEloRows = rangeStart
    ? (eloRows ?? []).filter((row) => new Date(row.recorded_on).getTime() >= rangeStart.getTime())
    : (eloRows ?? []);

  const chartPoints = [];

  if (filteredEloRows.length > 0) {
    chartPoints.push({ elo: filteredEloRows[0].elo_before, label: "Start" });

    for (const row of filteredEloRows) {
      chartPoints.push({
        elo: row.elo_after,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(row.recorded_on)),
      });
    }
  }

  const totalMatches = filteredParticipants.length;
  const totalWins = results.filter((result) => result === "W").length;
  const totalLosses = results.filter((result) => result === "L").length;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
  const peakRating =
    chartPoints.length > 0
      ? Math.max(...chartPoints.map((point) => point.elo))
      : activeRange.value === "all"
        ? Math.max(clubPlayer.elo_initial ?? 1000, clubPlayer.elo_current ?? 1000)
        : null;
  const displayedElo =
    filteredEloRows.length > 0
      ? filteredEloRows.at(-1).elo_after
      : activeRange.value === "all"
        ? clubPlayer.elo_current ?? 1000
        : null;
  const allTimeTotalMatches = approvedParticipants.length;
  const allTimeTotalWins = approvedParticipants.filter((row) => row.team === row.match?.winning_team).length;
  const allTimeTotalLosses = allTimeTotalMatches - allTimeTotalWins;
  const allTimeTotalPointsScored = approvedParticipants.reduce((sum, row) => sum + (row.points_scored ?? 0), 0);
  const allTimeTotalPointsConceded = approvedParticipants.reduce((sum, row) => sum + (row.points_allowed ?? 0), 0);
  const allTimeResults = approvedParticipants.map((row) => (row.team === row.match?.winning_team ? "W" : "L"));
  const allTimePerformance = buildPerformanceSummary(allTimeResults);
  const allTimePeakRating =
    (eloRows ?? []).length > 0
      ? Math.max(clubPlayer.elo_initial ?? 1000, ...(eloRows ?? []).map((row) => row.elo_after))
      : Math.max(clubPlayer.elo_initial ?? 1000, clubPlayer.elo_current ?? 1000);

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
    ? await supabase
        .from("match_participants")
        .select(
          `
            match_id,
            club_player_id,
            team,
            club_player:club_players (
              id,
              elo_current,
              player:players (
                full_name,
                avatar_url
              )
            )
          `
        )
        .in("match_id", filteredMatchIds)
    : { data: [], error: null };

  if (partnerError) {
    throw new Error(partnerError.message);
  }

  const playerMatchesById = new Map(filteredParticipants.map((row) => [row.match_id, row]));
  const partnerSummary = new Map();

  for (const row of partnerRows ?? []) {
    const playerMatch = playerMatchesById.get(row.match_id);

    if (!playerMatch || row.club_player_id === clubPlayerId || row.team !== playerMatch.team) {
      continue;
    }

    const key = row.club_player_id;
    const current = partnerSummary.get(key) ?? {
      id: row.club_player?.id ?? row.club_player_id,
      name: row.club_player?.player?.full_name ?? "Unknown player",
      avatarUrl: row.club_player?.player?.avatar_url ?? "",
      matches: 0,
      wins: 0,
      losses: 0,
    };

    current.matches += 1;

    if (playerMatch.team === playerMatch.match?.winning_team) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }

    partnerSummary.set(key, current);
  }

  const topPartners = [...partnerSummary.values()]
    .map((partner) => ({
      ...partner,
      winRate: partner.matches > 0 ? (partner.wins / partner.matches) * 100 : 0,
    }))
    .filter((partner) => partner.matches >= 5)
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 5);

  const rivalSummary = new Map();

  for (const row of partnerRows ?? []) {
    const playerMatch = playerMatchesById.get(row.match_id);

    if (!playerMatch || row.club_player_id === clubPlayerId || row.team === playerMatch.team) {
      continue;
    }

    const current = rivalSummary.get(row.club_player_id) ?? {
      id: row.club_player?.id ?? row.club_player_id,
      name: row.club_player?.player?.full_name ?? "Unknown player",
      avatarUrl: row.club_player?.player?.avatar_url ?? "",
      elo: row.club_player?.elo_current ?? 1000,
      matches: 0,
      playerWins: 0,
      playerLosses: 0,
    };

    current.matches += 1;

    if (playerMatch.team === playerMatch.match?.winning_team) {
      current.playerWins += 1;
    } else {
      current.playerLosses += 1;
    }

    rivalSummary.set(row.club_player_id, current);
  }

  const rival = [...rivalSummary.values()]
    .map((entry) => ({
      ...entry,
      playerWinRate: entry.matches > 0 ? (entry.playerWins / entry.matches) * 100 : 0,
    }))
    .filter(
      (entry) =>
        entry.matches >= 5 &&
        entry.playerWinRate < 50 &&
        entry.elo < (clubPlayer.elo_current ?? clubPlayer.elo_initial ?? 1000),
    )
    .sort((a, b) => {
      if (a.playerWinRate !== b.playerWinRate) return a.playerWinRate - b.playerWinRate;
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (b.playerLosses !== a.playerLosses) return b.playerLosses - a.playerLosses;
      return a.name.localeCompare(b.name);
    })[0] ?? null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/clubs/${clubSlug}`} className="text-sm font-medium text-[#17dccb]">
          Back to leaderboard
        </Link>
      </div>

      <RangeTabs clubSlug={clubSlug} clubPlayerId={clubPlayerId} activeRange={activeRange.value} />

      <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(4,11,20,0.98))] px-5 pb-6 pt-6 shadow-[0_26px_70px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px] border-white/80 bg-gradient-to-br from-[#163047] to-[#0f2236] bg-cover bg-center text-3xl font-semibold text-white shadow-[0_18px_40px_rgba(2,14,28,0.35)]"
            style={clubPlayer.player?.avatar_url ? { backgroundImage: `url(${clubPlayer.player.avatar_url})` } : undefined}
          >
            {!clubPlayer.player?.avatar_url ? getInitials(clubPlayer.player?.full_name ?? "P") : null}
          </div>

          <div>
            <h1 className="font-mono text-3xl font-semibold text-white">
              {clubPlayer.player?.full_name ?? "Unknown player"}
            </h1>
            <p className="mt-2 text-2xl text-white/82">
              {displayedElo != null ? `Elo ${displayedElo}` : `No matches in ${activeRange.label.toLowerCase()}`}
            </p>
            <p className="mt-2 text-sm text-white/55">Showing stats for {activeRange.label.toLowerCase()}.</p>
          </div>
        </div>

        {totalMatches === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-white/12 bg-white/5 px-5 py-8 text-center text-white/65">
            This player has no approved matches in the selected time range.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total Matches" value={totalMatches} />
          <StatCard label="Wins" value={totalWins} />
          <StatCard label="Losses" value={totalLosses} />
          <StatCard label="Win Rate" value={`${formatDecimal(winRate)}%`} />
          <StatCard label="Total Points Scored" value={totalPointsScored} />
          <StatCard
            label="Average Points Scored"
            value={formatDecimal(totalMatches > 0 ? totalPointsScored / totalMatches : 0)}
          />
          <StatCard label="Total Points Conceded" value={totalPointsConceded} />
          <StatCard
            label="Average Points Conceded"
            value={formatDecimal(totalMatches > 0 ? totalPointsConceded / totalMatches : 0)}
          />
        </div>

        <div className="mt-7 rounded-[1.9rem] border border-white/10 bg-white/5 px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-mono text-2xl font-semibold text-white">Performance</h2>
            <div className="text-right">
              <p className="text-sm uppercase tracking-[0.22em] text-white/45">Recent Form</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {performance.recent.length > 0 ? performance.recent.join("") : "No matches yet"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-lg text-white/88">
            <div className="flex items-center justify-between gap-4">
              <span>Peak Rating</span>
              <span>{peakRating != null ? peakRating : "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Longest Win Streak</span>
              <span>{performance.longestWinStreak}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Longest Lose Streak</span>
              <span>{performance.longestLoseStreak}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Current Streak</span>
              <span>{performance.currentStreakLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <EloChart points={chartPoints} rangeLabel={activeRange.label} />

      <AchievementSection achievements={achievements} rangeLabel={activeRange.label} />

      <RivalSection clubSlug={clubSlug} rival={rival} rangeLabel={activeRange.label} />

      <BestPartnersSection clubSlug={clubSlug} partners={topPartners} rangeLabel={activeRange.label} />

      <Link
        href={`/clubs/${clubSlug}/players/${clubPlayerId}/match-log`}
        className="block rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-4 text-center text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]"
      >
        Match Log
      </Link>
    </section>
  );
}
