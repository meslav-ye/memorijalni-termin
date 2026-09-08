import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
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
    .select("id, status, started_at, paused_at, total_paused_seconds, team_a_name, team_b_name")
    .eq("id", terminId)
    .maybeSingle();
  if (!match) notFound();

  // This screen is only for matches that have started or finished.
  if (match.status !== "u_tijeku" && match.status !== "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const { data: lineupRows } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("match_id", terminId);

  const ids = (lineupRows ?? []).map((p) => p.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, full_name")
    .in("id", ids.length ? ids : ["-"]);

  // If two players share a nickname, the label gets a disambiguating
  // suffix (surname). Computed HERE on fetch so the live screen gets
  // ready text and does not need to know about collisions.
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
  }));

  const { data: eventRows } = await supabase
    .from("match_events")
    .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
    .eq("match_id", terminId)
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
        href={`/grupe/${grupaId}/termin/${terminId}`}
        className="mb-4 inline-block text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termin
      </Link>

      <LiveScreen
        grupaId={grupaId}
        terminId={terminId}
        initialLineup={lineup}
        initialEvents={events}
        initialState={{
          status: match.status,
          startedAt: match.started_at,
          pausedAt: match.paused_at,
          totalPausedSeconds: match.total_paused_seconds,
        }}
        teamAName={teamDisplayName("A", match.team_a_name)}
        teamBName={teamDisplayName("B", match.team_b_name)}
      />
    </div>
  );
}
