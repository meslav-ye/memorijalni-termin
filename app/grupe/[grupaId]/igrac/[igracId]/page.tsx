import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatShortDate } from "@/lib/format";
import { getLeaderboard } from "@/lib/data/leaderboard";

export default async function PlayerPage({
  params,
  searchParams,
}: PageProps<"/grupe/[grupaId]/igrac/[igracId]">) {
  const { grupaId, igracId } = await params;
  const query = await searchParams;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);
  if (membership?.status !== "active") notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, is_goalkeeper")
    .eq("id", igracId)
    .maybeSingle();
  if (!profile) notFound();

  // All-time stats — that is what you want on a profile.
  const { rows, matchesPlayed } = await getLeaderboard(grupaId, null);
  const row = rows.find((r) => r.userId === igracId);

  const { data: history } = await supabase
    .from("rating_history")
    .select("match_id, rating_before, rating_after, matches(starts_at, score_a, score_b)")
    .eq("user_id", igracId)
    .order("match_id")
    .limit(200);

  const last10 = (history ?? [])
    .filter((h) => h.matches)
    .sort(
      (a, b) =>
        new Date(b.matches!.starts_at).getTime() - new Date(a.matches!.starts_at).getTime(),
    )
    .slice(0, 10);

  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const fromMembers = query.from === "clanovi";
  const backHref = fromMembers
    ? `/grupe/${grupaId}/clanovi`
    : `/grupe/${grupaId}/ljestvica`;
  const backLabel = fromMembers ? "← Natrag na članove" : "← Natrag na ljestvicu";

  return (
    <div>
      <Link href={backHref} className="text-sm text-slate-500 underline underline-offset-4">
        {backLabel}
      </Link>

      <header className="mt-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {profile.nickname || "(bez nadimka)"}
          {profile.is_goalkeeper && <span title="Igra golmana"> 🧤</span>}
        </h2>
        {profile.full_name && <p className="text-slate-500">{profile.full_name}</p>}
      </header>

      {!row ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Još nije odigrao nijedan termin u ovoj grupi.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Rating", value: String(row.rating) },
              { label: "Golovi", value: String(row.goals) },
              { label: "Asistencije", value: String(row.assists) },
              { label: "Termini", value: `${row.matches}/${matchesPlayed}` },
              { label: "Golova po terminu", value: row.goalsPerMatch.toFixed(2) },
              { label: "Pobjede", value: `${row.wins}-${row.draws}-${row.losses}` },
              { label: "Postotak pobjeda", value: pct(row.winRate) },
              { label: "Dolaznost", value: pct(row.attendanceRate) },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{k.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>

          {row.longestStreak > 1 && (
            <p className="mt-3 text-sm text-slate-500">
              Najduži niz dolazaka: <strong>{row.longestStreak}</strong>
              {row.currentStreak > 1 && ` · trenutno 🔥${row.currentStreak}`}
            </p>
          )}

          {last10.length > 0 && (
            <section className="mt-8">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Zadnji termini
              </h3>
              <ul className="space-y-1">
                {last10.map((h) => {
                  const delta = h.rating_after - h.rating_before;
                  return (
                    <li
                      key={h.match_id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/grupe/${grupaId}/termin/${h.match_id}/sazetak`}
                        className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                      >
                        {formatShortDate(h.matches!.starts_at)}
                      </Link>
                      <span className="tabular-nums text-slate-500">
                        {h.matches!.score_a} : {h.matches!.score_b}
                      </span>
                      <span
                        className={
                          "w-10 text-right font-semibold tabular-nums " +
                          (delta > 0
                            ? "text-emerald-700"
                            : delta < 0
                              ? "text-red-600"
                              : "text-slate-400")
                        }
                      >
                        {delta > 0 ? `+${delta}` : delta}
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
