import { redirect } from "next/navigation";
import { SeasonBar } from "@/components/group/SeasonBar";
import { YouStrip } from "@/components/group/YouStrip";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data/user";
import { getLeaderboard } from "@/lib/data/leaderboard";
import { LeaderboardTable } from "./LeaderboardTable";

export default async function LeaderboardPage({
  params,
  searchParams,
}: PageProps<"/grupe/[grupaId]/ljestvica">) {
  const { grupaId } = await params;
  const query = await searchParams;

  const user = await getUser();
  if (!user) redirect("/prijava");

  const requestedSeason = typeof query.sezona === "string" ? query.sezona : null;
  const allTime = requestedSeason === "sve";

  // Fetch newest season once — default view and SeasonBar active state share it.
  const latestSeasonId = await latestSeason(grupaId);
  const seasonToShow = allTime ? null : (requestedSeason ?? latestSeasonId);

  const { rows, seasons, matchesPlayed, sessionsPlayed, distanceLeaders } =
    await getLeaderboard(grupaId, seasonToShow);

  // When no matches have been played yet, still show the table — all members
  // at zero. An empty screen would not say who is in the group or what is tracked.
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

  const pct = (x: number) => `${Math.round(x * 100)}%`;

  const meIndex = rows.findIndex((r) => r.userId === user.id);
  const me = meIndex >= 0 ? rows[meIndex] : undefined;
  const meRank = meIndex + 1;

  const tableRows = rows.map((r) => ({
    userId: r.userId,
    nickname: r.nickname,
    isGoalkeeper: r.isGoalkeeper,
    goals: r.goals,
    assists: r.assists,
    ownGoals: r.ownGoals,
    matches: r.matches,
    goalsPerMatch: r.goalsPerMatch,
    wins: r.wins,
    draws: r.draws,
    losses: r.losses,
    winRate: r.winRate,
    rating: r.rating,
  }));

  return (
    <div>
      <div className="mb-4">
        <SeasonBar
          grupaId={grupaId}
          basePath={`/grupe/${grupaId}/ljestvica`}
          seasons={seasons}
          requestedSeason={requestedSeason}
          latestSeasonId={latestSeasonId}
        />
      </div>

      {matchesPlayed === 0 ? (
        <p className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Još nema odigranih utakmica — svi kreću od ratinga 1000. Brojke se pune
          same čim se odigra prva.
        </p>
      ) : (
        <p className="mb-3 text-sm text-slate-500">
          {matchesPlayed} {matchesPlayed === 1 ? "odigrana utakmica" : "odigranih utakmica"}
          {" · "}
          {sessionsPlayed} {sessionsPlayed === 1 ? "termin" : "termina"}
        </p>
      )}

      {me && matchesPlayed > 0 && (
        <YouStrip
          grupaId={grupaId}
          userId={me.userId}
          nickname={me.nickname}
          statsLine={`${meRank}. · ${Math.round(me.rating)} Rtg`}
        />
      )}

      <p className="mb-2 mt-3 text-xs text-slate-500">
        G golovi · A asistencije · U utakmice · % pobjede · Rtg Elo
      </p>

      <LeaderboardTable
        grupaId={grupaId}
        rows={tableRows}
        currentUserId={user.id}
      />

      {/* Running distance */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Trčanje
        </h3>
        {distanceLeaders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
            Još nema unesenih kilometara.
          </p>
        ) : (
          <ul className="space-y-1">
            {distanceLeaders.map((r) => {
              const isYou = r.userId === user.id;
              return (
                <li
                  key={r.userId}
                  className={
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm " +
                    (isYou
                      ? "border-marka/30 bg-marka/5"
                      : "border-slate-200 bg-white")
                  }
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.nickname}
                    {isYou && (
                      <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-marka-svijetla">
                        Ti
                      </span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {r.distanceKm} km
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Attendance */}
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dolaznost
        </h3>
        <ul className="space-y-1">
          {[...rows]
            .sort((a, b) => b.attendanceRate - a.attendanceRate)
            .map((r) => {
              const isYou = r.userId === user.id;
              return (
                <li
                  key={r.userId}
                  className={
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm " +
                    (isYou
                      ? "border-marka/30 bg-marka/5"
                      : "border-slate-200 bg-white")
                  }
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.nickname}
                    {isYou && (
                      <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-marka-svijetla">
                        Ti
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {r.sessionsAttended}/{sessionsPlayed}
                  </span>
                  <span className="w-12 text-right font-semibold tabular-nums">
                    {pct(r.attendanceRate)}
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
              );
            })}
        </ul>
      </section>
    </div>
  );
}

/** Id of the group's newest season, or null if there are none. */
async function latestSeason(grupaId: string): Promise<string | null> {
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
