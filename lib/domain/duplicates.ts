import type { GoalEventLite } from "./types";

/**
 * Koliko sekundi unatrag gledamo kad provjeravamo je li gol vec upisan.
 * Kratko namjerno: dva prava gola istog igraca unutar 10 sekundi su rijetka,
 * a dva covjeka s klupe koji upisuju isti gol — nisu.
 */
export const DUPLICATE_WINDOW_SECONDS = 10;

/**
 * Trazi nedavno upisan gol istog strijelca.
 *
 * Postoji jer svi prijavljeni smiju unositi golove, pa se lako dogodi da
 * dvoje upise isti gol. Vraca nadjeni dogadjaj (da se korisniku moze reci
 * prije koliko sekundi je upisan) ili null.
 */
export function findRecentDuplicate(
  events: GoalEventLite[],
  scorerId: string,
  now: Date,
): GoalEventLite | null {
  const granica = now.getTime() - DUPLICATE_WINDOW_SECONDS * 1000;

  const kandidati = events.filter(
    (e) =>
      e.type === "goal" &&
      e.deletedAt === null &&
      e.scorerId === scorerId &&
      new Date(e.createdAt).getTime() >= granica,
  );

  if (kandidati.length === 0) return null;

  // Najnoviji — o njemu se korisniku javlja "prije N sekundi".
  return kandidati.reduce((najnoviji, e) =>
    new Date(e.createdAt).getTime() > new Date(najnoviji.createdAt).getTime() ? e : najnoviji,
  );
}

export function secondsAgo(event: GoalEventLite, now: Date): number {
  const razlika = (now.getTime() - new Date(event.createdAt).getTime()) / 1000;
  return Math.max(0, Math.round(razlika));
}
