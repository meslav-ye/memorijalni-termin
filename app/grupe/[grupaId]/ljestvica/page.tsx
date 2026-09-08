import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data/user";
import { getLeaderboard } from "@/lib/data/leaderboard";

export default async function StranicaLjestvice({
  params,
  searchParams,
}: PageProps<"/grupe/[grupaId]/ljestvica">) {
  const { grupaId } = await params;
  const upit = await searchParams;

  const user = await getUser();
  if (!user) redirect("/prijava");

  const trazenaSezona = typeof upit.sezona === "string" ? upit.sezona : null;
  const sveVrijeme = trazenaSezona === "sve";

  // Bez odabira gledamo najnoviju sezonu — to je ono sto ljude zanima.
  const sezonaZaPrikaz = sveVrijeme
    ? null
    : (trazenaSezona ?? (await najnovijaSezona(grupaId)));

  const { rows, seasons, matchesPlayed, records } = await getLeaderboard(
    grupaId,
    sezonaZaPrikaz,
  );

  // Kad jos nema odigranih termina, tablica se svejedno prikazuje — sa svim
  // clanovima na nuli. Prazan ekran ne bi rekao ni tko je u grupi ni sto se prati.
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

  const postotak = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div>
      {/* Prekidac seasons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/grupe/${grupaId}/ljestvica?sezona=${s.id}`}
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
          href={`/grupe/${grupaId}/ljestvica?sezona=sve`}
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

      {matchesPlayed === 0 ? (
        <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Još nema odigranih termina — svi kreću od ratinga 1000. Brojke se pune
          same čim se odigra prvi.
        </p>
      ) : (
        <p className="mb-3 text-sm text-slate-500">
          {matchesPlayed} {matchesPlayed === 1 ? "odigran termin" : "odigranih termina"}
        </p>
      )}

      {/* Tablica: uska na mobitelu, sire kolone se skrivaju */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Igrač</th>
              <th className="px-2 py-2 text-right font-semibold" title="Golovi">G</th>
              <th className="px-2 py-2 text-right font-semibold" title="Asistencije">A</th>
              <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell" title="Autogolovi">AG</th>
              <th className="px-2 py-2 text-right font-semibold" title="Odigrani termini">T</th>
              <th className="hidden px-2 py-2 text-right font-semibold sm:table-cell" title="Golova po terminu">G/T</th>
              <th className="hidden px-2 py-2 text-right font-semibold md:table-cell" title="Pobjede-Neriješeno-Porazi">P-N-P</th>
              <th className="px-2 py-2 text-right font-semibold" title="Postotak pobjeda">%</th>
              <th className="px-3 py-2 text-right font-semibold">Rating</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/grupe/${grupaId}/igrac/${r.userId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {r.nickname}
                  </Link>
                  {r.isGoalkeeper && <span title="Igra golmana"> 🧤</span>}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums">{r.goals}</td>
                <td className="px-2 py-2 text-right tabular-nums">{r.assists}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                  {r.ownGoals || ""}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-500">{r.matches}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-500 sm:table-cell">
                  {r.goalsPerMatch.toFixed(2)}
                </td>
                <td className="hidden px-2 py-2 text-right tabular-nums text-slate-500 md:table-cell">
                  {r.wins}-{r.draws}-{r.losses}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                  {postotak(r.winRate)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{r.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dolaznost */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dolaznost
        </h3>
        <ul className="space-y-1">
          {[...rows]
            .sort((a, b) => b.attendanceRate - a.attendanceRate)
            .map((r) => (
              <li
                key={r.userId}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{r.nickname}</span>
                <span className="tabular-nums text-slate-500">
                  {r.matches}/{matchesPlayed}
                </span>
                <span className="w-12 text-right font-semibold tabular-nums">
                  {postotak(r.attendanceRate)}
                </span>
                {r.currentStreak > 1 && (
                  <span
                    className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800"
                    title="Termina zaredom"
                  >
                    🔥{r.currentStreak}
                  </span>
                )}
              </li>
            ))}
        </ul>
      </section>

      {/* Rekordi */}
      {records.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Rekordi
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {records.map((r) => (
              <li key={r.title} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{r.title}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {r.value}
                  {r.who && <span className="ml-2 text-sm font-medium text-slate-600">{r.who}</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Id of the group's newest season, or null if there are none. */
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
