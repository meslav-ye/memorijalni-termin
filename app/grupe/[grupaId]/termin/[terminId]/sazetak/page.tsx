import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatShortDate, formatMatchDateTime } from "@/lib/format";
import { formatClock } from "@/lib/domain/timer";
import { computeContributions } from "@/lib/domain/contribution";
import type { Team } from "@/lib/domain/types";
import { teamDisplayName } from "@/lib/domain/team-name";
import { ShareButton } from "./ShareButton";

export default async function SummaryPage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/sazetak">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);
  if (membership?.status !== "active") notFound();

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, starts_at, location_text, locations(name)")
    .eq("id", terminId)
    .maybeSingle();
  if (!match) notFound();

  if (match.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const { data: games } = await supabase
    .from("games")
    .select(
      "id, seq, score_a, score_b, started_at, ended_at, total_paused_seconds, team_a_name, team_b_name",
    )
    .eq("match_id", terminId)
    .eq("status", "zavrsena")
    .order("seq", { ascending: true });

  const finished = games ?? [];
  const gameIds = finished.map((g) => g.id);

  const [{ data: lineup }, { data: events }, { data: history }] = await Promise.all([
    supabase
      .from("match_lineup")
      .select("game_id, user_id, team, is_goalkeeper")
      .in("game_id", gameIds.length ? gameIds : ["-"]),
    supabase
      .from("match_events")
      .select("game_id, type, team, scorer_id, assist_id, elapsed_seconds, deleted_at")
      .in("game_id", gameIds.length ? gameIds : ["-"])
      .is("deleted_at", null)
      .in("type", ["goal", "own_goal", "keeper_change"])
      .order("elapsed_seconds"),
    supabase
      .from("rating_history")
      .select("game_id, user_id, rating_before, rating_after")
      .in("game_id", gameIds.length ? gameIds : ["-"])
      .eq("scope", "group"),
  ]);

  const allUserIds = [...new Set((lineup ?? []).map((p) => p.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", allUserIds.length ? allUserIds : ["-"]);

  const nicknameOf = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.nickname || "?";

  const location = match.locations?.name ?? match.location_text ?? "";

  const gameBlocks = finished.map((game) => {
    const gameLineup = (lineup ?? []).filter((p) => p.game_id === game.id);
    const gameEvents = (events ?? []).filter((e) => e.game_id === game.id);
    const goals = gameEvents.filter((e) => e.type === "goal" || e.type === "own_goal");
    const gameHistory = (history ?? []).filter((h) => h.game_id === game.id);

    const contrib = computeContributions({
      lineup: gameLineup.map((p) => ({
        userId: p.user_id,
        team: p.team as Team,
        isGoalkeeper: p.is_goalkeeper,
      })),
      events: gameEvents.map((e) => ({
        type: e.type as "goal" | "own_goal" | "keeper_change",
        team: e.team as Team | null,
        scorerId: e.scorer_id,
        assistId: e.assist_id,
        elapsedSeconds: e.elapsed_seconds,
        deletedAt: e.deleted_at,
      })),
    });

    const players = gameLineup.map((p) => {
      const record = gameHistory.find((r) => r.user_id === p.user_id);
      const delta = record ? record.rating_after - record.rating_before : null;
      const contribution = contrib.get(p.user_id)?.clamped ?? 0;
      const eloDelta = delta !== null ? delta - contribution : null;
      return {
        userId: p.user_id,
        nickname: nicknameOf(p.user_id),
        team: p.team as Team,
        goals: goals.filter((e) => e.type === "goal" && e.scorer_id === p.user_id).length,
        assists: goals.filter((e) => e.assist_id === p.user_id).length,
        ownGoals: goals.filter((e) => e.type === "own_goal" && e.scorer_id === p.user_id).length,
        delta,
        eloDelta,
        contribution,
        rating: record?.rating_after ?? null,
      };
    });

    const winner =
      game.score_a > game.score_b ? "A" : game.score_b > game.score_a ? "B" : null;

    const duration =
      game.started_at && game.ended_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(game.ended_at).getTime() - new Date(game.started_at).getTime()) / 1000,
            ) - game.total_paused_seconds,
          )
        : null;

    const labelA = teamDisplayName("A", game.team_a_name);
    const labelB = teamDisplayName("B", game.team_b_name);

    const scorers = players
      .filter((i) => i.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .map((i) => `${i.nickname} ${i.goals}`)
      .join(", ");

    return {
      game,
      players,
      goals,
      winner: winner as Team | null,
      duration,
      labelA,
      labelB,
      scorers,
    };
  });

  const shareText = [
    `Termin ${formatShortDate(match.starts_at)}${location ? `, ${location}` : ""}`,
    ...gameBlocks.map((b) => {
      const header = `Utakmica ${b.game.seq}: ${b.labelA} ${b.game.score_a} : ${b.game.score_b} ${b.labelB}`;
      return b.scorers ? `${header}\n⚽ ${b.scorers}` : header;
    }),
  ].join("\n\n");

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termine
      </Link>

      <header className="mt-4 text-center">
        <p className="text-sm text-slate-500">{formatMatchDateTime(match.starts_at)}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight">
          {finished.length === 0
            ? "Nema završenih utakmica"
            : finished.length === 1
              ? "1 utakmica"
              : `${finished.length} utakmice`}
        </h2>
      </header>

      {gameBlocks.length > 0 && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kako se računa rating
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Prvo <strong>timski Elo</strong> — svi u ekipi dobiju isti pomak za
              pobjedu, poraz ili neriješeno (ne ovisi o razlici golova).
            </li>
            <li>
              Zatim <strong>osobni doprinos</strong>: gol +2, asistencija +1, autogol −1;
              golman po broju primljenih dok je na golu; cijela ekipa −⌊primljenih/4⌋
              (najviše −3).
            </li>
            <li>
              Zbroj doprinosa je ograničen na <strong>±6</strong>. Ukupno:{" "}
              <span className="font-medium text-slate-800">
                prije + Elo + doprinos
              </span>
              .
            </li>
          </ul>
          <p className="mt-2 text-slate-500">
            Broj uz ime igrača je ukupna promjena ratinga u toj utakmici.
          </p>
        </section>
      )}

      {gameBlocks.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Termin je završen bez odigrane utakmice.
        </p>
      ) : (
        gameBlocks.map((b) => (
          <section key={b.game.id} className="mt-8">
            <div className="rounded-xl bg-marka p-5 text-center text-white">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Utakmica {b.game.seq}
              </p>
              <div className="flex items-center justify-center gap-4">
                <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold uppercase text-slate-400">
                  {b.labelA}
                </span>
                <span className="text-4xl font-bold tabular-nums">
                  {b.game.score_a} : {b.game.score_b}
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold uppercase text-slate-400">
                  {b.labelB}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {b.winner
                  ? `Pobijedila ${b.winner === "A" ? b.labelA : b.labelB}`
                  : "Neriješeno"}
                {b.duration !== null && ` · ${formatClock(b.duration)}`}
              </p>
            </div>

            <div className="mt-4 flex gap-3">
              <TeamColumn side="A" label={b.labelA} players={b.players} winner={b.winner} />
              <TeamColumn side="B" label={b.labelB} players={b.players} winner={b.winner} />
            </div>

            {b.goals.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Kronologija
                </h3>
                <ul className="space-y-1">
                  {b.goals.map((e, i) => (
                    <li
                      key={`${b.game.id}-${i}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="w-12 shrink-0 tabular-nums text-slate-400">
                        {formatClock(e.elapsed_seconds)}
                      </span>
                      <span className="min-w-0 flex-1">
                        {e.type === "goal" ? "⚽ " : "🥅 "}
                        <span className="font-medium">{nicknameOf(e.scorer_id)}</span>
                        {e.assist_id && (
                          <span className="text-slate-500"> ({nicknameOf(e.assist_id)})</span>
                        )}
                        {e.type === "own_goal" && (
                          <span className="text-slate-500"> — autogol</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-400">
                        {e.team}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))
      )}

      {gameBlocks.length > 0 && (
        <section className="mt-8">
          <ShareButton text={shareText} />
        </section>
      )}
    </div>
  );
}

type SummaryPlayer = {
  userId: string;
  nickname: string;
  team: Team;
  goals: number;
  assists: number;
  ownGoals: number;
  delta: number | null;
  eloDelta: number | null;
  contribution: number;
  rating: number | null;
};

/** Outside the page component: inside it would be recreated on every render. */
function TeamColumn({
  side,
  label,
  players,
  winner,
}: {
  side: Team;
  label: string;
  players: SummaryPlayer[];
  winner: Team | null;
}) {
  const members = players.filter((i) => i.team === side);
  const won = winner === side;

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="flex-1">
      <h3 className="mb-2 truncate font-bold">
        {label}
        {won && <span className="ml-2 text-sm font-semibold text-emerald-700">✓</span>}
      </h3>
      <ul className="space-y-1">
        {members.map((i) => (
          <li
            key={i.userId}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{i.nickname}</span>

            {i.goals > 0 && <span className="shrink-0 text-slate-500">⚽{i.goals}</span>}
            {i.assists > 0 && <span className="shrink-0 text-slate-400">🅰{i.assists}</span>}
            {i.ownGoals > 0 && <span className="shrink-0 text-red-500">🥅{i.ownGoals}</span>}

            {i.delta !== null && (
              <span
                className={
                  "shrink-0 min-w-10 text-right text-xs font-semibold tabular-nums " +
                  (i.delta > 0 ? "text-emerald-700" : i.delta < 0 ? "text-red-600" : "text-slate-400")
                }
              >
                {fmt(i.delta)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
