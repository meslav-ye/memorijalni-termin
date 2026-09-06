import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatirajTermin } from "@/lib/format";
import { splitSignups } from "@/lib/domain/waitlist";
import { popunjenost, type Ton } from "@/lib/domain/popunjenost";
import { odjaviSe, otkaziTermin, prijaviSe } from "../akcije";

const BOJA_TONA: Record<Ton, string> = {
  malo: "border-amber-200 bg-amber-50 text-amber-900",
  dovoljno: "border-emerald-200 bg-emerald-50 text-emerald-900",
  puno: "border-slate-200 bg-slate-100 text-slate-700",
};

export default async function StranicaTermina({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]">) {
  const { grupaId, terminId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("role, status")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (clanstvo?.status !== "active") notFound();
  const admin = clanstvo.role === "admin";

  const { data: termin } = await supabase
    .from("matches")
    .select("id, starts_at, capacity, min_players, status, notes, location_text, locations(name, address, maps_url)")
    .eq("id", terminId)
    .maybeSingle();

  if (!termin) notFound();

  const { data: prijave } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", terminId);

  const { confirmed, waitlist } = splitSignups(
    (prijave ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    termin.capacity,
  );

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", [...confirmed, ...waitlist].length ? [...confirmed, ...waitlist] : ["-"]);

  const nadimak = (id: string) =>
    profili?.find((p) => p.id === id)?.nickname || "(bez nadimka)";
  const jeGolman = (id: string) => profili?.find((p) => p.id === id)?.is_goalkeeper ?? false;

  const stanje = popunjenost(confirmed.length, termin.min_players, termin.capacity);
  const jaSamUnutra = confirmed.includes(user.id);
  const jaCekam = waitlist.includes(user.id);
  const prijavljen = jaSamUnutra || jaCekam;
  const otvorenoZaPrijave = termin.status === "najavljen";

  const lokacija = termin.locations;

  return (
    <div className="pb-28">
      <Link
        href={`/grupe/${grupaId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termine
      </Link>

      <header className="mt-4">
        <h2 className="text-xl font-bold tracking-tight">
          {formatirajTermin(termin.starts_at)}
        </h2>

        <p className="mt-1 text-slate-600">
          {lokacija?.maps_url ? (
            <a
              href={lokacija.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {lokacija.name}
            </a>
          ) : (
            (lokacija?.name ?? termin.location_text ?? "Lokacija nije upisana")
          )}
          {lokacija?.address && (
            <span className="block text-sm text-slate-500">{lokacija.address}</span>
          )}
        </p>

        {termin.notes && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {termin.notes}
          </p>
        )}
      </header>

      {termin.status === "otkazan" ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center font-medium text-red-800">
          Termin je otkazan.
        </div>
      ) : (
        <div className={`mt-6 rounded-lg border p-4 text-center font-medium ${BOJA_TONA[stanje.ton]}`}>
          {stanje.oznaka}
        </div>
      )}

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dolaze ({confirmed.length}/{termin.capacity})
        </h3>
        {confirmed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            Nitko se još nije prijavio.
          </p>
        ) : (
          <ol className="space-y-1">
            {confirmed.map((id, i) => (
              <li
                key={id}
                className={
                  "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 " +
                  (id === user.id ? "ring-2 ring-slate-900/15" : "")
                }
              >
                <span className="w-5 text-right text-sm tabular-nums text-slate-400">{i + 1}</span>
                <span className="font-medium">{nadimak(id)}</span>
                {jeGolman(id) && <span title="Igra golmana">🧤</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {waitlist.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Lista čekanja ({waitlist.length})
          </h3>
          <ol className="space-y-1">
            {waitlist.map((id, i) => (
              <li
                key={id}
                className={
                  "flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 " +
                  (id === user.id ? "ring-2 ring-amber-400/40" : "")
                }
              >
                <span className="w-5 text-right text-sm tabular-nums text-slate-400">
                  {confirmed.length + i + 1}
                </span>
                <span className="font-medium">{nadimak(id)}</span>
                {jeGolman(id) && <span title="Igra golmana">🧤</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {termin.status !== "otkazan" && (
        <Link
          href={`/grupe/${grupaId}/termin/${terminId}/ekipe`}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-lg
                     border border-slate-300 bg-white text-sm font-semibold
                     transition active:scale-[0.98] hover:border-slate-400"
        >
          Ekipe
        </Link>
      )}

      {admin && termin.status !== "otkazan" && (
        <form action={otkaziTermin} className="mt-10 border-t border-slate-200 pt-6">
          <input type="hidden" name="grupaId" value={grupaId} />
          <input type="hidden" name="terminId" value={terminId} />
          <button className="text-sm text-red-700 underline underline-offset-4">
            Otkaži termin
          </button>
        </form>
      )}

      {/* Glavni gumb je zalijepljen za dno — palac ga pogadja bez pomicanja ruke. */}
      {otvorenoZaPrijave && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <form action={prijavljen ? odjaviSe : prijaviSe}>
              <input type="hidden" name="grupaId" value={grupaId} />
              <input type="hidden" name="terminId" value={terminId} />
              <button
                className={
                  "h-14 w-full rounded-lg text-base font-semibold transition active:scale-[0.98] " +
                  (prijavljen
                    ? "border-2 border-red-600 bg-white text-red-700"
                    : "bg-slate-900 text-white")
                }
              >
                {prijavljen
                  ? "Odustajem"
                  : stanje.slobodnoMjesta === 0
                    ? "Stavi me na listu čekanja"
                    : "Dolazim"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
