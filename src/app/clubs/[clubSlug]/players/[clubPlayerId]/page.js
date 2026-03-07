import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function EloChart({ points }) {
  if (points.length === 0) {
    return (
      <div className="rounded-[1.7rem] border border-dashed border-white/12 bg-white/5 px-5 py-8 text-center text-white/65">
        Elo history will appear after this player&apos;s first approved match.
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

    return {
      ...point,
      x,
      y,
    };
  });

  const path = coordinates
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath = `${path} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${chartBottom} L ${coordinates[0].x.toFixed(2)} ${chartBottom} Z`;
  const yTicks = [max, Math.round((max + min) / 2), min];
  const bottomLabels = [
    points[0]?.label ?? "Start",
    points[Math.floor((points.length - 1) / 2)]?.label ?? "Mid",
    points[points.length - 1]?.label ?? "Now",
  ];

  return (
    <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-5 shadow-[0_20px_50px_rgba(3,12,22,0.3)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-2xl font-semibold text-white">Career Elo Chart</p>
          <p className="mt-2 text-sm text-white/60">
            {points.length} recorded point{points.length === 1 ? "" : "s"}
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
              {coordinates.map((point, index) => (
                <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="1.5" fill="#ffffff" />
              ))}
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

export default async function ClubPlayerProfilePage({ params }) {
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

  const { data: clubPlayer, error: clubPlayerError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        club_id,
        elo_initial,
        elo_current,
        total_matches,
        total_wins,
        total_losses,
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
        team,
        points_scored,
        points_allowed,
        created_at,
        match:matches (
          played_at,
          status,
          winning_team
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

  const totalPointsScored = approvedParticipants.reduce((sum, row) => sum + (row.points_scored ?? 0), 0);
  const totalPointsConceded = approvedParticipants.reduce((sum, row) => sum + (row.points_allowed ?? 0), 0);
  const results = approvedParticipants.map((row) => (row.team === row.match?.winning_team ? "W" : "L"));
  const performance = buildPerformanceSummary(results);

  const { data: eloRows, error: eloError } = await supabase
    .from("elo_history")
    .select("recorded_on, elo_before, elo_after")
    .eq("club_player_id", clubPlayerId)
    .order("recorded_on", { ascending: true });

  if (eloError) {
    throw new Error(eloError.message);
  }

  const chartPoints = [];

  if ((eloRows ?? []).length > 0) {
    chartPoints.push({ elo: eloRows[0].elo_before, label: "Start" });

    for (const row of eloRows) {
      chartPoints.push({
        elo: row.elo_after,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(row.recorded_on)),
      });
    }
  }

  const totalMatches = clubPlayer.total_matches ?? 0;
  const totalWins = clubPlayer.total_wins ?? 0;
  const totalLosses = clubPlayer.total_losses ?? 0;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
  const peakRating = Math.max(
    clubPlayer.elo_initial ?? 1000,
    clubPlayer.elo_current ?? 1000,
    ...((eloRows ?? []).flatMap((row) => [row.elo_before, row.elo_after]))
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/clubs/${clubSlug}`} className="text-sm font-medium text-[#17dccb]">
          Back to leaderboard
        </Link>
      </div>

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
            <p className="mt-2 text-2xl text-white/82">Elo {clubPlayer.elo_current ?? 1000}</p>
          </div>
        </div>

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
              <span>{peakRating}</span>
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

      <EloChart points={chartPoints} />
    </section>
  );
}
