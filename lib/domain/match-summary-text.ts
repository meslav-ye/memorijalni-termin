import { formatShortDate } from "@/lib/format";

/** Header on the finished-termin sažetak. */
export function finishedGamesHeading(count: number): string {
  if (count === 0) return "Nema završenih utakmica";
  if (count === 1) return "1 utakmica";
  return `${count} utakmice`;
}

export type ShareGameLine = {
  seq: number;
  labelA: string;
  labelB: string;
  scoreA: number;
  scoreB: number;
  scorers: string;
};

/** WhatsApp / clipboard text: one block per finished game in the termin. */
export function matchShareText(
  startsAt: string,
  location: string,
  games: ShareGameLine[],
): string {
  return [
    `Termin ${formatShortDate(startsAt)}${location ? `, ${location}` : ""}`,
    ...games.map((b) => {
      const header = `Utakmica ${b.seq}: ${b.labelA} ${b.scoreA} : ${b.scoreB} ${b.labelB}`;
      return b.scorers ? `${header}\n⚽ ${b.scorers}` : header;
    }),
  ].join("\n\n");
}
