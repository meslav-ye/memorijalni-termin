/** Svi krecu odavde. Rating je PO GRUPI — isti covjek u dvije grupe ima dva. */
export const POCETNI_RATING = 1000;

/**
 * Koliko se rating najvise pomakne po terminu.
 *
 * 24 znaci da pobjeda nad jednako jakom ekipom donosi 12 bodova. Dovoljno da se
 * razlike vide kroz sezonu, dovoljno malo da jedan los dan ne pokvari sliku.
 */
export const K_FAKTOR = 24;

export type EloEkipa = { userId: string; rating: number }[];

export type EloUlaz = {
  teamA: EloEkipa;
  teamB: EloEkipa;
  scoreA: number;
  scoreB: number;
};

export type EloIzlaz = {
  deltaA: number;
  deltaB: number;
  updates: { userId: string; ratingBefore: number; ratingAfter: number }[];
};

/**
 * Elo po ekipama.
 *
 * Ocekivani ishod se racuna iz PROSJEKA ratinga ekipa, a ne iz zbroja — inace
 * bi ekipa s vise igraca automatski ispala "jaca". Pomak je jednak za sve
 * igrace iste ekipe i nula-suma: koliko jedna ekipa dobije, toliko druga izgubi.
 *
 * Razlika u golovima se namjerno NE gleda: 6:0 i 6:5 nose isto. Rekreativni
 * rezultati previse ovise o tome tko je taj dan bio raspolozen.
 */
export function computeElo({ teamA, teamB, scoreA, scoreB }: EloUlaz): EloIzlaz {
  if (teamA.length === 0 || teamB.length === 0) {
    return { deltaA: 0, deltaB: 0, updates: [] };
  }

  const prosjek = (t: EloEkipa) => t.reduce((s, p) => s + p.rating, 0) / t.length;

  const ratingA = prosjek(teamA);
  const ratingB = prosjek(teamB);

  // Vjerojatnost da A pobijedi, po Elo formuli.
  const ocekivanoA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

  const stvarnoA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;

  const deltaA = Math.round(K_FAKTOR * (stvarnoA - ocekivanoA));
  // `|| 0` jer bi -deltaA kod nule dalo -0, a to nije isto sto i 0.
  const deltaB = -deltaA || 0;

  return {
    deltaA,
    deltaB,
    updates: [
      ...teamA.map((p) => ({
        userId: p.userId,
        ratingBefore: p.rating,
        ratingAfter: p.rating + deltaA,
      })),
      ...teamB.map((p) => ({
        userId: p.userId,
        ratingBefore: p.rating,
        ratingAfter: p.rating + deltaB,
      })),
    ],
  };
}
