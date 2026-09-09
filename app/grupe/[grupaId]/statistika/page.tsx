import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  IconAssist,
  IconAttendance,
  IconGoalsAssists,
  IconKeeper,
  IconRating,
  IconScorer,
} from "@/components/brand/StatsIcons";
import { SeasonBar } from "@/components/group/SeasonBar";
import { StatsLeaderCard } from "@/components/group/StatsLeaderCard";
import { YouStrip } from "@/components/group/YouStrip";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data/user";
import { getLeaderboard, type LeaderboardRow } from "@/lib/data/leaderboard";
import { bestKeeperByGoalsAgainst } from "@/lib/domain/keepers";

/** Leader for one category; null when nobody has any value yet. */
function leader(
  rows: LeaderboardRow[],
  key: (r: LeaderboardRow) => number,
): { userId: string; nickname: string; value: number } | null {
  const best = [...rows].sort(
    (a, b) => key(b) - key(a) || a.nickname.localeCompare(b.nickname, "hr"),
  )[0];

  if (!best || key(best) <= 0) return null;
  return { userId: best.userId, nickname: best.nickname, value: key(best) };
}

function playerHref(grupaId: string, userId: string) {
  return `/grupe/${grupaId}/igrac/${userId}`;
}

export default async function StatsPage({
  params,
  searchParams,
}: PageProps<"/grupe/[grupaId]/statistika">) {
  const { grupaId } = await params;
  const query = await searchParams;

  const user = await getUser();
  if (!user) redirect("/prijava");

  const requestedSeason = typeof query.sezona === "string" ? query.sezona : null;
  const allTime = requestedSeason === "sve";

  const latestSeasonId = await latestSeason(grupaId);
  const seasonToShow = allTime ? null : (requestedSeason ?? latestSeasonId);

  const { rows, seasons, matchesPlayed, sessionsPlayed, records } = await getLeaderboard(
    grupaId,
    seasonToShow,
  );

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

  const topScorer = leader(rows, (r) => r.goals);
  const topAssister = leader(rows, (r) => r.assists);
  const topPoints = leader(rows, (r) => r.goals + r.assists);
  const topAttendance = leader(rows, (r) => r.sessionsAttended);
  const topKeeper = bestKeeperByGoalsAgainst(rows);

  // Everyone starts with a rating, so only show a rating leader once someone
  // has actually separated from the initial 1000 — otherwise a random person
  // would "lead".
  const topRating = matchesPlayed > 0 ? leader(rows, (r) => r.rating) : null;

  const keepers = [...rows]
    .filter((r) => r.isGoalkeeper)
    .sort((a, b) => {
      const avgA =
        a.matchesAsKeeper > 0 ? a.goalsAgainst / a.matchesAsKeeper : Number.POSITIVE_INFINITY;
      const avgB =
        b.matchesAsKeeper > 0 ? b.goalsAgainst / b.matchesAsKeeper : Number.POSITIVE_INFINITY;
      return (
        avgA - avgB ||
        b.matchesAsKeeper - a.matchesAsKeeper ||
        a.nickname.localeCompare(b.nickname, "hr")
      );
    });

  const totalGoals = rows.reduce((s, r) => s + r.goals, 0);
  const totalAssists = rows.reduce((s, r) => s + r.assists, 0);

  const me = rows.find((r) => r.userId === user.id);

  const recordCards: {
    title: string;
    icon: ReactNode;
  }[] = [
    { title: "Najviše golova na utakmici", icon: <IconScorer /> },
    { title: "Najviše G+A", icon: <IconGoalsAssists /> },
    { title: "Najmanje primljenih na utakmici", icon: <IconKeeper /> },
    // No Vodeći twin — keep text-only heading (no emoji).
    { title: "Najveća pobjeda", icon: null },
    { title: "Najviše termina ukupno", icon: <IconAttendance /> },
  ];

  return (
    <div className="space-y-8">
      <SeasonBar
        grupaId={grupaId}
        basePath={`/grupe/${grupaId}/statistika`}
        seasons={seasons}
        requestedSeason={requestedSeason}
        latestSeasonId={latestSeasonId}
      />

      {matchesPlayed === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          Još nema odigranih utakmica — brojke se pune same čim se odigra prva.
        </p>
      ) : (
        <p className="text-sm text-slate-500">
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
          statsLine={`${me.goals} G · ${me.assists} A · ${me.matches} U`}
        />
      )}

      {/* Group summary — quiet totals, thin brand accent */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ukupno
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {[
            { label: "Utakmice", v: matchesPlayed },
            { label: "Termini", v: sessionsPlayed },
            { label: "Golova", v: totalGoals },
            { label: "Asistencija", v: totalAssists },
          ].map((k) => (
            <div key={k.label} className="border-l-2 border-marka pl-3">
              <p className="text-2xl font-bold tabular-nums text-slate-900">{k.v}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leaders by category */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Vodeći
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <StatsLeaderCard
            icon={<IconScorer />}
            title="Najbolji strijelac"
            value={topScorer ? String(topScorer.value) : "—"}
            who={topScorer?.nickname ?? ""}
            href={topScorer ? playerHref(grupaId, topScorer.userId) : null}
            suffix={topScorer && topScorer.value === 1 ? "gol" : "golova"}
          />
          <StatsLeaderCard
            icon={<IconAssist />}
            title="Najviše asistencija"
            value={topAssister ? String(topAssister.value) : "—"}
            who={topAssister?.nickname ?? ""}
            href={topAssister ? playerHref(grupaId, topAssister.userId) : null}
          />
          <StatsLeaderCard
            icon={<IconGoalsAssists />}
            title="Najviše bodova (G+A)"
            value={topPoints ? String(topPoints.value) : "—"}
            who={topPoints?.nickname ?? ""}
            href={topPoints ? playerHref(grupaId, topPoints.userId) : null}
          />
          <StatsLeaderCard
            icon={<IconRating />}
            title="Najveći rating"
            value={topRating ? String(topRating.value) : "—"}
            who={topRating?.nickname ?? ""}
            href={topRating ? playerHref(grupaId, topRating.userId) : null}
          />
          <StatsLeaderCard
            icon={<IconAttendance />}
            title="Najviše odigranih"
            value={topAttendance ? String(topAttendance.value) : "—"}
            who={topAttendance?.nickname ?? ""}
            href={topAttendance ? playerHref(grupaId, topAttendance.userId) : null}
            suffix={topAttendance && topAttendance.value === 1 ? "termin" : "termina"}
          />
          <StatsLeaderCard
            icon={<IconKeeper />}
            title="Najmanje primljenih"
            value={topKeeper ? topKeeper.average.toFixed(1) : "—"}
            who={topKeeper?.nickname ?? ""}
            href={topKeeper ? playerHref(grupaId, topKeeper.userId) : null}
            suffix="po utakmici"
          />
        </div>
      </section>

      {keepers.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <IconKeeper className="h-4 w-4 text-marka" />
            Golmani
          </h3>
          <ul className="space-y-2">
            {keepers.map((r) => {
              const avg =
                r.matchesAsKeeper > 0
                  ? (r.goalsAgainst / r.matchesAsKeeper).toFixed(1)
                  : "—";
              const isYou = r.userId === user.id;
              const stats = [
                {
                  label: "Na golu",
                  value: String(r.matchesAsKeeper),
                  title: "Utakmice na golu",
                },
                {
                  label: "PG",
                  value: String(r.goalsAgainst),
                  title: "Primljeni golovi",
                },
                {
                  label: "Prosjek",
                  value: avg === "—" ? "—" : `${avg}`,
                  title: "Prosjek primljenih po utakmici",
                },
                {
                  label: "CS",
                  value: String(r.cleanSheets),
                  title: "Čiste mreže",
                },
              ];
              return (
                <li
                  key={r.userId}
                  className={
                    "rounded-lg border p-3 " +
                    (isYou
                      ? "border-marka/30 bg-marka/5"
                      : "border-slate-200 bg-white")
                  }
                >
                  <Link
                    href={`/grupe/${grupaId}/igrac/${r.userId}?from=statistika`}
                    className="flex items-center gap-1.5 text-base font-semibold underline-offset-4 hover:underline"
                  >
                    {r.nickname}
                    {isYou && (
                      <span className="text-[0.65rem] font-bold uppercase text-marka-svijetla">
                        Ti
                      </span>
                    )}
                    <IconKeeper className="inline-block h-3.5 w-3.5 text-marka" />
                  </Link>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-md bg-slate-50 px-1 py-2 text-center"
                        title={s.title}
                      >
                        <p className="text-lg font-bold tabular-nums text-slate-900">{s.value}</p>
                        <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-slate-500">
            PG = primljeni golovi · CS = utakmice bez primljenog · samo dok je igrač na golu.
          </p>
        </section>
      )}

      {/* Records — shown even when empty so it is clear what is tracked */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rekordi
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {recordCards.map(({ title, icon }) => {
            const found = records.find((r) => r.title === title);
            return (
              <StatsLeaderCard
                key={title}
                icon={icon}
                title={title}
                value={found?.value ?? "—"}
                who={found?.who ?? (found ? "—" : "")}
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
