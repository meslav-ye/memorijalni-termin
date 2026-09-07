import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateStats, aggregateDolaznost } from "@/lib/domain/stats";
import { formatirajKratko } from "@/lib/format";
import { jeClan } from "@/lib/podaci/korisnik";
import type { MatchForStats, PlayerStats, Team } from "@/lib/domain/types";

/** Oznaka predmemorije po grupi — po njoj se ponistava kad termin zavrsi. */
export const oznakaLjestvice = (grupaId: string) => `ljestvica-${grupaId}`;

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
 * Sve za tab "Ljestvica" i "Statistika".
 *
 * PRAVO PRISTUPA se provjerava ovdje, a ne unutar izracuna. Izracun ide preko
 * tajnog kljuca (zaobilazi RLS) jer se rezultat sprema u predmemoriju i dijeli
 * medju svim clanovima grupe — svi ionako vide istu ljestvicu. Da izracun
 * koristi korisnikov klijent, ne bi se mogao spremiti: predmemorija ne smije
 * citati kolacice.
 *
 * @param sezonaId id sezone, ili null za "sve vrijeme"
 */
export async function dohvatiLjestvicu(
  grupaId: string,
  sezonaId: string | null,
): Promise<PodaciLjestvice> {
  if (!(await jeClan(grupaId))) notFound();

  return spremljenaLjestvica(grupaId, sezonaId);
}

/**
 * Predmemorirani izracun.
 *
 * Koristi se `unstable_cache`, a ne novija direktiva `use cache`, jer ona trazi
 * ukljucivanje `cacheComponents: true` — a to mijenja semantiku predmemorije
 * CIJELE aplikacije. Prevelik zahvat za dobitak koji ovdje nije hitan.
 *
 * Rok je 5 minuta kao sigurnosna mreza; pravo osvjezavanje ide preko oznake,
 * kad termin zavrsi ili se promijeni sastav clanova.
 */
function spremljenaLjestvica(grupaId: string, sezonaId: string | null) {
  return unstable_cache(
    () => izracunajLjestvicu(grupaId, sezonaId),
    ["ljestvica", grupaId, sezonaId ?? "sve"],
    { tags: [oznakaLjestvice(grupaId)], revalidate: 300 },
  )();
}

async function izracunajLjestvicu(
  grupaId: string,
  sezonaId: string | null,
): Promise<PodaciLjestvice> {
  const supabase = createAdminClient();

  const { data: sezone } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("group_id", grupaId)
    .order("name", { ascending: false });

  // Clanovi se dohvacaju UVIJEK, neovisno o terminima. Ljestvica tako od prvog
  // dana pokazuje tko je u grupi i sve na nuli, umjesto poruke da nema nicega —
  // odmah se vidi sto ce se puniti.
  const { data: clanovi } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", grupaId)
    .eq("status", "active");

  const clanIdevi = (clanovi ?? []).map((c) => c.user_id);

  let upit = supabase
    .from("matches")
    .select("id, score_a, score_b, starts_at")
    .eq("group_id", grupaId)
    .eq("status", "zavrsen")
    .order("starts_at", { ascending: true });

  if (sezonaId) upit = upit.eq("season_id", sezonaId);

  const { data: termini } = await upit;
  const sviTermini = termini ?? [];

  if (sviTermini.length === 0) {
    return {
      redci: await praznaLjestvica(grupaId, clanIdevi),
      sezone: (sezone ?? []).map((s) => ({ id: s.id, naziv: s.name })),
      odigranihTermina: 0,
      rekordi: [],
    };
  }

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
    startsAt: t.starts_at,
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

  // Clanovi koji jos nisu odigrali nijedan termin ne pojavljuju se u statistici,
  // ali moraju biti na ljestvici — inace novopridosli "nestanu" dok ne zaigraju.
  const sviZaPrikaz = [...new Set([...igraci, ...clanIdevi])];

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", sviZaPrikaz.length ? sviZaPrikaz : ["-"]);

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

  const bezOdigranih = clanIdevi
    .filter((id) => !igraci.includes(id))
    .map((id) =>
      prazanRedak(
        id,
        profili?.find((p) => p.id === id)?.nickname || "(bez nadimka)",
        profili?.find((p) => p.id === id)?.is_goalkeeper ?? false,
        ratinzi?.find((r) => r.user_id === id)?.rating ?? 1000,
      ),
    );

  const sviRedci = [...redci, ...bezOdigranih].sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.matches - a.matches ||
      a.nadimak.localeCompare(b.nadimak, "hr"),
  );

  return {
    redci: sviRedci,
    sezone: (sezone ?? []).map((s) => ({ id: s.id, naziv: s.name })),
    odigranihTermina: sviTermini.length,
    rekordi: izracunajRekorde(zaStatistiku, redci),
  };
}

