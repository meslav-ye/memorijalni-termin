import type { MatchForStats, PlayerStats } from "./types";

function prazan(userId: string): PlayerStats {
  return {
    userId,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsPerMatch: 0,
    winRate: 0,
  };
}

/**
 * Agregira statistiku po igracu iz popisa ZAVRSENIH termina.
 *
 * Pravila koja se lako promase:
 *  - Odigrani termini se broje iz POSTAVE, ne iz golova — tko je igrao a nije
 *    zabio, i dalje je odigrao termin.
 *  - Ponisteni dogadjaji (deleted_at) se preskacu.
 *  - Autogol se biljezi odvojeno i NE ulazi u golove.
 *  - Asistencija se broji samo uz pravi gol, nikad uz autogol.
 *  - Tko nije u postavi ne ulazi u statistiku, cak i ako se pojavi u dogadjajima.
 */
export function aggregateStats(matches: MatchForStats[]): PlayerStats[] {
  const po = new Map<string, PlayerStats>();

  for (const m of matches) {
    for (const { userId, team } of m.lineup) {
      if (!po.has(userId)) po.set(userId, prazan(userId));
      const s = po.get(userId)!;

      s.matches += 1;

      if (m.scoreA === m.scoreB) s.draws += 1;
      else if ((team === "A") === (m.scoreA > m.scoreB)) s.wins += 1;
      else s.losses += 1;
    }

    for (const e of m.events) {
      if (e.deletedAt !== null) continue;

      if (e.scorerId) {
        const strijelac = po.get(e.scorerId);
        if (strijelac) {
          if (e.type === "goal") strijelac.goals += 1;
          else strijelac.ownGoals += 1;
        }
      }

      // Autogol nema asistenciju.
      if (e.type === "goal" && e.assistId) {
        const asistent = po.get(e.assistId);
        if (asistent) asistent.assists += 1;
      }
    }
  }

  return [...po.values()].map((s) => ({
    ...s,
    goalsPerMatch: s.matches === 0 ? 0 : Math.round((s.goals / s.matches) * 100) / 100,
    winRate: s.matches === 0 ? 0 : (s.wins + s.draws * 0.5) / s.matches,
  }));
}

// ---------- Dolaznost ----------

export type Dolaznost = {
  userId: string;
  odigrani: number;
  postotak: number;
  trenutniNiz: number;
  najduziNiz: number;
};

/**
 * Dolaznost po igracu.
 *
 * @param terminiKronoloski id-evi zavrsenih termina, od NAJSTARIJEG prema najnovijem
 * @param postave           tko je igrao u kojem terminu
 */
export function aggregateDolaznost(
  terminiKronoloski: string[],
  postave: Map<string, Set<string>>,
  sviIgraci: string[],
): Dolaznost[] {
  const ukupno = terminiKronoloski.length;

  return sviIgraci.map((userId) => {
    let odigrani = 0;
    let trenutniNiz = 0;
    let najduziNiz = 0;

    for (const terminId of terminiKronoloski) {
      const igrao = postave.get(terminId)?.has(userId) ?? false;

      if (igrao) {
        odigrani += 1;
        trenutniNiz += 1;
        najduziNiz = Math.max(najduziNiz, trenutniNiz);
      } else {
        trenutniNiz = 0;
      }
    }

    return {
      userId,
      odigrani,
      postotak: ukupno === 0 ? 0 : odigrani / ukupno,
      trenutniNiz,
      najduziNiz,
    };
  });
}
