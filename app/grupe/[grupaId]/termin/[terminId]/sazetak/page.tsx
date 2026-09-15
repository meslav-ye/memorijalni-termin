import { notFound, redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { createClient } from "@/lib/supabase/server";
import { inUuids } from "@/lib/supabase/in-filter";
import { getMembership, getUser } from "@/lib/data/user";
import { formatShortDate, formatMatchDateTime } from "@/lib/format";
import { formatClock } from "@/lib/domain/timer";
import { computeContributions } from "@/lib/domain/contribution";
import { ratingBreakdownLines } from "@/lib/domain/rating-breakdown";
import type { Team } from "@/lib/domain/types";
import { teamDisplayName } from "@/lib/domain/team-name";
import { teamNameOnDarkClass } from "@/lib/domain/team-colors";
import { ShareButton } from "./ShareButton";
import { MatchDescription } from "./MatchDescription";
import { ActivityForm } from "./ActivityForm";
import { GoalChronology } from "./GoalChronology";
import { TeamsRatingExpand } from "./TeamsRatingExpand";
import { deleteMatch } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { withinAssistEditWindow } from "@/lib/domain/assist-edit";

export default async function SummaryPage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/sazetak">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);
  if (membership?.status !== "active") notFound();
  const admin = membership.role === "admin";

  const { data: match } = await supabase
    .from("matches")
    .select("id, status, starts_at, location_text, description, locations(name)")
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
      .select("game_id, id, user_id, filler_id, team, is_goalkeeper, display_name, is_guest")
      .in("game_id", inUuids(gameIds)),
    supabase
      .from("match_events")
      .select(
        "id, game_id, type, team, scorer_id, scorer_filler_id, assist_id, assist_filler_id, elapsed_seconds, deleted_at",
      )
      .in("game_id", inUuids(gameIds))
      .is("deleted_at", null)
      .in("type", ["goal", "own_goal", "keeper_change"])
      .order("elapsed_seconds"),
    supabase
      .from("rating_history")
      .select("game_id, user_id, rating_before, rating_after")
      .in("game_id", inUuids(gameIds))
      .eq("scope", "group"),
  ]);

  const allUserIds = [
    ...new Set(
      (lineup ?? []).map((p) => p.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const canEdit = allUserIds.includes(user.id);

  const [{ data: profiles }, { data: activities }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname")
      .in("id", inUuids(allUserIds)),
    supabase
      .from("match_activity")
      .select("user_id, distance_km, max_speed_kmh, avg_speed_kmh")
      .eq("match_id", terminId),
  ]);

  const nicknameOf = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.nickname || "?";

  const nicknameMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.nickname || "?"]),
  );

  const fillerNameMap = Object.fromEntries(
    (lineup ?? [])
      .filter((p) => p.is_guest && p.filler_id)
      .map((p) => [p.filler_id!, p.display_name ?? "Gost"]),
  );

  const activityByUser = new Map(
    (activities ?? []).map((a) => [
      a.user_id,
      {
        distanceKm: a.distance_km === null ? null : Number(a.distance_km),
        maxSpeedKmh: a.max_speed_kmh === null ? null : Number(a.max_speed_kmh),
        avgSpeedKmh: a.avg_speed_kmh === null ? null : Number(a.avg_speed_kmh),
      },
    ]),
  );

  const activityPlayers = allUserIds
    .map((userId) => {
      const row = activityByUser.get(userId);
      return {
        userId,
        nickname: nicknameOf(userId),
        distanceKm: row?.distanceKm ?? null,
        maxSpeedKmh: row?.maxSpeedKmh ?? null,
        avgSpeedKmh: row?.avgSpeedKmh ?? null,
      };
    })
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "hr"));

  const myActivity = activityByUser.get(user.id) ?? null;

  const location = match.locations?.name ?? match.location_text ?? "";

  const gameBlocks = finished.map((game) => {
    const gameLineup = (lineup ?? []).filter((p) => p.game_id === game.id);
    const gameEvents = (events ?? []).filter((e) => e.game_id === game.id);
    const goals = gameEvents.filter((e) => e.type === "goal" || e.type === "own_goal");
    const gameHistory = (history ?? []).filter((h) => h.game_id === game.id);

    const registeredLineup = gameLineup.filter((p) => p.user_id && !p.is_guest);
    const contrib = computeContributions({
      lineup: registeredLineup.map((p) => ({
        userId: p.user_id!,
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
      if (p.is_guest || !p.user_id) {
        const fillerId = p.filler_id;
        return {
          lineupId: p.id,
          nickname: p.display_name ?? "Gost",
          isGuest: true,
          team: p.team as Team,
          goals: goals.filter(
            (e) => e.type === "goal" && e.scorer_filler_id === fillerId,
          ).length,
          assists: goals.filter((e) => e.assist_filler_id === fillerId).length,
          ownGoals: goals.filter(
            (e) => e.type === "own_goal" && e.scorer_filler_id === fillerId,
          ).length,
          delta: null,
          breakdown: null,
        };
      }
      const record = gameHistory.find((r) => r.user_id === p.user_id);
      const delta = record ? record.rating_after - record.rating_before : null;
      const row = contrib.get(p.user_id);
      const contribution = row?.clamped ?? 0;
      const eloDelta = delta !== null ? delta - contribution : null;
      const breakdown =
        delta !== null && eloDelta !== null && row
          ? ratingBreakdownLines({ eloDelta, contrib: row, delta })
          : null;
      return {
        lineupId: p.id,
        nickname: nicknameOf(p.user_id),
        isGuest: false,
        team: p.team as Team,
        goals: goals.filter((e) => e.type === "goal" && e.scorer_id === p.user_id).length,
        assists: goals.filter((e) => e.assist_id === p.user_id).length,
        ownGoals: goals.filter((e) => e.type === "own_goal" && e.scorer_id === p.user_id).length,
        delta,
        breakdown,
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
      <SoftLink href={`/grupe/${grupaId}`}>← Natrag na termine</SoftLink>

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
        <details className="group mt-6 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 open:pb-4">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Kako se računa rating
              <span
                aria-hidden
                className="text-slate-400 transition group-open:rotate-180"
              >
                ▾
              </span>
            </span>
          </summary>
          <div className="space-y-3 border-t border-slate-100 px-4 pt-3">
            <p>
              Broj uz ime igrača je ukupna promjena ratinga u toj utakmici:
              <span className="font-medium text-slate-800">
                {" "}
                prije + Elo + doprinos
              </span>
              .
            </p>
            <div>
              <p className="font-medium text-slate-800">1. Timski Elo</p>
              <p className="mt-1">
                Svi u ekipi dobiju isti pomak za pobjedu, poraz ili neriješeno.
                Ovisi o snazi protivnika (prosječni rating ekipe), ne o razlici
                golova — 5:0 i 5:4 daju isti Elo pomak.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-800">2. Osobni doprinos</p>
              <p className="mt-1">
                Na Elo se dodaje osobni rezultat iz te utakmice:
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>
                  <strong>Gol</strong> — prva 4 gola u utakmici po{" "}
                  <strong>+2</strong>, svaki dalje po <strong>+1</strong> (npr.
                  4 gola = +8).
                </li>
                <li>
                  <strong>Asistencija</strong> — <strong>+1</strong> po
                  asistenciji.
                </li>
                <li>
                  <strong>Autogol</strong> — <strong>−1</strong> onome tko ga
                  upiše.
                </li>
                <li>
                  <strong>Golman</strong> — bodovi po broju primljenih dok je na
                  golu (uključujući zamjene): 0–2 → +2, 3–4 → +1, 5–6 → 0, 7–9 →
                  −1, 10–12 → −2, 13+ → −3. Ne ulazi u timsku kaznu ispod.
                </li>
                <li>
                  <strong>Ostali u ekipi</strong> — −⌊primljenih / 4⌋, najviše
                  −3 (4–7 → −1, 8–11 → −2, 12+ → −3), da se „samo napad“ i
                  propusna obrana osjeti i kod igrača iz polja.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-slate-800">3. Gornja granica</p>
              <p className="mt-1">
                Zbroj osobnog doprinosa je ograničen na{" "}
                <strong>±12</strong> po utakmici, da jedan veliki učinak ne
                razvuče ljestvicu.
              </p>
            </div>
          </div>
        </details>
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
                <span
                  className={
                    "min-w-0 flex-1 truncate text-right text-sm font-semibold uppercase " +
                    teamNameOnDarkClass("A")
                  }
                >
                  {b.labelA}
                </span>
                <span className="text-4xl font-bold tabular-nums">
                  {b.game.score_a} : {b.game.score_b}
                </span>
                <span
                  className={
                    "min-w-0 flex-1 truncate text-left text-sm font-semibold uppercase " +
                    teamNameOnDarkClass("B")
                  }
                >
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

            <TeamsRatingExpand
              labelA={b.labelA}
              labelB={b.labelB}
              players={b.players}
              winner={b.winner}
            />

            {b.goals.length > 0 && (
              <GoalChronology
                terminId={terminId}
                canEditAssists={admin && withinAssistEditWindow(b.game.ended_at)}
                nicknames={nicknameMap}
                fillerNames={fillerNameMap}
                lineup={(lineup ?? [])
                  .filter((p) => p.game_id === b.game.id)
                  .map((p) => ({
                    userId: p.user_id,
                    fillerId: p.filler_id,
                    nickname: p.is_guest
                      ? (p.display_name ?? "Gost")
                      : nicknameOf(p.user_id),
                    team: p.team as Team,
                    isGuest: p.is_guest,
                  }))}
                goals={b.goals.map((e) => ({
                  id: e.id,
                  type: e.type as "goal" | "own_goal",
                  team: e.team as Team | null,
                  scorerId: e.scorer_id,
                  scorerFillerId: e.scorer_filler_id,
                  assistId: e.assist_id,
                  assistFillerId: e.assist_filler_id,
                  elapsedSeconds: e.elapsed_seconds,
                }))}
              />
            )}
          </section>
        ))
      )}

      {gameBlocks.length > 0 && (
        <section className="mt-8">
          <ShareButton text={shareText} />
        </section>
      )}

      <MatchDescription
        grupaId={grupaId}
        terminId={terminId}
        description={match.description}
        admin={admin}
      />

      <ActivityForm
        grupaId={grupaId}
        terminId={terminId}
        canEdit={canEdit}
        defaults={myActivity}
        players={activityPlayers}
      />

      {admin && (
        <form action={deleteMatch} className="mt-10 border-t border-slate-200 pt-6">
          <input type="hidden" name="groupId" value={grupaId} />
          <input type="hidden" name="matchId" value={terminId} />
          <SubmitButton
            pendingLabel="Brišem…"
            className="flex h-12 w-full items-center justify-center rounded-lg border-2
                       border-red-600 bg-white text-sm font-semibold text-red-700
                       transition active:scale-[0.98] disabled:opacity-70"
          >
            Obriši termin
          </SubmitButton>
          <p className="mt-2 text-sm text-slate-500">
            Trajno briše termin i događaje. Rating s ovog termina se vraća
            (ako nema novijih odigranih utakmica).
          </p>
        </form>
      )}
    </div>
  );
}