/**
 * Redak ljestvice za igraca koji jos nije odigrao nijedan termin.
 * Sve na nuli, rating onakav kakav mu stoji (pocetnih 1000).
 */
function prazanRedak(
  userId: string,
  nadimak: string,
  golman: boolean,
  rating: number,
): RedakLjestvice {
  return {
    userId,
    nadimak,
    golman,
    rating,
    goals: 0,
    assists: 0,
    ownGoals: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsPerMatch: 0,
    winRate: 0,
    postotakDolaznosti: 0,
    trenutniNiz: 0,
    najduziNiz: 0,
  };
}

/**
 * Ljestvica prije nego je odigran ijedan termin: svi clanovi grupe s nulama.
 *
 * Postoji jer prazan ekran ne govori nista. Ovako se od prvog dana vidi tko je
 * u grupi, da svi krecu od 1000 i koje se kolone uopce prate.
 */
async function praznaLjestvica(
  grupaId: string,
  clanIdevi: string[],
): Promise<RedakLjestvice[]> {
  if (clanIdevi.length === 0) return [];

  // Isti razlog kao u izracunu: ovo se vrti unutar predmemorije, gdje se
  // kolacici ne smiju citati.
  const supabase = createAdminClient();

  const [{ data: profili }, { data: ratinzi }] = await Promise.all([
    supabase.from("profiles").select("id, nickname, is_goalkeeper").in("id", clanIdevi),
    supabase
      .from("player_ratings")
      .select("user_id, rating")
      .eq("group_id", grupaId)
      .in("user_id", clanIdevi),
  ]);

  return clanIdevi
    .map((id) =>
      prazanRedak(
        id,
        profili?.find((p) => p.id === id)?.nickname || "(bez nadimka)",
        profili?.find((p) => p.id === id)?.is_goalkeeper ?? false,
        ratinzi?.find((r) => r.user_id === id)?.rating ?? 1000,
      ),
    )
    .sort((a, b) => a.nadimak.localeCompare(b.nadimak, "hr"));
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
  //
  // Ovaj rekord se vezu na TERMIN, ne na igraca, pa u `tko` ide datum termina.
  // Prije je ostajao prazan, a kartica prazan `tko` tumaci kao "nema rekorda" —
  // pa se stvaran rezultat prikazivao posivljeno, uz "jos nitko".
  const najveca = termini.reduce(
    (naj, t) => {
      const razlika = Math.abs(t.scoreA - t.scoreB);
      return razlika > naj.razlika
        ? {
            razlika,
            rezultat: `${Math.max(t.scoreA, t.scoreB)}:${Math.min(t.scoreA, t.scoreB)}`,
            kada: t.startsAt ?? "",
          }
        : naj;
    },
    { razlika: 0, rezultat: "", kada: "" },
  );
  if (najveca.razlika > 0) {
    rekordi.push({
      naslov: "Najveća pobjeda",
      vrijednost: najveca.rezultat,
      tko: najveca.kada ? formatirajKratko(najveca.kada) : "—",
    });
  }

  // Niz od jednog termina je i dalje niz. Prag je prije bio `> 1`, pa se nakon
  // prvog odigranog termina nije prikazivao nitko.
  const najduziNiz = redci.reduce(
    (naj, r) => (naj && r.najduziNiz > naj.najduziNiz ? r : (naj ?? r)),
    redci[0] as RedakLjestvice | undefined,
  );
  if (najduziNiz && najduziNiz.najduziNiz > 0) {
    rekordi.push({
      naslov: "Najviše termina zaredom",
      vrijednost: String(najduziNiz.najduziNiz),
      tko: najduziNiz.nadimak,
    });
  }

  // "Najbolji strijelac" se NE dodaje ovdje. Vec stoji medju Vodecima, izracunat
  // maksimumom po golovima, a ovdje se citalo `redci[0]` — a to je nesortiran
  // niz, pa je ispadao slucajan igrac. Dvije kartice s istim naslovom i
  // razlicitim brojem su i bile ono zbog cega je statistika izgledala neispravno.

  return rekordi;
}
