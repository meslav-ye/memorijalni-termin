import type { PlayerForBalancing, SuggestedTeams } from "./types";

/**
 * Ispod ovoliko odigranih termina rating jos nije kalibriran — svi krecu od
 * 1000, pa bi "balansiranje" bilo lazna preciznost. Do tada se dijeli nasumicno.
 */
export const MIN_TERMINA_ZA_RATING = 5;

function promijesaj<T>(niz: T[], random: () => number): T[] {
  const kopija = [...niz];
  for (let i = kopija.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [kopija[i], kopija[j]] = [kopija[j], kopija[i]];
  }
  return kopija;
}

/**
 * Par golmana s najmanjom razlikom u ratingu.
 *
 * Razdvajaju se ta dvojica, a ne najbolji i najgori: cilj je da obje ekipe
 * imaju priblizno jednako dobrog golmana.
 */
function odaberiParGolmana(
  golmani: PlayerForBalancing[],
): [PlayerForBalancing, PlayerForBalancing] {
  const sortirani = [...golmani].sort((a, b) => b.rating - a.rating);

  let najbolji: [PlayerForBalancing, PlayerForBalancing] = [sortirani[0], sortirani[1]];
  let najmanjaRazlika = Infinity;

  for (let i = 0; i < sortirani.length - 1; i++) {
    const razlika = sortirani[i].rating - sortirani[i + 1].rating;
    if (razlika < najmanjaRazlika) {
      najmanjaRazlika = razlika;
      najbolji = [sortirani[i], sortirani[i + 1]];
    }
  }

  return najbolji;
}

/**
 * Prijedlog dviju ekipa.
 *
 * Redoslijed odlucivanja:
 *   1. Golmani se razdvoje — po jedan u svaku ekipu.
 *   2. Ostali se rasporede: po ratingu ako grupa ima dovoljno odigranih
 *      termina, inace nasumicno.
 *   3. Uvijek se dopunjava manja ekipa; kod jednakog broja bira ona sa
 *      slabijim zbrojem. Na sortiranom popisu to daje zmijski raspored
 *      A, B, B, A, A, ... koji dobro izjednacava ekipe.
 *
 * @param random  Ubacuje se radi determinizma u testovima.
 */
export function suggestTeams(
  players: PlayerForBalancing[],
  odigranihTermina: number,
  random: () => number = Math.random,
): SuggestedTeams {
  const teamA: PlayerForBalancing[] = [];
  const teamB: PlayerForBalancing[] = [];
  const warnings: string[] = [];

  const golmani = players.filter((p) => p.isGoalkeeper);
  let ostali = players.filter((p) => !p.isGoalkeeper);

  if (golmani.length >= 2) {
    const [prvi, drugi] = odaberiParGolmana(golmani);
    teamA.push(prvi);
    teamB.push(drugi);
    // Visak golmana ide u obican bazen — igrat ce u polju.
    ostali = [...ostali, ...golmani.filter((g) => g !== prvi && g !== drugi)];
  } else if (golmani.length === 1) {
    const uEkipuA = random() < 0.5;
    (uEkipuA ? teamA : teamB).push(golmani[0]);
    warnings.push(`Ekipa ${uEkipuA ? "B" : "A"} nema golmana.`);
  } else {
    warnings.push("Nijedna ekipa nema golmana.");
  }

  const redoslijed =
    odigranihTermina >= MIN_TERMINA_ZA_RATING
      ? [...ostali].sort((a, b) => b.rating - a.rating)
      : promijesaj(ostali, random);

  const zbroj = (t: PlayerForBalancing[]) => t.reduce((s, p) => s + p.rating, 0);

  for (const igrac of redoslijed) {
    if (teamA.length < teamB.length) teamA.push(igrac);
    else if (teamB.length < teamA.length) teamB.push(igrac);
    else if (zbroj(teamA) <= zbroj(teamB)) teamA.push(igrac);
    else teamB.push(igrac);
  }

  return { teamA, teamB, warnings };
}
