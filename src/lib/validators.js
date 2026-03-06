export function ensureRequiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} wajib diisi.`);
  }

  return value.trim();
}

export function optionalString(value) {
  if (value == null || value === "") {
    return null;
  }

  return String(value).trim();
}

export function optionalDate(value, field) {
  if (value == null || value === "") {
    return null;
  }

  const isoDate = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error(`${field} harus format YYYY-MM-DD.`);
  }

  return isoDate;
}

export function optionalInteger(value, field) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${field} harus berupa angka.`);
  }

  return parsed;
}

export function ensureScore(value, field) {
  const parsed = optionalInteger(value, field);
  if (parsed == null || parsed < 0) {
    throw new Error(`${field} harus angka >= 0.`);
  }

  return parsed;
}

export function ensureArray(value, field) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} wajib berupa array.`);
  }

  return value;
}

export function ensureParticipantPayload(participants) {
  const normalized = ensureArray(participants, "participants").map((item) => ({
    club_player_id: ensureRequiredString(item.club_player_id, "club_player_id"),
    team: optionalInteger(item.team, "team"),
    slot: optionalInteger(item.slot, "slot"),
    points_scored: ensureScore(item.points_scored, "points_scored"),
    points_allowed: ensureScore(item.points_allowed, "points_allowed"),
    elo_before: ensureScore(item.elo_before, "elo_before"),
    elo_after: ensureScore(item.elo_after, "elo_after"),
    elo_delta: optionalInteger(item.elo_delta, "elo_delta"),
  }));

  if (normalized.length !== 4) {
    throw new Error("participants harus berisi tepat 4 pemain.");
  }

  const keys = new Set();
  for (const item of normalized) {
    if (![1, 2].includes(item.team)) {
      throw new Error("team participant harus 1 atau 2.");
    }

    if (![1, 2].includes(item.slot)) {
      throw new Error("slot participant harus 1 atau 2.");
    }

    const key = `${item.team}-${item.slot}`;
    if (keys.has(key)) {
      throw new Error("Kombinasi team-slot participant harus unik.");
    }

    keys.add(key);

    if (item.elo_delta == null) {
      item.elo_delta = item.elo_after - item.elo_before;
    }
  }

  return normalized;
}
