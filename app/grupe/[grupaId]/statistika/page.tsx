import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data/user";
import { getLeaderboard, type LeaderboardRow } from "@/lib/data/leaderboard";
import { bestKeeperByGoalsAgainst } from "@/lib/domain/keepers";

/** Leader for one category; null when nobody has any value yet. */
function leader(
  rows: LeaderboardRow[],
  key: (r: LeaderboardRow) => number,
): { nickname: string; value: number } | null {
  const best = [...rows].sort(
    (a, b) => key(b) - key(a) || a.nickname.localeCompare(b.nickname, "hr"),
  )[0];

  if (!best || key(best) <= 0) return null;
  return { nickname: best.nickname, value: key(best) };
}

function LeaderCard({
  icon,
  title,
  value,
  who,
  suffix,
}: {
  icon: string;
  title: string;
  value: string;
  who: string;
  suffix?: string;
}) {
  const empty = who === "";

  return (
    <div
      className={
        "rounded-lg border p-4 " +
        (empty ? "border-dashed border-slate-300 bg-white" : "border-slate-200 bg-white")
      }
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {icon} {title}
      </p>

      <p
        className={
          "mt-2 text-2xl font-bold tabular-nums " + (empty ? "text-slate-300" : "text-slate-900")
        }
      >
        {value}
        {suffix && !empty && (
          <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
        )}
      </p>

      <p className={"mt-1 text-sm font-medium " + (empty ? "text-slate-400" : "text-slate-700")}>
        {empty ? "još nitko" : who}
      </p>
    </div>
  );
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

  const seasonToShow = allTime ? null : (requestedSeason ?? (await latestSeason(grupaId)));

  const { rows, seasons, matchesPlayed, records } = await getLeaderboard(
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
  const topAttendance = leader(rows, (r) => r.matches);
  const topKeeper = bestKeeperByGoalsAgainst(rows);

  // Everyone starts with a rating, so only show a rating leader once someone
  // has actually separated from the initial 1000 — otherwise a random person
  // would "lead".
  const topRating = matchesPlayed > 0 ? leader(rows, (r) => r.rating) : null;

  const totalGoals = rows.reduce((s, r) => s + r.goals, 0);
  const totalAssists = rows.reduce((s, r) => s + r.assists, 0);

  return (
    <div className="space-y-8">
      {/* Season switcher — same as on the leaderboard */}
      <div className="flex flex-wrap gap-2">
        {seasons.map((s) => (
          <Link
            key={s.id}
            href={`/grupe/${grupaId}/statistika?sezona=${s.id}`}
            className={
              "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
              (requestedSeason === s.id || (!requestedSeason && !allTime)
                ? "border-marka bg-marka text-white"
                : "border-slate-300 bg-white text-slate-700")
            }
          >
            {s.name}
          </Link>
        ))}
        <Link
          href={`/grupe/${grupaId}/statistika?sezona=sve`}
          className={
            "h-9 rounded-lg border px-3 text-sm font-medium leading-9 transition " +
            (allTime
              ? "border-marka bg-marka text-white"
              : "border-slate-300 bg-white text-slate-700")
          }
        >
          Sve vrijeme
        </Link>
      </div>

      {/* Group summary */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ukupno
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Termina", v: matchesPlayed },
            { label: "Golova", v: totalGoals },
            { label: "Asistencija", v: totalAssists },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{k.v}</p>
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
          <LeaderCard
            icon="⚽"
            title="Najbolji strijelac"
            value={topScorer ? String(topScorer.value) : "—"}
            who={topScorer?.nickname ?? ""}
            suffix={topScorer && topScorer.value === 1 ? "gol" : "golova"}
          />
          <LeaderCard
            icon="🅰️"
            title="Najviše asistencija"
            value={topAssister ? String(topAssister.value) : "—"}
            who={topAssister?.nickname ?? ""}
          />
          <LeaderCard
            icon="🎯"
            title="Najviše bodova (G+A)"
            value={topPoints ? String(topPoints.value) : "—"}
            who={topPoints?.nickname ?? ""}
          />
          <LeaderCard
            icon="⭐"
            title="Najveći rating"
            value={topRating ? String(topRating.value) : "—"}
            who={topRating?.nickname ?? ""}
          />
          <LeaderCard
            icon="🔥"
            title="Najviše odigranih"
            value={topAttendance ? String(topAttendance.value) : "—"}
            who={topAttendance?.nickname ?? ""}
            suffix={topAttendance && topAttendance.value === 1 ? "termin" : "termina"}
          />
          <LeaderCard
            icon="🧤"
            title="Najmanje primljenih"
            value={topKeeper ? topKeeper.average.toFixed(1) : "—"}
            who={topKeeper?.nickname ?? ""}
            suffix="po terminu"
          />
        </div>
      </section>

      {/* Records — shown even when empty so it is clear what is tracked */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Rekordi
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Najviše golova na terminu",
            "Najveća pobjeda",
            "Najviše termina zaredom",
          ].map((title) => {
            const found = records.find((r) => r.title === title);
            return (
              <LeaderCard
                key={title}
                icon="🏆"
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
