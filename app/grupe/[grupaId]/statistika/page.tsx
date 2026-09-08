import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data/user";
import { getLeaderboard, type LeaderboardRow } from "@/lib/data/leaderboard";

/** Vodeci po jednoj kategoriji; null kad jos nitko nema nista. */
function vodeci(
  rows: LeaderboardRow[],
  kljuc: (r: LeaderboardRow) => number,
): { nickname: string; value: number } | null {
  const najbolji = [...rows].sort(
    (a, b) => kljuc(b) - kljuc(a) || a.nickname.localeCompare(b.nickname, "hr"),
  )[0];

  if (!najbolji || kljuc(najbolji) <= 0) return null;
  return { nickname: najbolji.nickname, value: kljuc(najbolji) };
}

function Kartica({
  ikona,
  naslov,
  vrijednost,
  tko,
  sufiks,
}: {
  ikona: string;
  naslov: string;
  vrijednost: string;
  tko: string;
  sufiks?: string;
}) {
  const prazna = tko === "";

  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (prazna ? "border-dashed border-slate-300 bg-white" : "border-slate-200 bg-white")
      }
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {ikona} {naslov}
      </p>

      <p
        className={
          "mt-2 text-2xl font-bold tabular-nums " + (prazna ? "text-slate-300" : "text-slate-900")
        }
      >
        {vrijednost}
        {sufiks && !prazna && (
          <span className="ml-1 text-sm font-medium text-slate-500">{sufiks}</span>
        )}
      </p>

      <p className={"mt-1 text-sm font-medium " + (prazna ? "text-slate-400" : "text-slate-700")}>
        {prazna ? "još nitko" : tko}
      </p>
    </div>
  );
}

export default async function StranicaStatistike({
  params,
  searchParams,
}: PageProps<"/grupe/[grupaId]/statistika">) {
  const { grupaId } = await params;
  const upit = await searchParams;

  const user = await getUser();
  if (!user) redirect("/prijava");

  const trazenaSezona = typeof upit.sezona === "string" ? upit.sezona : null;
  const sveVrijeme = trazenaSezona === "sve";

  const sezonaZaPrikaz = sveVrijeme ? null : (trazenaSezona ?? (await najnovijaSezona(grupaId)));

  const { rows, seasons, matchesPlayed, records } = await getLeaderboard(
    grupaId,
    sezonaZaPrikaz,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium">Grupa još nema članova</p>
        <p className="mt-1 text-sm text-slate-500">
          Pošalji link pozivnice iz taba Postavke.
        </p>
      </div>
    );
  }

  const strijelac = vodeci(rows, (r) => r.goals);
  const asistent = vodeci(rows, (r) => r.assists);
  const bodovi = vodeci(rows, (r) => r.goals + r.assists);
  const dolaznost = vodeci(rows, (r) => r.matches);

  // Rating svi imaju od prvog dana, pa vodeceg prikazujemo tek kad se netko
  // stvarno odvojio od pocetnih 1000 — inace bi "vodio" nasumican covjek.
  const najRating = matchesPlayed > 0 ? vodeci(rows, (r) => r.rating) : null;

  const ukupnoGolova = rows.reduce((s, r) => s + r.goals, 0);
  const ukupnoAsistencija = rows.reduce((s, r) => s + r.assists, 0);

  return (
    <div className="space-y-8">
      {/* Prekidac seasons — isti kao na ljestvici */}
      <div className="flex flex-wrap gap-2">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/grupe/${grupaId}/statistika?sezona=${s.id}`}
            className={
              "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
              (trazenaSezona === s.id || (!trazenaSezona && !sveVrijeme)
                ? "border-marka bg-marka text-white"
                : "border-slate-300 bg-white text-slate-700")
            }
          >
            {s.name}
          </Link>
        ))}
        <Link
          href={`/grupe/${grupaId}/statistika?sezona=sve`}
          className={
            "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
            (sveVrijeme
              ? "border-marka bg-marka text-white"
              : "border-slate-300 bg-white text-slate-700")
          }
        >
          Sve vrijeme
        </Link>
      </div>

      {/* Sazetak grupe */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ukupno
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { oznaka: "Termina", v: matchesPlayed },
            { oznaka: "Golova", v: ukupnoGolova },
            { oznaka: "Asistencija", v: ukupnoAsistencija },
          ].map((k) => (
            <div key={k.oznaka} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{k.v}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{k.oznaka}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vodeci po kategorijama */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Vodeći
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Kartica
            ikona="⚽"
            naslov="Najbolji strijelac"
            vrijednost={strijelac ? String(strijelac.value) : "—"}
            tko={strijelac?.nickname ?? ""}
            sufiks={strijelac && strijelac.value === 1 ? "gol" : "golova"}
          />
          <Kartica
            ikona="🅰️"
            naslov="Najviše asistencija"
            vrijednost={asistent ? String(asistent.value) : "—"}
            tko={asistent?.nickname ?? ""}
          />
          <Kartica
            ikona="🎯"
            naslov="Najviše bodova (G+A)"
            vrijednost={bodovi ? String(bodovi.value) : "—"}
            tko={bodovi?.nickname ?? ""}
          />
          <Kartica
            ikona="⭐"
            naslov="Najveći rating"
            vrijednost={najRating ? String(najRating.value) : "—"}
            tko={najRating?.nickname ?? ""}
          />
          <Kartica
            ikona="🔥"
            naslov="Najviše odigranih"
            vrijednost={dolaznost ? String(dolaznost.value) : "—"}
            tko={dolaznost?.nickname ?? ""}
            sufiks={dolaznost && dolaznost.value === 1 ? "termin" : "termina"}
          />
          <Kartica
            ikona="🧤"
            naslov="Golmani"
            vrijednost="—"
            tko=""
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Statistika golmana (primljeni golovi, čiste mreže) skuplja se od prvog termina,
          a prikaz stiže u sljedećoj verziji.
        </p>
      </section>

      {/* Rekordi — vidljivi i kad su prazni, da se zna sto se prati */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rekordi
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Najviše golova na terminu",
            "Najveća pobjeda",
            "Najviše termina zaredom",
          ].map((naslov) => {
            const postoji = records.find((r) => r.title === naslov);
            return (
              <Kartica
                key={naslov}
                ikona="🏆"
                naslov={naslov}
                vrijednost={postoji?.value ?? "—"}
                tko={postoji?.who ?? (postoji ? "—" : "")}
              />
            );
          })}
        </div>
      </section>

      <p className="text-center text-sm text-slate-500">
        Detaljna tablica po igraču je u tabu{" "}
        <Link
          href={`/grupe/${grupaId}/ljestvica`}
          className="underline underline-offset-4"
        >
          Ljestvica
        </Link>
        .
      </p>
    </div>
  );
}

/** Id najnovije seasons grupe, ili null ako ih nema. */
async function najnovijaSezona(grupaId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", grupaId)
    .order("name", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
