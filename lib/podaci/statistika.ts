import { createClient } from "@/lib/supabase/server";
import { aggregateStats, aggregateDolaznost } from "@/lib/domain/stats";
import type { MatchForStats, PlayerStats, Team } from "@/lib/domain/types";

export type RedakLjestvice = PlayerStats & {
  nadimak: string;
  golman: boolean;
  rating: number;
  postotakDolaznosti: number;
  trenutniNiz: number;
  najduziNiz: number;
};

export type Rekord = { naslov: string; vrijednost: string; tko: string };

export type PodaciLjestvice = {
  redci: RedakLjestvice[];
  sezone: { id: string; naziv: string }[];
  odigranihTermina: number;
  rekordi: Rekord[];
};

/**
 * Sve za tab "Ljestvica". Racuna se iz ZAVRSENIH termina i nepobrisanih dogadjaja.
 *
 * @param sezonaId id sezone, ili null za "sve vrijeme"
 */
export async function dohvatiLjestvicu(
  grupaId: string,
  sezonaId: string | null,
): Promise<PodaciLjestvice> {
  const supabase = await createClient();

  const { data: sezone } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("group_id", grupaId)
    .order("name", { ascending: false });

  let upit = supabase
    .from("matches")
    .select("id, score_a, score_b, starts_at")
    .eq("group_id", grupaId)
    .eq("status", "zavrsen")
    .order("starts_at", { ascending: true });

  if (sezonaId) upit = upit.eq("season_id", sezonaId);

  const { data: termini } = await upit;
  const sviTermini = termini ?? [];

  const prazno: PodaciLjestvice = {
    redci: [],
    sezone: (sezone ?? []).map((s) => ({ id: s.id, naziv: s.name })),
    odigranihTermina: 0,
    rekordi: [],
  };

  if (sviTermini.length === 0) return prazno;

  const terminIdevi = sviTermini.map((t) => t.id);

  const [{ data: postave }, { data: dogadjaji }, { data: ratinzi }] = await Promise.all([
    supabase.from("match_lineup").select("match_id, user_id, team").in("match_id", terminIdevi),
    supabase
      .from("match_events")
      .select("match_id, type, scorer_id, assist_id, deleted_at")
      .in("match_id", terminIdevi)
      .in("type", ["goal", "own_goal"]),
    supabase.from("player_ratings").select("user_id, rating").eq("group_id", grupaId),
  ]);

  const zaStatistiku: MatchForStats[] = sviTermini.map((t) => ({
    matchId: t.id,
    scoreA: t.score_a,
    scoreB: t.score_b,
    lineup: (postave ?? [])
      .filter((p) => p.match_id === t.id)
      .map((p) => ({ userId: p.user_id, team: p.team as Team })),
    events: (dogadjaji ?? [])
      .filter((e) => e.match_id === t.id)
      .map((e) => ({
        type: e.type as "goal" | "own_goal",
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        deletedAt: e.deleted_at,
      })),
  }));

  const statistika = aggregateStats(zaStatistiku);
  const igraci = statistika.map((s) => s.userId);

  const postavePoTerminu = new Map<string, Set<string>>();
  for (const t of sviTermini) {
    postavePoTerminu.set(
      t.id,
      new Set((postave ?? []).filter((p) => p.match_id === t.id).map((p) => p.user_id)),
    );
  }

  const dolaznost = aggregateDolaznost(terminIdevi, postavePoTerminu, igraci);

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", igraci.length ? igraci : ["-"]);

  const redci: RedakLjestvice[] = statistika.map((s) => {
    const d = dolaznost.find((x) => x.userId === s.userId);
    const p = profili?.find((x) => x.id === s.userId);

    return {
      ...s,
      nadimak: p?.nickname || "(bez nadimka)",
      golman: p?.is_goalkeeper ?? false,
      rating: ratinzi?.find((r) => r.user_id === s.userId)?.rating ?? 1000,
      postotakDolaznosti: d?.postotak ?? 0,
      trenutniNiz: d?.trenutniNiz ?? 0,
      najduziNiz: d?.najduziNiz ?? 0,
    };
  });

  return {
    redci: redci.sort((a, b) => b.goals - a.goals || b.assists - a.assists),
    sezone: (sezone ?? []).map((s) => ({ id: s.id, naziv: s.name })),
    odigranihTermina: sviTermini.length,
    rekordi: izracunajRekorde(zaStatistiku, redci),
  };
}

function izracunajRekorde(
  termini: MatchForStats[],
  redci: RedakLjestvice[],
): Rekord[] {
  const rekordi: Rekord[] = [];
  const nadimak = (id: string) => redci.find((r) => r.userId === id)?.nadimak ?? "?";

  // Najvise golova jednog igraca na jednom terminu.
  let najboljiTermin = { golova: 0, tko: "" };
  for (const t of termini) {
    const brojac = new Map<string, number>();
    for (const e of t.events) {
      if (e.type !== "goal" || e.deletedAt !== null || !e.scorerId) continue;
      brojac.set(e.scorerId, (brojac.get(e.scorerId) ?? 0) + 1);
    }
    for (const [id, n] of brojac) {
      if (n > najboljiTermin.golova) najboljiTermin = { golova: n, tko: nadimak(id) };
    }
  }
  if (najboljiTermin.golova > 0) {
    rekordi.push({
      naslov: "Najviše golova na terminu",
      vrijednost: String(najboljiTermin.golova),
      tko: najboljiTermin.tko,
    });
  }

  // Najveca pobjeda po razlici u golovima.
  const najveca = termini.reduce(
    (naj, t) => {
      const razlika = Math.abs(t.scoreA - t.scoreB);
      return razlika > naj.razlika
        ? { razlika, rezultat: `${Math.max(t.scoreA, t.scoreB)}:${Math.min(t.scoreA, t.scoreB)}` }
        : naj;
    },
    { razlika: 0, rezultat: "" },
  );
  if (najveca.razlika > 0) {
    rekordi.push({ naslov: "Najveća pobjeda", vrijednost: najveca.rezultat, tko: "" });
  }

  const najduziNiz = redci.reduce((naj, r) => (r.najduziNiz > naj.najduziNiz ? r : naj), redci[0]);
  if (najduziNiz && najduziNiz.najduziNiz > 1) {
    rekordi.push({
      naslov: "Najviše termina zaredom",
      vrijednost: String(najduziNiz.najduziNiz),
      tko: najduziNiz.nadimak,
    });
  }

  const najboljiStrijelac = redci[0];
  if (najboljiStrijelac?.goals > 0) {
    rekordi.push({
      naslov: "Najbolji strijelac",
      vrijednost: String(najboljiStrijelac.goals),
      tko: najboljiStrijelac.nadimak,
    });
  }

  return rekordi;
}
