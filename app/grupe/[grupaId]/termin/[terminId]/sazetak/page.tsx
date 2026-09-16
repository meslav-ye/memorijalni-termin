import { notFound, redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { getMatchSummary } from "@/lib/data/match-summary";
import { getMembership, getUser } from "@/lib/data/user";
import { formatMatchDateTime } from "@/lib/format";
import { formatClock } from "@/lib/domain/timer";
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
  if (!user) redirect("/prijava");

  const [membership, summary] = await Promise.all([
    getMembership(grupaId),
    getMatchSummary(grupaId, terminId),
  ]);

  if (membership?.status !== "active") notFound();
  const admin = membership.role === "admin";

  if (summary.kind === "missing") notFound();
  if (summary.kind === "not_finished") {
    redirect(`/grupe/${grupaId}/termin/${terminId}`);
  }

  const data = summary.data;
  const { match, gameBlocks } = data;
  const canEdit = data.allUserIds.includes(user.id);
  const myActivity = data.activityByUser[user.id] ?? null;

  return (
    <div>
      <SoftLink href={`/grupe/${grupaId}`}>← Natrag na termine</SoftLink>

      <header className="mt-4 text-center">
        <p className="text-sm text-slate-500">{formatMatchDateTime(match.startsAt)}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight">
          {gameBlocks.length === 0
            ? "Nema završenih utakmica"
            : gameBlocks.length === 1
              ? "1 utakmica"
              : `${gameBlocks.length} utakmice`}
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
                  golu (uključujući zamjene): 0–2 → +3, 3–4 → +2, 5–6 → +1, 7–9 →
                  0, 10–12 → −1, 13–15 → −2, 16+ → −3. Ne ulazi u „Obrana ekipe“
                  ispod.
                </li>
                <li>
                  <strong>Obrana ekipe</strong> — −⌊primljenih / 4⌋, najviše
                  −3 (4–7 → −1, 8–11 → −2, 12+ → −3), samo za igrače iz polja
                  (ne golmana), da se „samo napad“ i propusna obrana osjeti.
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
                nicknames={data.nicknameMap}
                fillerNames={data.fillerNameMap}
                lineup={b.chronologyLineup}
                goals={b.goals}
              />
            )}
          </section>
        ))
      )}

      {gameBlocks.length > 0 && (
        <section className="mt-8">
          <ShareButton text={data.shareText} />
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
        players={data.activityPlayers}
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
