import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatMatchDateTime } from "@/lib/format";
import { splitSignups } from "@/lib/domain/waitlist";
import { proposeTeams, movePlayer, setGoalkeeper } from "../../actions";

type LineupPlayerRow = {
  userId: string;
  nickname: string;
  rating: number;
  isGoalkeeper: boolean;
};

function TeamColumn({
  title,
  team,
  players,
  grupaId,
  terminId,
  arrow,
}: {
  title: string;
  team: "A" | "B";
  players: LineupPlayerRow[];
  grupaId: string;
  terminId: string;
  arrow: "→" | "←";
}) {
  const sum = players.reduce((s, p) => s + p.rating, 0);
  const average = players.length ? Math.round(sum / players.length) : 0;
  const hasGoalkeeper = players.some((p) => p.isGoalkeeper);

  return (
    <div className="flex-1">
      <div className="mb-2">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-slate-500">
          {players.length} {players.length === 1 ? "igrač" : "igrača"} · prosjek {average}
        </p>
      </div>

      {!hasGoalkeeper && players.length > 0 && (
        <p className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Nema golmana
        </p>
      )}

      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.userId}
            className={
              "flex items-center gap-1 rounded-lg border p-1 pl-2 " +
              // Goalkeeper must be obvious at a glance, not only after
              // inspecting the icon — so the whole row is colored.
              (p.isGoalkeeper
                ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400/40"
                : "border-slate-200 bg-white")
            }
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nickname}</span>

            <form action={setGoalkeeper}>
              <input type="hidden" name="groupId" value={grupaId} />
              <input type="hidden" name="matchId" value={terminId} />
              <input type="hidden" name="userId" value={p.userId} />
              <input type="hidden" name="ekipa" value={team} />
              <button
                title={p.isGoalkeeper ? "Skini oznaku golmana" : "Postavi za golmana"}
                aria-label={p.isGoalkeeper ? "Skini oznaku golmana" : "Postavi za golmana"}
                className={
                  "h-9 w-9 rounded text-base transition active:scale-95 " +
                  (p.isGoalkeeper ? "bg-emerald-100" : "opacity-30 hover:opacity-70")
                }
              >
                🧤
              </button>
            </form>

            <form action={movePlayer}>
              <input type="hidden" name="groupId" value={grupaId} />
              <input type="hidden" name="matchId" value={terminId} />
              <input type="hidden" name="userId" value={p.userId} />
              <input type="hidden" name="ekipa" value={team === "A" ? "B" : "A"} />
              <button
                title="Premjesti u drugu ekipu"
                aria-label={`Premjesti ${p.nickname} u drugu ekipu`}
                className="h-9 w-9 rounded border border-slate-200 text-sm text-slate-500
                           transition active:scale-95 hover:bg-slate-100"
              >
                {arrow}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function TeamsPage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]/ekipe">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);
  if (membership?.status !== "active") notFound();

  const { data: match } = await supabase
    .from("matches")
    .select("id, starts_at, capacity, status")
    .eq("id", terminId)
    .maybeSingle();
  if (!match) notFound();

  const { data: lineup } = await supabase
    .from("match_lineup")
    .select("user_id, team, is_goalkeeper")
    .eq("match_id", terminId);

  const { data: signups } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", terminId);

  const { confirmed } = splitSignups(
    (signups ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    match.capacity,
  );

  const allIds = [...new Set([...(lineup ?? []).map((p) => p.user_id), ...confirmed])];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", allIds.length ? allIds : ["-"]);

  const { data: ratings } = await supabase
    .from("player_ratings")
    .select("user_id, rating")
    .eq("group_id", grupaId)
    .in("user_id", allIds.length ? allIds : ["-"]);

  const makePlayer = (userId: string, isGoalkeeper: boolean): LineupPlayerRow => ({
    userId,
    nickname: profiles?.find((p) => p.id === userId)?.nickname || "(bez nadimka)",
    rating: ratings?.find((r) => r.user_id === userId)?.rating ?? 1000,
    isGoalkeeper,
  });

  const teamA = (lineup ?? [])
    .filter((p) => p.team === "A")
    .map((p) => makePlayer(p.user_id, p.is_goalkeeper));
  const teamB = (lineup ?? [])
    .filter((p) => p.team === "B")
    .map((p) => makePlayer(p.user_id, p.is_goalkeeper));

  const hasLineup = teamA.length + teamB.length > 0;
  const sumA = teamA.reduce((s, p) => s + p.rating, 0);
  const sumB = teamB.reduce((s, p) => s + p.rating, 0);

  // Signed up but not assigned — e.g. someone joined after teams were already set.
  const unassigned = confirmed.filter(
    (id) => !(lineup ?? []).some((p) => p.user_id === id),
  );

  return (
    <div>
      <Link
        href={`/grupe/${grupaId}/termin/${terminId}`}
        className="text-sm text-slate-500 underline underline-offset-4"
      >
        ← Natrag na termin
      </Link>

      <header className="mt-4 mb-6">
        <h2 className="text-lg font-bold tracking-tight">Ekipe</h2>
        <p className="text-sm text-slate-500">{formatMatchDateTime(match.starts_at)}</p>
      </header>

      {!hasLineup ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-medium">Ekipe još nisu složene</p>
          <p className="mt-1 text-sm text-slate-500">
            {confirmed.length === 0
              ? "Nitko se još nije prijavio."
              : `Prijavljenih: ${confirmed.length}. Aplikacija će razdvojiti golmane i poravnati ekipe.`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <TeamColumn
              title="Ekipa A"
              team="A"
              players={teamA}
              grupaId={grupaId}
              terminId={terminId}
              arrow="→"
            />
            <TeamColumn
              title="Ekipa B"
              team="B"
              players={teamB}
              grupaId={grupaId}
              terminId={terminId}
              arrow="←"
            />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Razlika u zbroju ratinga:{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {Math.abs(sumA - sumB)}
            </span>
          </p>
        </>
      )}

      {unassigned.length > 0 && hasLineup && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {unassigned.length}{" "}
          {unassigned.length === 1 ? "igrač se prijavio" : "igrača se prijavilo"} nakon
          slaganja ekipa. Promiješaj ponovno da uđu u postavu.
        </p>
      )}

      {confirmed.length > 0 && match.status !== "zavrsen" && match.status !== "otkazan" && (
        <form action={proposeTeams} className="mt-6">
          <input type="hidden" name="groupId" value={grupaId} />
          <input type="hidden" name="matchId" value={terminId} />
          <button
            className="h-14 w-full rounded-lg bg-marka text-base font-semibold text-white
                       transition active:scale-[0.98]"
          >
            {hasLineup ? "Promiješaj ponovno" : "Predloži ekipe"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        Ekipe smije mijenjati bilo tko iz grupe.
      </p>
    </div>
  );
}
