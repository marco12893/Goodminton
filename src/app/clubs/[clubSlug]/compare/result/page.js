import Link from "next/link";
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

function AvatarStack({ items, title, subtitle, stacked = false }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex items-center justify-center ${stacked ? "-space-x-5" : "gap-3"}`}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className="relative flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-white/80 bg-gradient-to-br from-[#13d8c7] to-[#17b7e7] bg-cover bg-center text-3xl font-semibold text-white shadow-[0_18px_40px_rgba(2,14,28,0.35)]"
            style={{
              backgroundImage: item.avatarUrl ? `url(${item.avatarUrl})` : undefined,
              zIndex: items.length - index,
            }}
          >
            {!item.avatarUrl ? getInitials(item.name) : null}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-balance text-[1.7rem] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[1.8rem] font-semibold text-white/88">{subtitle}</p>
      </div>
    </div>
  );
}

function H2HCard({ leftWins, rightWins }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(239,248,248,0.95),rgba(210,241,241,0.92))] px-5 py-6 text-center text-[#081722] shadow-[0_22px_50px_rgba(3,12,22,0.26)]">
      <p className="text-[2rem] font-semibold">H2H Record</p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-[4.3rem] font-semibold text-[#34c82c]">{leftWins}</span>
        <span className="text-[3.6rem] font-semibold text-[#8ca4b0]">-</span>
        <span className="text-[4.3rem] font-semibold text-[#ff3838]">{rightWins}</span>
      </div>
    </div>
  );
}

function ProbabilityCard({ leftLabel, rightLabel, leftPercent, rightPercent, note }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(239,248,248,0.95),rgba(210,241,241,0.92))] px-5 py-6 text-[#081722] shadow-[0_22px_50px_rgba(3,12,22,0.26)]">
      <p className="text-center text-[2rem] font-semibold">Win Probability</p>
      <div className="mt-5">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span className="text-[#1db955]">{formatNumber(leftPercent, 1)}%</span>
          <span className="text-[#f44336]">{formatNumber(rightPercent, 1)}%</span>
        </div>
        <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-[#dfe9eb]">
          <div
            className="h-full bg-gradient-to-r from-[#1db955] to-[#17c7a8]"
            style={{ width: `${leftPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-[#ff5448] to-[#ff1f1f]"
            style={{ width: `${rightPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-start justify-between gap-4 text-lg font-medium">
          <span>{leftLabel}</span>
          <span className="text-right">{rightLabel}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#081722]/68">{note}</p>
      </div>
    </div>
  );
}

function StatsTable({ title, leftLabel, rightLabel, rows, footnote }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(239,248,248,0.95),rgba(210,241,241,0.92))] px-5 py-6 text-[#081722] shadow-[0_22px_50px_rgba(3,12,22,0.26)]">
      <p className="text-center text-[2rem] font-semibold">{title}</p>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-4">
        <p className="text-left text-lg font-semibold">{leftLabel}</p>
        <p />
        <p className="text-right text-lg font-semibold">{rightLabel}</p>
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <p key={`${row.label}-left`} className="text-left text-lg font-medium">
              {row.left}
            </p>
            <p className="text-center text-base text-[#081722]/76">
              {row.label}
            </p>
            <p className="text-right text-lg font-medium">
              {row.right}
            </p>
          </div>
        ))}
      </div>
      {footnote ? <p className="mt-5 text-sm leading-6 text-[#081722]/68">{footnote}</p> : null}
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

  const { data: selectedClubPlayers, error: selectedError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        elo_initial,
        elo_current,
        player:players (
          full_name,
          avatar_url
        )
      `
    )
    .eq("club_id", club.id)
    .in("id", selectedIds);

  if (selectedError) {
    throw new Error(selectedError.message);
  }

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

  if (rankError) {
    throw new Error(rankError.message);
  }

  const { data: participantRows, error: participantError } = await supabase
    .from("match_participants")
    .select(
      `
        club_player_id,
        team,
        points_scored,
        points_allowed,
        match:matches (
          id,
          club_id,
          status,
          winning_team,
          played_at
        )
      `
    )
    .in("club_player_id", selectedIds);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const { data: eloHistoryRows, error: eloError } = await supabase
    .from("elo_history")
    .select("club_player_id, elo_after")
    .in("club_player_id", selectedIds);

  if (eloError) {
    throw new Error(eloError.message);
  }

  const { data: clubMatches, error: matchError } = await supabase
    .from("matches")
    .select(
      `
        id,
        winning_team,
        status,
        participants:match_participants (
          club_player_id,
          team
        )
      `
    )
    .eq("club_id", club.id)
    .eq("status", "approved");

  if (matchError) {
    throw new Error(matchError.message);
  }

  const rankMap = buildRankMap(allRanksRows ?? []);
  const participantMap = new Map(selectedIds.map((id) => [id, []]));
  const eloMap = new Map(selectedIds.map((id) => [id, []]));

  for (const row of participantRows ?? []) {
    if (row.match?.status === "approved") {
      participantMap.get(row.club_player_id)?.push(row);
    }
  }

  for (const row of eloHistoryRows ?? []) {
    eloMap.get(row.club_player_id)?.push(row);
  }

  const selectedMap = new Map((selectedClubPlayers ?? []).map((player) => [player.id, player]));
  const orderedClubPlayers = selectedIds.map((id) => selectedMap.get(id));

  const memberStats = orderedClubPlayers.map((clubPlayer) =>
    buildPlayerStats(
      clubPlayer,
      rankMap.get(clubPlayer.id),
      participantMap.get(clubPlayer.id) ?? [],
      eloMap.get(clubPlayer.id) ?? [],
    )
  );

  const leftEntity =
    mode === "singles"
      ? memberStats[0]
      : buildTeamStats(memberStats.slice(0, 2), "Team 1");
  const rightEntity =
    mode === "singles"
      ? memberStats[1]
      : buildTeamStats(memberStats.slice(2, 4), "Team 2");

  const h2h =
    mode === "singles"
      ? buildSinglesHeadToHead(clubMatches ?? [], selectedIds[0], selectedIds[1])
      : buildDoublesHeadToHead(clubMatches ?? [], selectedIds.slice(0, 2), selectedIds.slice(2, 4));

  const leftProbability = calculateWinProbability(leftEntity.elo, rightEntity.elo) * 100;
  const rightProbability = 100 - leftProbability;

  const statRows =
    mode === "singles"
      ? [
          { label: "Elo", left: formatNumber(leftEntity.elo), right: formatNumber(rightEntity.elo) },
          { label: "Rank", left: `#${leftEntity.rank ?? "-"}`, right: `#${rightEntity.rank ?? "-"}` },
          { label: "Matches Played", left: formatNumber(leftEntity.totalMatches), right: formatNumber(rightEntity.totalMatches) },
          { label: "Wins", left: formatNumber(leftEntity.wins), right: formatNumber(rightEntity.wins) },
          { label: "Losses", left: formatNumber(leftEntity.losses), right: formatNumber(rightEntity.losses) },
          { label: "Win Rate", left: `${formatNumber(leftEntity.winRate, 1)}%`, right: `${formatNumber(rightEntity.winRate, 1)}%` },
          { label: "Avg Points Scored", left: formatNumber(leftEntity.avgPointsScored, 2), right: formatNumber(rightEntity.avgPointsScored, 2) },
          { label: "Avg Points Conceded", left: formatNumber(leftEntity.avgPointsConceded, 2), right: formatNumber(rightEntity.avgPointsConceded, 2) },
        ]
      : [
          { label: "Avg Elo", left: formatNumber(leftEntity.elo, 1), right: formatNumber(rightEntity.elo, 1) },
          { label: "Avg Rank", left: `#${formatNumber(leftEntity.rank, 1)}`, right: `#${formatNumber(rightEntity.rank, 1)}` },
          { label: "Avg Matches", left: formatNumber(leftEntity.totalMatches, 1), right: formatNumber(rightEntity.totalMatches, 1) },
          { label: "Avg Wins", left: formatNumber(leftEntity.wins, 1), right: formatNumber(rightEntity.wins, 1) },
          { label: "Avg Losses", left: formatNumber(leftEntity.losses, 1), right: formatNumber(rightEntity.losses, 1) },
          { label: "Avg Win Rate", left: `${formatNumber(leftEntity.winRate, 1)}%`, right: `${formatNumber(rightEntity.winRate, 1)}%` },
          { label: "Avg Points Scored", left: formatNumber(leftEntity.avgPointsScored, 2), right: formatNumber(rightEntity.avgPointsScored, 2) },
          { label: "Avg Points Conceded", left: formatNumber(leftEntity.avgPointsConceded, 2), right: formatNumber(rightEntity.avgPointsConceded, 2) },
        ];

  return (
    <section className="space-y-5">
      
      <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(4,11,20,0.98))] px-5 py-6 shadow-[0_26px_70px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <AvatarStack
              items={mode === "singles" ? [leftEntity] : leftEntity.members}
              title={mode === "singles" ? leftEntity.name : "Team 1"}
              subtitle={`Elo ${formatNumber(leftEntity.elo, leftEntity.elo % 1 ? 1 : 0)}`}
              stacked={mode === "doubles"}
            />
          </div>
          <p className="text-center text-[3rem] font-semibold leading-none text-white md:text-[3.4rem]">VS</p>
          <div>
            <AvatarStack
              items={mode === "singles" ? [rightEntity] : rightEntity.members}
              title={mode === "singles" ? rightEntity.name : "Team 2"}
              subtitle={`Elo ${formatNumber(rightEntity.elo, rightEntity.elo % 1 ? 1 : 0)}`}
              stacked={mode === "doubles"}
            />
          </div>
        </div>
      </div>

      <H2HCard leftWins={h2h.leftWins} rightWins={h2h.rightWins} />

      <ProbabilityCard
        leftLabel={mode === "singles" ? leftEntity.name : "Team 1"}
        rightLabel={mode === "singles" ? rightEntity.name : "Team 2"}
        leftPercent={leftProbability}
        rightPercent={rightProbability}
        note={
          mode === "singles"
            ? "Win probability uses the current Elo of each player."
            : "Win probability uses the average current Elo of the two selected players on each team."
        }
      />

      <StatsTable
        title="Stats Comparison"
        leftLabel={mode === "singles" ? leftEntity.name : "Team 1"}
        rightLabel={mode === "singles" ? rightEntity.name : "Team 2"}
        rows={statRows}
        footnote={
          mode === "doubles"
            ? "Team comparison uses the average of each selected member's current club stats, while the H2H record only counts exact Team 1 vs Team 2 matchups."
            : null
        }
      />
    </section>
  );
}
