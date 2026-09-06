import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatirajTermin } from "@/lib/format";
import { dohvatiTermine, type TerminSaPrijavama } from "@/lib/podaci/termini";
import type { Ton } from "@/lib/domain/popunjenost";

const BOJA_TONA: Record<Ton, string> = {
  malo: "bg-amber-100 text-amber-800",
  dovoljno: "bg-emerald-100 text-emerald-800",
  puno: "bg-slate-200 text-slate-700",
};

function KarticaTermina({ t, grupaId }: { t: TerminSaPrijavama; grupaId: string }) {
  const otkazan = t.status === "otkazan";

  return (
    <li>
      <Link
        href={`/grupe/${grupaId}/termin/${t.id}`}
        className={
          "block rounded-lg border p-4 transition hover:border-slate-400 active:scale-[0.99] " +
          (otkazan ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white")
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{formatirajTermin(t.startsAt)}</p>
            <p className="text-sm text-slate-500">{t.lokacija}</p>
          </div>

          {otkazan ? (
            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              Otkazan
            </span>
          ) : (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${BOJA_TONA[t.stanje.ton]}`}
            >
              {t.prijavljenih}/{t.capacity}
            </span>
          )}
        </div>

        {!otkazan && (
          <p className="mt-2 text-sm text-slate-600">
            {t.stanje.oznaka}
            {t.jaSamUnutra && <span className="ml-2 font-medium text-emerald-700">· Dolaziš</span>}
            {t.jaCekam && <span className="ml-2 font-medium text-amber-700">· Na listi čekanja</span>}
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function StranicaTermina({
  params,
}: PageProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const admin = clanstvo?.role === "admin";
  const { nadolazeci, prosli } = await dohvatiTermine(grupaId, user.id);

  return (
    <div className="space-y-8">
      {admin && (
        <Link
          href={`/grupe/${grupaId}/termin/novi`}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-900
                     text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Novi termin
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Nadolazeći
        </h2>
        {nadolazeci.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            {admin
              ? "Otvori prvi termin gumbom gore."
              : "Kad organizator otvori termin, pojavit će se ovdje."}
          </p>
        ) : (
          <ul className="space-y-3">
            {nadolazeci.map((t) => (
              <KarticaTermina key={t.id} t={t} grupaId={grupaId} />
            ))}
          </ul>
        )}
      </section>

      {prosli.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Odigrani
          </h2>
          <ul className="space-y-3">
            {prosli.slice(0, 20).map((t) => (
              <KarticaTermina key={t.id} t={t} grupaId={grupaId} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
