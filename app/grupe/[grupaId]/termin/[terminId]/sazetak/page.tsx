import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatirajKratko, formatirajTermin } from "@/lib/format";
import { formatClock } from "@/lib/domain/timer";
import type { Team } from "@/lib/domain/types";
import { GumbPodijeli } from "./GumbPodijeli";

export default async function StranicaSazetka({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/sazetak">) {
  const { grupaId, terminId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/prijava");

  const { data: clanstvo } = await supabase
    .from("group_members")
    .select("status")
    .eq("group_id", grupaId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (clanstvo?.status !== "active") notFound();

  const { data: termin } = await supabase
    .from("matches")
    .select(
      "id, status, starts_at, score_a, score_b, started_at, ended_at, total_paused_seconds, location_text, locations(name)",
    )
    .eq("id", terminId)
    .maybeSingle();
  if (!termin) notFound();

  if (termin.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const { data: postava } = await supabase
    .from("match_lineup")
    .select("user_id, team")
    .eq("match_id", terminId);

  const idevi = (postava ?? []).map((p) => p.user_id);

  const { data: profili } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", idevi.length ? idevi : ["-"]);

  const { data: dogadjaji } = await supabase
    .from("match_events")
    .select("type, team, scorer_id, assist_id, elapsed_seconds")
    .eq("match_id", terminId)
    .is("deleted_at", null)
    .in("type", ["goal", "own_goal"])
    .order("elapsed_seconds");

  const { data: povijest } = await supabase
    .from("rating_history")
    .select("user_id, rating_before, rating_after")
    .eq("match_id", terminId);

  const nadimak = (id: string | null) =>
    profili?.find((p) => p.id === id)?.nickname || "?";

  const golovi = dogadjaji ?? [];

  const igraci = (postava ?? []).map((p) => {
    const zapis = povijest?.find((r) => r.user_id === p.user_id);
    return {
      userId: p.user_id,
      nadimak: nadimak(p.user_id),
      team: p.team as Team,
      golovi: golovi.filter((e) => e.type === "goal" && e.scorer_id === p.user_id).length,
      asistencije: golovi.filter((e) => e.assist_id === p.user_id).length,
      autogolovi: golovi.filter((e) => e.type === "own_goal" && e.scorer_id === p.user_id).length,
      pomak: zapis ? zapis.rating_after - zapis.rating_before : null,
      rating: zapis?.rating_after ?? null,
    };
  });

  const pobjednik =
    termin.score_a > termin.score_b ? "A" : termin.score_b > termin.score_a ? "B" : null;

  const trajanje =
    termin.started_at && termin.ended_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(termin.ended_at).getTime() - new Date(termin.started_at).getTime()) / 1000,
          ) - termin.total_paused_seconds,
        )
      : null;

  const lokacija = termin.locations?.name ?? termin.location_text ?? "";

  // Tekst za WhatsApp: kratak, citljiv i bez linkova koji se lome.
  const strijelci = igraci
    .filter((i) => i.golovi > 0)
    .sort((a, b) => b.golovi - a.golovi)
    .map((i) => `${i.nadimak} ${i.golovi}`)
    .join(", ");

  const tekstZaDijeljenje = [
    `Termin ${formatirajKratko(termin.starts_at)}${lokacija ? `, ${lokacija}` : ""}`,
    `Ekipa A ${termin.score_a} : ${termin.score_b} Ekipa B`,
    strijelci ? `⚽ ${strijelci}` : "Bez golova.",
  ].join("\n");

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termine
      </Link>

      <header className="mt-4 text-center">
        <p className="text-sm text-slate-500">{formatirajTermin(termin.starts_at)}</p>

        <div className="mt-3 rounded-xl bg-slate-900 p-5 text-white">
          <div className="flex items-center justify-center gap-4">
            <span className="flex-1 text-right text-sm font-semibold uppercase text-slate-400">
              Ekipa A
            </span>
            <span className="text-4xl font-bold tabular-nums">
              {termin.score_a} : {termin.score_b}
            </span>
            <span className="flex-1 text-left text-sm font-semibold uppercase text-slate-400">
              Ekipa B
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {pobjednik ? `Pobijedila Ekipa ${pobjednik}` : "Neriješeno"}
            {trajanje !== null && ` · ${formatClock(trajanje)}`}
          </p>
        </div>
      </header>

      <section className="mt-6 flex gap-3">
        <Kolona strana="A" igraci={igraci} pobjednik={pobjednik} />
        <Kolona strana="B" igraci={igraci} pobjednik={pobjednik} />
      </section>

      {golovi.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kronologija
          </h3>
          <ul className="space-y-1">
            {golovi.map((e, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="w-12 shrink-0 tabular-nums text-slate-400">
                  {formatClock(e.elapsed_seconds)}
                </span>
                <span className="min-w-0 flex-1">
                  {e.type === "goal" ? "⚽ " : "🥅 "}
                  <span className="font-medium">{nadimak(e.scorer_id)}</span>
                  {e.assist_id && <span className="text-slate-500"> ({nadimak(e.assist_id)})</span>}
                  {e.type === "own_goal" && <span className="text-slate-500"> — autogol</span>}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{e.team}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <GumbPodijeli tekst={tekstZaDijeljenje} />
      </section>
    </div>
  );
}

type IgracSazetka = {
  userId: string;
  nadimak: string;
  team: Team;
  golovi: number;
  asistencije: number;
  autogolovi: number;
  pomak: number | null;
  rating: number | null;
};

/** Izvan komponente stranice: unutra bi se stvarala iznova pri svakom renderu. */
function Kolona({
  strana,
  igraci,
  pobjednik,
}: {
  strana: Team;
  igraci: IgracSazetka[];
  pobjednik: Team | null;
}) {
  const clanovi = igraci.filter((i) => i.team === strana);
  const pobijedila = pobjednik === strana;

  return (
      <div className="flex-1">
        <h3 className="mb-2 font-bold">
          Ekipa {strana}
          {pobijedila && <span className="ml-2 text-sm font-semibold text-emerald-700">✓</span>}
        </h3>
        <ul className="space-y-1">
          {clanovi.map((i) => (
            <li
              key={i.userId}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{i.nadimak}</span>

              {i.golovi > 0 && <span className="shrink-0 text-slate-500">⚽{i.golovi}</span>}
              {i.asistencije > 0 && <span className="shrink-0 text-slate-400">🅰{i.asistencije}</span>}
              {i.autogolovi > 0 && <span className="shrink-0 text-red-500">🥅{i.autogolovi}</span>}

              {i.pomak !== null && (
                <span
                  className={
                    "shrink-0 w-10 text-right text-xs font-semibold tabular-nums " +
                    (i.pomak > 0 ? "text-emerald-700" : i.pomak < 0 ? "text-red-600" : "text-slate-400")
                  }
                  title={`Rating: ${i.rating}`}
                >
                  {i.pomak > 0 ? `+${i.pomak}` : i.pomak}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
