import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatirajKratko } from "@/lib/format";
import { getLeaderboard } from "@/lib/data/leaderboard";

export default async function StranicaIgraca({
  params,
}: PageProps<"/grupe/[grupaId]/igrac/[igracId]">) {
  const { grupaId, igracId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const clanstvo = await getMembership(grupaId);
  if (clanstvo?.status !== "active") notFound();

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, is_goalkeeper")
    .eq("id", igracId)
    .maybeSingle();
  if (!profil) notFound();

  // Statistika "sve vrijeme" — na profilu je to ono sto se zeli vidjeti.
  const { rows, matchesPlayed } = await getLeaderboard(grupaId, null);
  const ja = rows.find((r) => r.userId === igracId);

  const { data: povijest } = await supabase
    .from("rating_history")
    .select("match_id, rating_before, rating_after, matches(starts_at, score_a, score_b)")
    .eq("user_id", igracId)
    .order("match_id")
    .limit(200);

  const zadnjih10 = (povijest ?? [])
    .filter((h) => h.matches)
    .sort(
      (a, b) =>
        new Date(b.matches!.starts_at).getTime() - new Date(a.matches!.starts_at).getTime(),
    )
    .slice(0, 10);

  const postotak = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}/ljestvica`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na ljestvicu
      </Link>

      <header className="mt-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {profil.nickname || "(bez nadimka)"}
          {profil.is_goalkeeper && <span title="Igra golmana"> 🧤</span>}
        </h2>
        {profil.full_name && <p className="text-slate-500">{profil.full_name}</p>}
      </header>

      {!ja ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Još nije odigrao nijedan termin u ovoj grupi.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { oznaka: "Rating", vrijednost: String(ja.rating) },
              { oznaka: "Golovi", vrijednost: String(ja.goals) },
              { oznaka: "Asistencije", vrijednost: String(ja.assists) },
              { oznaka: "Termini", vrijednost: `${ja.matches}/${matchesPlayed}` },
              { oznaka: "Golova po terminu", vrijednost: ja.goalsPerMatch.toFixed(2) },
              { oznaka: "Pobjede", vrijednost: `${ja.wins}-${ja.draws}-${ja.losses}` },
              { oznaka: "Postotak pobjeda", vrijednost: postotak(ja.winRate) },
              { oznaka: "Dolaznost", vrijednost: postotak(ja.attendanceRate) },
            ].map((k) => (
              <div key={k.oznaka} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{k.oznaka}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{k.vrijednost}</p>
              </div>
            ))}
          </div>

          {ja.longestStreak > 1 && (
            <p className="mt-3 text-sm text-slate-500">
              Najduži niz dolazaka: <strong>{ja.longestStreak}</strong>
              {ja.currentStreak > 1 && ` · trenutno 🔥${ja.currentStreak}`}
            </p>
          )}

          {zadnjih10.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Zadnji termini
              </h3>
              <ul className="space-y-1">
                {zadnjih10.map((h) => {
                  const pomak = h.rating_after - h.rating_before;
                  return (
                    <li
                      key={h.match_id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/grupe/${grupaId}/termin/${h.match_id}/sazetak`}
                        className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                      >
                        {formatirajKratko(h.matches!.starts_at)}
                      </Link>
                      <span className="tabular-nums text-slate-500">
                        {h.matches!.score_a} : {h.matches!.score_b}
                      </span>
                      <span
                        className={
                          "w-10 text-right font-semibold tabular-nums " +
                          (pomak > 0
                            ? "text-emerald-700"
                            : pomak < 0
                              ? "text-red-600"
                              : "text-slate-400")
                        }
                      >
                        {pomak > 0 ? `+${pomak}` : pomak}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
