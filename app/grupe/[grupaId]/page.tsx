import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembership, getUser } from "@/lib/data/user";
import { formatMatchDateTime } from "@/lib/format";
import { getMatches, type MatchWithSignups } from "@/lib/data/matches";
import type { FillTone } from "@/lib/domain/fill";

const FILL_TONE_COLOR: Record<FillTone, string> = {
  low: "bg-amber-100 text-amber-800",
  enough: "bg-emerald-100 text-emerald-800",
  full: "bg-slate-200 text-slate-700",
};

function MatchCard({ t, grupaId }: { t: MatchWithSignups; grupaId: string }) {
  const cancelled = t.status === "otkazan";
  const finished = t.status === "zavrsen";
  const href = finished
    ? `/grupe/${grupaId}/termin/${t.id}/sazetak`
    : `/grupe/${grupaId}/termin/${t.id}`;

  return (
    <li>
      <Link
        href={href}
        className={
          "block rounded-lg border p-4 transition hover:border-slate-400 active:scale-[0.99] " +
          (cancelled ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white")
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">
              {formatMatchDateTime(t.startsAt)}
              {t.seriesId && (
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Stalni
                </span>
              )}
            </p>
            <p className="text-sm text-slate-500">{t.location}</p>
          </div>

          {cancelled ? (
            <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              Otkazan
            </span>
          ) : finished ? (
            <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Sažetak
            </span>
          ) : (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${FILL_TONE_COLOR[t.fill.tone]}`}
            >
              {t.signedUpCount}/{t.capacity}
            </span>
          )}
        </div>

        {!cancelled && !finished && (
          <p className="mt-2 text-sm text-slate-600">
            {t.fill.label}
            {t.iAmIn && <span className="ml-2 font-medium text-emerald-700">· Dolaziš</span>}
            {t.iAmWaiting && <span className="ml-2 font-medium text-amber-700">· Na listi čekanja</span>}
          </p>
        )}
      </Link>
    </li>
  );
}

export default async function GroupMatchesPage({
  params,
}: PageProps<"/grupe/[grupaId]">) {
  const { grupaId } = await params;

  const user = await getUser();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);

  const admin = membership?.role === "admin";
  const { upcoming, past } = await getMatches(grupaId, user.id);

  return (
    <div className="space-y-8">
      {admin && (
        <Link
          href={`/grupe/${grupaId}/termin/novi`}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-marka
                     text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Novi termin
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Nadolazeći
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            {admin
              ? "Otvori prvi termin gumbom gore."
              : "Kad organizator otvori termin, pojavit će se ovdje."}
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((t) => (
              <MatchCard key={t.id} t={t} grupaId={grupaId} />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Odigrani
          </h2>
          <ul className="space-y-3">
            {past.map((t) => (
              <MatchCard key={t.id} t={t} grupaId={grupaId} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
