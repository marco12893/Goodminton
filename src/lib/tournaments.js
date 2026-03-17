function toIsoDate(date) {
  return date.toISOString();
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shuffleArray(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function nextPowerOfTwo(value) {
  let current = 1;
  while (current < value) current *= 2;
  return current;
}

function buildSeedOrder(size) {
  if (size === 1) return [1];
  const previous = buildSeedOrder(size / 2);
  const order = [];

  previous.forEach((seed) => {
    order.push(seed);
    order.push(size + 1 - seed);
  });

  return order;
}

function buildEntryLabel(players) {
  return players.map((player) => player.player?.full_name ?? "Unknown player").join(" / ");
}

export function buildTournamentEntries(clubPlayers, category, seeding) {
  const orderedPlayers =
    seeding === "elo_based"
      ? [...clubPlayers].sort((a, b) => (b.elo_current ?? 1000) - (a.elo_current ?? 1000))
      : shuffleArray(clubPlayers);

  if (category === "singles") {
    return orderedPlayers.map((player, index) => ({
      id: crypto.randomUUID(),
      seed_number: index + 1,
      display_name: player.player?.full_name ?? "Unknown player",
      average_elo: player.elo_current ?? 1000,
      players: [player],
    }));
  }

  const entries = [];
  if (orderedPlayers.length % 2 !== 0) {
    throw new Error("Doubles tournaments require an even number of players.");
  }

  if (seeding === "elo_based") {
    let left = 0;
    let right = orderedPlayers.length - 1;
    while (left < right) {
      const pair = [orderedPlayers[left], orderedPlayers[right]];
      const averageElo = Math.round(pair.reduce((sum, player) => sum + (player.elo_current ?? 1000), 0) / pair.length);
      entries.push({
        id: crypto.randomUUID(),
        seed_number: entries.length + 1,
        display_name: buildEntryLabel(pair),
        average_elo: averageElo,
        players: pair,
      });
      left += 1;
      right -= 1;
    }

    entries
      .sort((a, b) => (b.average_elo ?? 1000) - (a.average_elo ?? 1000))
      .forEach((entry, index) => {
        entry.seed_number = index + 1;
      });
  } else {
    for (let index = 0; index < orderedPlayers.length; index += 2) {
      const pair = orderedPlayers.slice(index, index + 2);
      if (pair.length < 2) break;
      const averageElo = Math.round(pair.reduce((sum, player) => sum + (player.elo_current ?? 1000), 0) / pair.length);
      entries.push({
        id: crypto.randomUUID(),
        seed_number: entries.length + 1,
        display_name: buildEntryLabel(pair),
        average_elo: averageElo,
        players: pair,
      });
    }
  }

  return entries;
}

export function generateRoundRobinMatches(tournamentId, entries, scheduledAt) {
  const pool = [...entries];
  if (pool.length % 2 === 1) {
    pool.push(null);
  }

  const rounds = [];
  const working = [...pool];
  const roundCount = Math.max(working.length - 1, 0);

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const pairings = [];
    for (let pairIndex = 0; pairIndex < working.length / 2; pairIndex += 1) {
      const left = working[pairIndex];
      const right = working[working.length - 1 - pairIndex];
      if (left && right) {
        pairings.push([left, right]);
      }
    }
    rounds.push(pairings);

    const first = working[0];
    const rest = working.slice(1);
    rest.unshift(rest.pop());
    working.splice(0, working.length, first, ...rest);
  }

  const baseDate = new Date(scheduledAt);
  const matches = [];

  rounds.forEach((round, roundIndex) => {
    round.forEach(([entry1, entry2], matchIndex) => {
      matches.push({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        stage: "round_robin",
        round_number: roundIndex + 1,
        match_number: matchIndex + 1,
        scheduled_at: toIsoDate(addMinutes(addDays(baseDate, roundIndex), matchIndex * 30)),
        entry1_id: entry1.id,
        entry2_id: entry2.id,
        score1: null,
        score2: null,
        winner_entry_id: null,
        status: "pending",
        next_match_id: null,
        next_slot: null,
        loser_next_match_id: null,
        loser_next_slot: null,
      });
    });
  });

  return matches;
}

function pushWinner(match, winnerId, matchMap) {
  if (!match.next_match_id || !winnerId) return;
  const next = matchMap.get(match.next_match_id);
  if (!next) return;
  if (match.next_slot === 1) next.entry1_id = winnerId;
  if (match.next_slot === 2) next.entry2_id = winnerId;
}

function pushLoser(match, loserId, matchMap) {
  if (!match.loser_next_match_id || !loserId) return;
  const next = matchMap.get(match.loser_next_match_id);
  if (!next) return;
  if (match.loser_next_slot === 1) next.entry1_id = loserId;
  if (match.loser_next_slot === 2) next.entry2_id = loserId;
}

function autoAdvanceByes(matches) {
  const matchMap = new Map(matches.map((match) => [match.id, match]));
  let changed = true;

  while (changed) {
    changed = false;

    matches.forEach((match) => {
      if (match.status === "completed") return;
      const filled = [match.entry1_id, match.entry2_id].filter(Boolean);
      if (filled.length !== 1) return;

      match.winner_entry_id = filled[0];
      match.status = "completed";
      pushWinner(match, filled[0], matchMap);
      changed = true;
    });
  }
}

export function generateKnockoutMatches(tournamentId, entries, scheduledAt) {
  const size = nextPowerOfTwo(entries.length);
  const seedOrder = buildSeedOrder(size);
  const seededSlots = Array.from({ length: size }, (_, index) => entries[seedOrder[index] - 1] ?? null);
  const totalRounds = Math.log2(size);
  const rounds = [];
  const baseDate = new Date(scheduledAt);

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const matchesInRound = size / 2 ** (roundIndex + 1);
    const stage = "knockout";
    const roundNumber = roundIndex + 1;
    const roundMatches = Array.from({ length: matchesInRound }, (_, matchIndex) => ({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      stage,
      round_number: roundNumber,
      match_number: matchIndex + 1,
      scheduled_at: toIsoDate(addMinutes(addDays(baseDate, roundIndex * 2), matchIndex * 45)),
      entry1_id: null,
      entry2_id: null,
      score1: null,
      score2: null,
      winner_entry_id: null,
      status: "pending",
      next_match_id: null,
      next_slot: null,
      loser_next_match_id: null,
      loser_next_slot: null,
    }));
    rounds.push(roundMatches);
  }

  for (let index = 0; index < rounds[0].length; index += 1) {
    rounds[0][index].entry1_id = seededSlots[index * 2]?.id ?? null;
    rounds[0][index].entry2_id = seededSlots[index * 2 + 1]?.id ?? null;
  }

  for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex += 1) {
    rounds[roundIndex].forEach((match, matchIndex) => {
      const nextMatch = rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
      match.next_match_id = nextMatch.id;
      match.next_slot = matchIndex % 2 === 0 ? 1 : 2;
    });
  }

  const allMatches = rounds.flat();

  if (rounds.length >= 2) {
    const semifinals = rounds[rounds.length - 2];
    if (semifinals.length === 2) {
      const thirdPlace = {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        stage: "third_place",
        round_number: totalRounds,
        match_number: 1,
        scheduled_at: toIsoDate(addMinutes(addDays(baseDate, totalRounds * 2), -60)),
        entry1_id: null,
        entry2_id: null,
        score1: null,
        score2: null,
        winner_entry_id: null,
        status: "pending",
        next_match_id: null,
        next_slot: null,
        loser_next_match_id: null,
        loser_next_slot: null,
      };

      semifinals[0].loser_next_match_id = thirdPlace.id;
      semifinals[0].loser_next_slot = 1;
      semifinals[1].loser_next_match_id = thirdPlace.id;
      semifinals[1].loser_next_slot = 2;
      allMatches.push(thirdPlace);
    }
  }

  autoAdvanceByes(allMatches);
  return allMatches;
}

export function computeTournamentStatus(matches) {
  if (!matches.length) return "upcoming";
  const completed = matches.filter((match) => match.status === "completed").length;
  if (completed === 0) return "upcoming";
  if (completed === matches.length) return "completed";
  return "in_progress";
}

export function getTournamentDisplayName(entry) {
  return entry?.display_name ?? "TBD";
}

export function getFormatLabel(value) {
  return value === "round_robin" ? "Round Robin" : "Knockout";
}

export function getSeedingLabel(value) {
  return value === "elo_based" ? "Elo Based" : "Random";
}

export function getCategoryLabel(value) {
  return value === "doubles" ? "Doubles" : "Singles";
}

export function getRoundLabel(format, stage, roundNumber, totalRounds) {
  if (stage === "third_place") return "Third Place";
  if (format === "round_robin") return `Round ${roundNumber}`;
  if (roundNumber === totalRounds) return "Final";
  if (roundNumber === totalRounds - 1) return "Semifinal";
  if (roundNumber === totalRounds - 2) return "Quarterfinal";
  return `Round ${roundNumber}`;
}
