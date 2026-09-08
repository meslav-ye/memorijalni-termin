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
    .select("id, nickname, full_name, is_goalkeeper, global_rating, global_matches_played")
    .eq("id", igracId)
    .maybeSingle();
  if (!profile) notFound();

  // All-time stats — that is what you want on a profile.
  const { rows, matchesPlayed, sessionsPlayed } = await getLeaderboard(grupaId, null);
  const row = rows.find((r) => r.userId === igracId);

  const { data: history } = await supabase
    .from("rating_history")
    .select("match_id, game_id, rating_before, rating_after, games(score_a, score_b, seq, matches(starts_at))")
    .eq("user_id", igracId)
    .eq("scope", "group")
    .order("game_id")
    .limit(200);

  type HistoryGame = {
    score_a: number;
    score_b: number;
    seq: number;
    matches: { starts_at: string } | null;
  };

  const last10 = (history ?? [])
    .map((h) => {
      const game = h.games as HistoryGame | HistoryGame[] | null;
      const g = Array.isArray(game) ? game[0] : game;
      return g?.matches ? { ...h, game: g } : null;
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort(
      (a, b) =>
        new Date(b.game.matches!.starts_at).getTime() -
          new Date(a.game.matches!.starts_at).getTime() ||
        b.game.seq - a.game.seq,
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

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Globalni rating</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{profile.global_rating}</p>
          </div>
          <p className="text-sm tabular-nums text-slate-500">
            {profile.global_matches_played}{" "}
            {profile.global_matches_played === 1 ? "utakmica" : "utakmice"}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Prati rezultat kroz sve grupe — nije usporedba snage među grupama.
        </p>
      </section>

      {!row ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
          Još nije odigrao nijednu utakmicu u ovoj grupi.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Rating u grupi", value: String(row.rating) },
              { label: "Golovi", value: String(row.goals) },
              { label: "Asistencije", value: String(row.assists) },
              { label: "Utakmice", value: `${row.matches}/${matchesPlayed}` },
              { label: "Termini", value: `${row.sessionsAttended}/${sessionsPlayed}` },
              { label: "Golova po utakmici", value: row.goalsPerMatch.toFixed(2) },
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
                Zadnje utakmice
              </h3>
              <ul className="space-y-1">
                {last10.map((h) => {
                  const delta = h.rating_after - h.rating_before;
                  return (
                    <li
                      key={h.game_id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/grupe/${grupaId}/termin/${h.match_id}/sazetak`}
                        className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                      >
                        {formatShortDate(h.game.matches!.starts_at)}
                        {h.game.seq > 1 ? ` · #${h.game.seq}` : ""}
                      </Link>
                      <span className="tabular-nums text-slate-500">
                        {h.game.score_a} : {h.game.score_b}
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
