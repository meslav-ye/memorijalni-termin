import { formatShortDate } from "@/lib/format";
import {
  type ActivityEntry,
  bestAvgSpeedInSingleTermin,
  bestDistanceInSingleTermin,
  bestMaxSpeedInSingleTermin,
} from "@/lib/domain/activity";
import {
  bestGoalsAssistsInSingleGame,
  bestGoalsInSingleGame,
  fewestGoalsAgainstInSingleGame,
} from "@/lib/domain/records";
import { playerProfileHref } from "@/lib/domain/player-profile";
import type { MatchForStats } from "@/lib/domain/types";

export type StatRecord = {
  title: string;
  value: string;
  who: string;
  /** Player for profile link; null when the record is not about one player. */
  userId: string | null;
  /** Termin for sažetak link (e.g. Najveća pobjeda); null for player/season totals. */
  matchId: string | null;
};

export type AttendanceForRecords = {
  userId: string;
  nickname: string;
  sessionsAttended: number;
};

/** Profile or sažetak target for a record card, if any. */
export function recordHref(grupaId: string, record: StatRecord): string | null {
  if (record.userId) return playerProfileHref(grupaId, record.userId, "statistika");
  if (record.matchId) {
    return `/grupe/${grupaId}/termin/${record.matchId}/sazetak`;
  }
  return null;
}

function whoWithDate(
  nickname: (id: string) => string,
  userId: string,
  startsAt: string | null,
): string {
  const date = startsAt ? formatShortDate(startsAt) : "—";
  return `${nickname(userId)} · ${date}`;
}

/** Activity-only records (also used when a season has no finished games). */
export function appendActivityRecords(
  records: StatRecord[],
  entries: ActivityEntry[],
  nickname: (id: string) => string,
) {
  const dist = bestDistanceInSingleTermin(entries);
  if (dist) {
    records.push({
      title: "Najviše kilometara na terminu",
      value: `${dist.value} km`,
      who: whoWithDate(nickname, dist.userId, dist.startsAt),
      userId: dist.userId,
      matchId: null,
    });
  }

  const maxS = bestMaxSpeedInSingleTermin(entries);
  if (maxS) {
    records.push({
      title: "Najveća max brzina",
      value: `${maxS.value} km/h`,
      who: whoWithDate(nickname, maxS.userId, maxS.startsAt),
      userId: maxS.userId,
      matchId: null,
    });
  }

  const avgS = bestAvgSpeedInSingleTermin(entries);
  if (avgS) {
    records.push({
      title: "Najveća prosj. brzina",
      value: `${avgS.value} km/h`,
      who: whoWithDate(nickname, avgS.userId, avgS.startsAt),
      userId: avgS.userId,
      matchId: null,
    });
  }
}

/**
 * Season records for Statistika. Player-backed rows carry `userId` for profile
 * links; game-only rows (Najveća pobjeda) carry `matchId` for sažetak.
 */
export function buildStatRecords(
  matches: MatchForStats[],
  attendanceRows: AttendanceForRecords[],
  activityEntries: ActivityEntry[],
  nicknameOf: (id: string) => string,
): StatRecord[] {
  const records: StatRecord[] = [];
  const nickname = (id: string) =>
    attendanceRows.find((r) => r.userId === id)?.nickname ?? nicknameOf(id);

  const bestGoals = bestGoalsInSingleGame(matches);
  if (bestGoals) {
    records.push({
      title: "Najviše golova na utakmici",
      value: String(bestGoals.value),
      who: whoWithDate(nickname, bestGoals.userId, bestGoals.startsAt),
      userId: bestGoals.userId,
      matchId: null,
    });
  }

  const bestGa = bestGoalsAssistsInSingleGame(matches);
  if (bestGa) {
    records.push({
      title: "Najviše G+A",
      value: String(bestGa.value),
      who: whoWithDate(nickname, bestGa.userId, bestGa.startsAt),
      userId: bestGa.userId,
      matchId: null,
    });
  }

  const fewestGa = fewestGoalsAgainstInSingleGame(matches);
  if (fewestGa) {
    records.push({
      title: "Najmanje primljenih na utakmici",
      value: String(fewestGa.value),
      who: whoWithDate(nickname, fewestGa.userId, fewestGa.startsAt),
      userId: fewestGa.userId,
      matchId: null,
    });
  }

  // Largest win by goal difference — tied to the GAME, not a player.
  const largest = matches.reduce(
    (best, t) => {
      const diff = Math.abs(t.scoreA - t.scoreB);
      return diff > best.diff
        ? {
            diff,
            score: `${Math.max(t.scoreA, t.scoreB)}:${Math.min(t.scoreA, t.scoreB)}`,
            when: t.startsAt ?? "",
            matchId: t.matchId,
          }
        : best;
    },
    { diff: 0, score: "", when: "", matchId: "" },
  );
  if (largest.diff > 0) {
    records.push({
      title: "Najveća pobjeda",
      value: largest.score,
      who: largest.when ? formatShortDate(largest.when) : "—",
      userId: null,
      matchId: largest.matchId || null,
    });
  }

  const mostSessions = attendanceRows.reduce(
    (best, r) =>
      best && r.sessionsAttended > best.sessionsAttended ? r : (best ?? r),
    attendanceRows[0] as AttendanceForRecords | undefined,
  );
  if (mostSessions && mostSessions.sessionsAttended > 0) {
    records.push({
      title: "Najviše termina ukupno",
      value: String(mostSessions.sessionsAttended),
      who: mostSessions.nickname,
      userId: mostSessions.userId,
      matchId: null,
    });
  }

  appendActivityRecords(records, activityEntries, nickname);

  return records;
}
