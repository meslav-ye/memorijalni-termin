import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { getCurrentGame } from "@/lib/data/games";
import type { Team } from "@/lib/domain/types";
import { disambiguateNicknames } from "@/lib/domain/nickname";
import { teamDisplayName } from "@/lib/domain/team-name";
import { LiveScreen, type LiveEvent, type LineupPlayer } from "./LiveScreen";

export default async function LivePage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/uzivo">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);
  if (membership?.status !== "active") notFound();

  const { data: match } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", terminId)
    .maybeSingle();
  if (!match) notFound();

  if (match.status !== "u_tijeku" && match.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const game = await getCurrentGame(terminId, supabase);
  if (!game) notFound();

  const { data: lineupRows } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("game_id", game.id);

  const ids = (lineupRows ?? []).map((p) => p.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, full_name, is_goalkeeper")
    .in("id", ids.length ? ids : ["-"]);

  const labels = disambiguateNicknames(
    (lineupRows ?? []).map((p) => {
      const profile = profiles?.find((x) => x.id === p.user_id);
      return {
        userId: p.user_id,
        nickname: profile?.nickname || "?",
        fullName: profile?.full_name ?? null,
      };
    }),
  );

  const lineup: LineupPlayer[] = (lineupRows ?? []).map((p) => ({
    userId: p.user_id,
    nickname: labels.get(p.user_id) ?? "?",
    team: p.team as Team,
    isGoalkeeper: p.is_goalkeeper,
    profileIsGoalkeeper: profiles?.find((x) => x.id === p.user_id)?.is_goalkeeper ?? false,
  }));

  const { data: eventRows } = await supabase
    .from("match_events")
    .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
    .eq("game_id", game.id)
    .order("created_at", { ascending: false });

  const events: LiveEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    team: e.team as Team | null,
    scorerId: e.scorer_id,
    assistId: e.assist_id,
    elapsedSeconds: e.elapsed_seconds,
    createdAt: e.created_at,
    deletedAt: e.deleted_at,
  }));

  return (
    <div>
      <Link
        href={
          match.status === "zavrsen"
            ? `/grupe/${grupaId}/termin/${terminId}/sazetak`
            : `/grupe/${grupaId}/termin/${terminId}`
        }
        className="mb-4 inline-block text-sm text-slate-500 underline underline-offset-4"
      >
        {match.status === "zavrsen" ? "← Natrag na sažetak" : "← Natrag na termin"}
      </Link>

      <LiveScreen
        grupaId={grupaId}
        terminId={terminId}
        gameId={game.id}
        initialLineup={lineup}
        initialEvents={events}
        initialState={{
          matchStatus: match.status,
          gameStatus: game.status,
          gameSeq: game.seq,
          startedAt: game.started_at,
          pausedAt: game.paused_at,
          endedAt: game.ended_at,
          totalPausedSeconds: game.total_paused_seconds,
        }}
        teamAName={teamDisplayName("A", game.team_a_name)}
        teamBName={teamDisplayName("B", game.team_b_name)}
      />
    </div>
  );
}
