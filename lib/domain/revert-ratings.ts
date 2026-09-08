export type RatingScope = "group" | "global";

export type HistoryForRevert = {
  userId: string;
  scope: RatingScope;
  ratingBefore: number;
  gameSeq: number;
};

export type RatingRevert = {
  userId: string;
  scope: RatingScope;
  /** Rating to restore (before the earliest game of the deleted termin). */
  rating: number;
  gamesToRemove: number;
};

/**
 * Plan how to unwind Elo after deleting a termin.
 *
 * Safe only when the player has no later rating_history (key in
 * `usersWithLaterHistory` as `${scope}:${userId}`). Otherwise that player is
 * skipped — replaying later games would be required.
 */
export function planRatingReverts(
  history: HistoryForRevert[],
  usersWithLaterHistory: ReadonlySet<string>,
): RatingRevert[] {
  const byKey = new Map<string, HistoryForRevert[]>();

  for (const row of history) {
    const key = `${row.scope}:${row.userId}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const plan: RatingRevert[] = [];

  for (const [key, rows] of byKey) {
    if (usersWithLaterHistory.has(key)) continue;
    const sorted = [...rows].sort((a, b) => a.gameSeq - b.gameSeq);
    const earliest = sorted[0]!;
    plan.push({
      userId: earliest.userId,
      scope: earliest.scope,
      rating: earliest.ratingBefore,
      gamesToRemove: rows.length,
    });
  }

  return plan;
}

/** Chronological ordering key for comparing games across matches. */
export function gameChronologyKey(startsAt: string, seq: number): string {
  return `${startsAt}\0${String(seq).padStart(8, "0")}`;
}

/**
 * Mark user+scope pairs that have rating history strictly after the deleted match.
 */
export function usersWithLaterRatingHistory(
  deletedStartsAt: string,
  deletedGameSeqs: number[],
  others: { userId: string; scope: RatingScope; startsAt: string; gameSeq: number }[],
): Set<string> {
  const maxDeletedSeq = deletedGameSeqs.length ? Math.max(...deletedGameSeqs) : 0;
  const deletedKey = gameChronologyKey(deletedStartsAt, maxDeletedSeq);
  const later = new Set<string>();

  for (const row of others) {
    if (gameChronologyKey(row.startsAt, row.gameSeq) > deletedKey) {
      later.add(`${row.scope}:${row.userId}`);
    }
  }

  return later;
}
