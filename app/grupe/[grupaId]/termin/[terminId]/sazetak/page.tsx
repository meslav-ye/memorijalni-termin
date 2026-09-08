import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatShortDate, formatMatchDateTime } from "@/lib/format";
import { formatClock } from "@/lib/domain/timer";
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
    .select(
      "id, status, starts_at, score_a, score_b, started_at, ended_at, total_paused_seconds, location_text, team_a_name, team_b_name, locations(name)",
    )
    .eq("id", terminId)
    .maybeSingle();
  if (!match) notFound();

  if (match.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const { data: lineup } = await supabase
    .from("match_lineup")
    .select("user_id, team")
    .eq("match_id", terminId);

  const ids = (lineup ?? []).map((p) => p.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", ids.length ? ids : ["-"]);

  const { data: events } = await supabase
    .from("match_events")
    .select("type, team, scorer_id, assist_id, elapsed_seconds")
    .eq("match_id", terminId)
    .is("deleted_at", null)
    .in("type", ["goal", "own_goal"])
    .order("elapsed_seconds");

  const { data: history } = await supabase
    .from("rating_history")
    .select("user_id, rating_before, rating_after")
    .eq("match_id", terminId)
    .eq("scope", "group");

  const nicknameOf = (id: string | null) =>
    profiles?.find((p) => p.id === id)?.nickname || "?";

  const goals = events ?? [];

  const players = (lineup ?? []).map((p) => {
    const record = history?.find((r) => r.user_id === p.user_id);
    return {
      userId: p.user_id,
      nickname: nicknameOf(p.user_id),
      team: p.team as Team,
      goals: goals.filter((e) => e.type === "goal" && e.scorer_id === p.user_id).length,
      assists: goals.filter((e) => e.assist_id === p.user_id).length,
      ownGoals: goals.filter((e) => e.type === "own_goal" && e.scorer_id === p.user_id).length,
      delta: record ? record.rating_after - record.rating_before : null,
      rating: record?.rating_after ?? null,
    };
  });

  const winner =
    match.score_a > match.score_b ? "A" : match.score_b > match.score_a ? "B" : null;

  const duration =
    match.started_at && match.ended_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(match.ended_at).getTime() - new Date(match.started_at).getTime()) / 1000,
          ) - match.total_paused_seconds,
        )
      : null;

  const location = match.locations?.name ?? match.location_text ?? "";
  const labelA = teamDisplayName("A", match.team_a_name);
  const labelB = teamDisplayName("B", match.team_b_name);

  // WhatsApp text: short, readable, no links that break.
  const scorers = players
    .filter((i) => i.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .map((i) => `${i.nickname} ${i.goals}`)
    .join(", ");

  const shareText = [
    `Termin ${formatShortDate(match.starts_at)}${location ? `, ${location}` : ""}`,
    `${labelA} ${match.score_a} : ${match.score_b} ${labelB}`,
    scorers ? `⚽ ${scorers}` : "Bez golova.",
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
        <p className="text-sm text-slate-500">{formatMatchDateTime(match.starts_at)}</p>

        <div className="mt-3 rounded-xl bg-marka p-5 text-white">
          <div className="flex items-center justify-center gap-4">
            <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold uppercase text-slate-400">
              {labelA}
            </span>
            <span className="text-4xl font-bold tabular-nums">
              {match.score_a} : {match.score_b}
            </span>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold uppercase text-slate-400">
              {labelB}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {winner
              ? `Pobijedila ${winner === "A" ? labelA : labelB}`
              : "Neriješeno"}
            {duration !== null && ` · ${formatClock(duration)}`}
          </p>
        </div>
      </header>

      <section className="mt-6 flex gap-3">
        <TeamColumn side="A" label={labelA} players={players} winner={winner} />
        <TeamColumn side="B" label={labelB} players={players} winner={winner} />
      </section>

      {goals.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Kronologija
          </h3>
          <ul className="space-y-1">
            {goals.map((e, i) => (
              <li
                key={i}
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
                  {e.type === "own_goal" && <span className="text-slate-500"> — autogol</span>}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{e.team}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <ShareButton text={shareText} />
      </section>
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
                  "shrink-0 w-10 text-right text-xs font-semibold tabular-nums " +
                  (i.delta > 0 ? "text-emerald-700" : i.delta < 0 ? "text-red-600" : "text-slate-400")
                }
                title={`Rating: ${i.rating}`}
              >
                {i.delta > 0 ? `+${i.delta}` : i.delta}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
