function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

export function calculateWinProbability(leftElo, rightElo) {
  return 1 / (1 + Math.pow(10, (rightElo - leftElo) / 400));
}

export function buildRankMap(rows) {
  return new Map(rows.map((row, index) => [row.id, index + 1]));
}

function buildStreakSummary(participants) {
  if (!participants.length) {
    return {
      currentStreakType: null,
      currentStreakLength: 0,
      currentStreakLabel: "No streak",
      longestWinStreak: 0,
      longestLoseStreak: 0,
    };
  }

  const ordered = [...participants].sort((left, right) => {
    const leftTime = new Date(left.match?.played_at ?? left.created_at).getTime();
    const rightTime = new Date(right.match?.played_at ?? right.created_at).getTime();
    return leftTime - rightTime;
  });

  const results = ordered.map((row) => (row.team === row.match?.winning_team ? "W" : "L"));
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

  const latestType = results.at(-1) ?? null;
  let latestLength = 0;
  for (let idx = results.length - 1; idx >= 0; idx -= 1) {
    if (results[idx] === latestType) {
      latestLength += 1;
    } else {
      break;
    }
  }

  return {
    currentStreakType: latestType,
    currentStreakLength: latestLength,
    currentStreakLabel:
      latestType === "W"
        ? `Win streak (${latestLength})`
        : `Lose streak (${latestLength})`,
    longestWinStreak,
    longestLoseStreak,
  };
}

export function buildPlayerStats(clubPlayer, rank, participants, eloRows) {
  const totalMatches = participants.length;
  const wins = participants.filter((row) => row.team === row.match?.winning_team).length;
  const losses = totalMatches - wins;
  const totalPointsScored = participants.reduce((sum, row) => sum + (row.points_scored ?? 0), 0);
  const totalPointsConceded = participants.reduce((sum, row) => sum + (row.points_allowed ?? 0), 0);
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const streakSummary = buildStreakSummary(participants);
  const peakRating =
    eloRows.length > 0
      ? Math.max(clubPlayer.elo_initial ?? 1000, ...eloRows.map((row) => row.elo_after ?? 0))
      : clubPlayer.elo_current ?? clubPlayer.elo_initial ?? 1000;

  return {
    id: clubPlayer.id,
    name: clubPlayer.player?.full_name ?? "Unknown player",
    avatarUrl: clubPlayer.player?.avatar_url ?? "",
    elo: clubPlayer.elo_current ?? clubPlayer.elo_initial ?? 1000,
    rank: rank ?? null,
    totalMatches,
    wins,
    losses,
    winRate,
    totalPointsScored,
    totalPointsConceded,
    avgPointsScored: totalMatches > 0 ? totalPointsScored / totalMatches : 0,
    avgPointsConceded: totalMatches > 0 ? totalPointsConceded / totalMatches : 0,
    peakRating,
    currentStreakType: streakSummary.currentStreakType,
    currentStreakLength: streakSummary.currentStreakLength,
    currentStreakLabel: streakSummary.currentStreakLabel,
    longestWinStreak: streakSummary.longestWinStreak,
    longestLoseStreak: streakSummary.longestLoseStreak,
  };
}

export function buildTeamStats(memberStats, label) {
  const count = memberStats.length || 1;
  const avgCurrentStreak = roundToOne(
    memberStats.reduce((sum, stat) => sum + (stat.currentStreakLength ?? 0), 0) / count
  );
  const allWinStreak = memberStats.every((stat) => stat.currentStreakType === "W");
  const allLoseStreak = memberStats.every((stat) => stat.currentStreakType === "L");
  const currentStreakLabel = allWinStreak
    ? `Win streak (${avgCurrentStreak})`
    : allLoseStreak
      ? `Lose streak (${avgCurrentStreak})`
      : "Mixed streaks";

  return {
    label,
    members: memberStats,
    elo: roundToOne(memberStats.reduce((sum, stat) => sum + stat.elo, 0) / count),
    rank: roundToOne(
      memberStats.reduce((sum, stat) => sum + (stat.rank ?? 0), 0) / count,
    ),
    totalMatches: roundToOne(memberStats.reduce((sum, stat) => sum + stat.totalMatches, 0) / count),
    wins: roundToOne(memberStats.reduce((sum, stat) => sum + stat.wins, 0) / count),
    losses: roundToOne(memberStats.reduce((sum, stat) => sum + stat.losses, 0) / count),
    winRate: memberStats.reduce((sum, stat) => sum + stat.winRate, 0) / count,
    avgPointsScored:
      memberStats.reduce((sum, stat) => sum + stat.avgPointsScored, 0) / count,
    avgPointsConceded:
      memberStats.reduce((sum, stat) => sum + stat.avgPointsConceded, 0) / count,
    peakRating: roundToOne(memberStats.reduce((sum, stat) => sum + stat.peakRating, 0) / count),
    currentStreakType: allWinStreak ? "W" : allLoseStreak ? "L" : null,
    currentStreakLength: avgCurrentStreak,
    currentStreakLabel,
    longestWinStreak: roundToOne(memberStats.reduce((sum, stat) => sum + (stat.longestWinStreak ?? 0), 0) / count),
    longestLoseStreak: roundToOne(memberStats.reduce((sum, stat) => sum + (stat.longestLoseStreak ?? 0), 0) / count),
  };
}

export function buildSinglesHeadToHead(matches, leftId, rightId) {
  let leftWins = 0;
  let rightWins = 0;

  for (const match of matches) {
    const team1 = match.participants.filter((participant) => participant.team === 1).map((participant) => participant.club_player_id);
    const team2 = match.participants.filter((participant) => participant.team === 2).map((participant) => participant.club_player_id);

    const leftOnTeam1 = team1.includes(leftId);
    const leftOnTeam2 = team2.includes(leftId);
    const rightOnTeam1 = team1.includes(rightId);
    const rightOnTeam2 = team2.includes(rightId);

    if (!((leftOnTeam1 && rightOnTeam2) || (leftOnTeam2 && rightOnTeam1))) {
      continue;
    }

    if ((leftOnTeam1 && match.winning_team === 1) || (leftOnTeam2 && match.winning_team === 2)) {
      leftWins += 1;
    } else {
      rightWins += 1;
    }
  }

  return {
    total: leftWins + rightWins,
    leftWins,
    rightWins,
  };
}

function sameMembers(teamIds, expectedIds) {
  if (teamIds.length !== expectedIds.length) {
    return false;
  }

  const sortedTeam = [...teamIds].sort();
  const sortedExpected = [...expectedIds].sort();

  return sortedTeam.every((value, index) => value === sortedExpected[index]);
}

export function buildDoublesHeadToHead(matches, leftIds, rightIds) {
  let leftWins = 0;
  let rightWins = 0;

  for (const match of matches) {
    const team1 = match.participants.filter((participant) => participant.team === 1).map((participant) => participant.club_player_id);
    const team2 = match.participants.filter((participant) => participant.team === 2).map((participant) => participant.club_player_id);

    const leftAsTeam1 = sameMembers(team1, leftIds) && sameMembers(team2, rightIds);
    const leftAsTeam2 = sameMembers(team2, leftIds) && sameMembers(team1, rightIds);

    if (!(leftAsTeam1 || leftAsTeam2)) {
      continue;
    }

    if ((leftAsTeam1 && match.winning_team === 1) || (leftAsTeam2 && match.winning_team === 2)) {
      leftWins += 1;
    } else {
      rightWins += 1;
    }
  }

  return {
    total: leftWins + rightWins,
    leftWins,
    rightWins,
  };
}
