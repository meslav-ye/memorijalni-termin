import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dohvatiLjestvicu, type RedakLjestvice } from "@/lib/podaci/statistika";

/** Vodeci po jednoj kategoriji; null kad jos nitko nema nista. */
function vodeci(
  redci: RedakLjestvice[],
  kljuc: (r: RedakLjestvice) => number,
): { nadimak: string; vrijednost: number } | null {
  const najbolji = [...redci].sort(
    (a, b) => kljuc(b) - kljuc(a) || a.nadimak.localeCompare(b.nadimak, "hr"),
  )[0];

  if (!najbolji || kljuc(najbolji) <= 0) return null;
  return { nadimak: najbolji.nadimak, vrijednost: kljuc(najbolji) };
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const trazenaSezona = typeof upit.sezona === "string" ? upit.sezona : null;
  const sveVrijeme = trazenaSezona === "sve";

  const sezonaZaPrikaz = sveVrijeme ? null : (trazenaSezona ?? (await najnovijaSezona(grupaId)));

  const { redci, sezone, odigranihTermina, rekordi } = await dohvatiLjestvicu(
    grupaId,
    sezonaZaPrikaz,
  );

  if (redci.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium">Grupa još nema članova</p>
        <p className="mt-1 text-sm text-slate-500">
          Pošalji link pozivnice iz taba Postavke.
        </p>
      </div>
    );
  }

  const strijelac = vodeci(redci, (r) => r.goals);
  const asistent = vodeci(redci, (r) => r.assists);
  const bodovi = vodeci(redci, (r) => r.goals + r.assists);
  const dolaznost = vodeci(redci, (r) => r.matches);

  // Rating svi imaju od prvog dana, pa vodeceg prikazujemo tek kad se netko
  // stvarno odvojio od pocetnih 1000 — inace bi "vodio" nasumican covjek.
  const najRating = odigranihTermina > 0 ? vodeci(redci, (r) => r.rating) : null;

  const ukupnoGolova = redci.reduce((s, r) => s + r.goals, 0);
  const ukupnoAsistencija = redci.reduce((s, r) => s + r.assists, 0);

  return (
    <div className="space-y-8">
      {/* Prekidac sezone — isti kao na ljestvici */}
      <div className="flex flex-wrap gap-2">
        {sezone.map((s) => (
          <Link
            key={s.id}
            href={`/grupe/${grupaId}/statistika?sezona=${s.id}`}
            className={
              "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
              (trazenaSezona === s.id || (!trazenaSezona && !sveVrijeme)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700")
            }
          >
            {s.naziv}
          </Link>
        ))}
        <Link
          href={`/grupe/${grupaId}/statistika?sezona=sve`}
          className={
            "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
            (sveVrijeme
              ? "border-slate-900 bg-slate-900 text-white"
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
            { oznaka: "Termina", v: odigranihTermina },
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
            vrijednost={strijelac ? String(strijelac.vrijednost) : "—"}
            tko={strijelac?.nadimak ?? ""}
            sufiks={strijelac && strijelac.vrijednost === 1 ? "gol" : "golova"}
          />
          <Kartica
            ikona="🅰️"
            naslov="Najviše asistencija"
            vrijednost={asistent ? String(asistent.vrijednost) : "—"}
            tko={asistent?.nadimak ?? ""}
          />
          <Kartica
            ikona="🎯"
            naslov="Najviše bodova (G+A)"
            vrijednost={bodovi ? String(bodovi.vrijednost) : "—"}
            tko={bodovi?.nadimak ?? ""}
          />
          <Kartica
            ikona="⭐"
            naslov="Najveći rating"
            vrijednost={najRating ? String(najRating.vrijednost) : "—"}
            tko={najRating?.nadimak ?? ""}
          />
          <Kartica
            ikona="🔥"
            naslov="Najviše odigranih"
            vrijednost={dolaznost ? String(dolaznost.vrijednost) : "—"}
            tko={dolaznost?.nadimak ?? ""}
            sufiks={dolaznost && dolaznost.vrijednost === 1 ? "termin" : "termina"}
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
            "Najbolji strijelac",
          ].map((naslov) => {
            const postoji = rekordi.find((r) => r.naslov === naslov);
            return (
              <Kartica
                key={naslov}
                ikona="🏆"
                naslov={naslov}
                vrijednost={postoji?.vrijednost ?? "—"}
                tko={postoji?.tko ?? (postoji ? "—" : "")}
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

/** Id najnovije sezone grupe, ili null ako ih nema. */
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
