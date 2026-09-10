import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SoftLink } from "@/components/ui/SoftLink";
import { softControlClassName } from "@/components/ui/softControl";
import { createClient } from "@/lib/supabase/server";
import { getMembership, getUser } from "@/lib/data/user";
import { formatMatchDateTime } from "@/lib/format";
import { splitSignups } from "@/lib/domain/waitlist";
import { fillStatus, type FillTone } from "@/lib/domain/fill";
import {
  canStart,
  earliestStartAt,
  MINUTES_BEFORE_START,
} from "@/lib/domain/startability";
import { membersNotSignedUp } from "@/lib/domain/admin-signup";
import {
  adminWithdrawFromMatch,
  withdrawFromMatch,
  cancelMatch,
  deleteMatch,
  pauseSeries,
  resumeSeries,
  signUpForMatch,
} from "../actions";
import { AdminAddSignups } from "./AdminAddSignups";
import { StartButton } from "./StartButton";
import { AddToCalendar } from "./AddToCalendar";
import { SubmitButton } from "@/components/SubmitButton";
import { BusyLink } from "@/components/BusyLink";
import {
  DEFAULT_MATCH_DURATION_MINUTES,
  REMINDER_MINUTES_BEFORE,
  buildGoogleCalendarUrl,
  buildIcs,
} from "@/lib/domain/calendar-event";
import { formatShortDate } from "@/lib/format";

const FILL_TONE_COLOR: Record<FillTone, string> = {
  low: "border-amber-200 bg-amber-50 text-amber-900",
  enough: "border-emerald-200 bg-emerald-50 text-emerald-900",
  full: "border-slate-200 bg-slate-100 text-slate-700",
};

export default async function MatchPage({
  params,
}: PageProps<"/grupe/[grupaId]/termin/[terminId]">) {
  const { grupaId, terminId } = await params;

  const user = await getUser();
  const supabase = await createClient();
  if (!user) redirect("/prijava");

  const membership = await getMembership(grupaId);

  if (membership?.status !== "active") notFound();
  const admin = membership.role === "admin";

  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, starts_at, capacity, min_players, status, notes, location_text, series_id, locations(name, address, maps_url)",
    )
    .eq("id", terminId)
    .maybeSingle();

  if (!match) notFound();

  // Finished sessions open on the summary — signup lists are no longer useful.
  if (match.status === "zavrsen") {
    redirect(`/grupe/${grupaId}/termin/${terminId}/sazetak`);
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", grupaId)
    .maybeSingle();

  let seriesPaused: boolean | null = null;
  if (match.series_id) {
    const { data: series } = await supabase
      .from("match_series")
      .select("paused_at")
      .eq("id", match.series_id)
      .maybeSingle();
    seriesPaused = series ? series.paused_at !== null : null;
  }

  const { data: signups } = await supabase
    .from("match_signups")
    .select("user_id, signed_up_at, manual_order, cancelled_at")
    .eq("match_id", terminId);

  const { confirmed, waitlist } = splitSignups(
    (signups ?? []).map((p) => ({
      userId: p.user_id,
      signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order,
      cancelledAt: p.cancelled_at,
    })),
    match.capacity,
  );

  const activeSignupIds = [...confirmed, ...waitlist];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, is_goalkeeper")
    .in("id", activeSignupIds.length ? activeSignupIds : ["-"]);

  const nicknameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.nickname || "(bez nadimka)";
  const isGoalkeeper = (id: string) =>
    profiles?.find((p) => p.id === id)?.is_goalkeeper ?? false;

  let addableMembers: { userId: string; nickname: string }[] = [];
  if (admin && match.status === "najavljen") {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("user_id, profiles(nickname)")
      .eq("group_id", grupaId)
      .eq("status", "active");

    addableMembers = membersNotSignedUp(
      (memberships ?? []).map((m) => ({
        userId: m.user_id,
        nickname: m.profiles?.nickname || "(bez nadimka)",
      })),
      activeSignupIds,
    );
  }

  const fill = fillStatus(confirmed.length, match.min_players, match.capacity);
  const iAmIn = confirmed.includes(user.id);
  const iAmWaiting = waitlist.includes(user.id);
  const signedUp = iAmIn || iAmWaiting;
  const openForSignups = match.status === "najavljen";

  const location = match.locations;
  const locationForCalendar = [location?.name, location?.address]
    .filter(Boolean)
    .join(", ") || match.location_text || "";

  const showCalendar = match.status !== "otkazan" && fill.tone !== "low";

  const startsAt = new Date(match.starts_at);
  const calendarTitle = `${group?.name ?? "Termin"} — ${formatShortDate(match.starts_at)}`;
  const calendarDescription = [
    group?.name ? `Grupa: ${group.name}` : null,
    match.notes?.trim() || null,
    `Otvori termin: /grupe/${grupaId}/termin/${terminId}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ics = showCalendar
    ? buildIcs({
        uid: `${terminId}@memorijalni-termin`,
        title: calendarTitle,
        location: locationForCalendar,
        description: calendarDescription,
        startsAt,
        durationMinutes: DEFAULT_MATCH_DURATION_MINUTES,
        reminderMinutesBefore: REMINDER_MINUTES_BEFORE,
      })
    : "";
  const googleUrl = showCalendar
    ? buildGoogleCalendarUrl({
        title: calendarTitle,
        location: locationForCalendar,
        description: calendarDescription,
        startsAt,
        durationMinutes: DEFAULT_MATCH_DURATION_MINUTES,
      })
    : "";

  // Live match is started and run by someone in the lineup, not necessarily admin.
  const { data: myLineup } = await supabase
    .from("match_lineup")
    .select("user_id")
    .eq("match_id", terminId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const iAmInLineup = Boolean(myLineup);
  const mayStart = canStart(match.starts_at, new Date());

  return (
    <div className="pb-28">
      <SoftLink href={`/grupe/${grupaId}`}>← Natrag na termine</SoftLink>

      <header className="mt-4">
        <h2 className="text-xl font-bold tracking-tight">
          {formatMatchDateTime(match.starts_at)}
        </h2>

        <p className="mt-1 text-slate-600">
          {location?.maps_url ? (
            <a
              href={location.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {location.name}
            </a>
          ) : (
            (location?.name ?? match.location_text ?? "Lokacija nije upisana")
          )}
          {location?.address && (
            <span className="block text-sm text-slate-500">{location.address}</span>
          )}
        </p>

        {match.notes && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {match.notes}
          </p>
        )}
      </header>

      {match.status === "otkazan" ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center font-medium text-red-800">
          Termin je otkazan.
        </div>
      ) : (
        <div className={`mt-6 rounded-lg border p-4 text-center font-medium ${FILL_TONE_COLOR[fill.tone]}`}>
          {fill.label}
        </div>
      )}

      {showCalendar && (
        <AddToCalendar
          ics={ics}
          fileName={`termin-${formatShortDate(match.starts_at).replace(/\./g, "")}.ics`}
          googleUrl={googleUrl}
        />
      )}

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dolaze ({confirmed.length}/{match.capacity})
        </h3>
        {confirmed.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            Nitko se još nije prijavio.
          </p>
        ) : (
          <ol className="space-y-1">
            {confirmed.map((id, i) => (
              <li
                key={id}
                className={
                  "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 " +
                  (id === user.id ? "ring-2 ring-marka/15" : "")
                }
              >
                <span className="w-5 text-right text-sm tabular-nums text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1 font-medium">{nicknameOf(id)}</span>
                {isGoalkeeper(id) && <span title="Igra golmana">🧤</span>}
                {admin && openForSignups && (
                  <form action={adminWithdrawFromMatch}>
                    <input type="hidden" name="groupId" value={grupaId} />
                    <input type="hidden" name="matchId" value={terminId} />
                    <input type="hidden" name="userId" value={id} />
                    <SubmitButton
                      pendingLabel="…"
                      className="text-sm text-red-700 underline underline-offset-4"
                    >
                      Odjavi
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {waitlist.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Lista čekanja ({waitlist.length})
          </h3>
          <ol className="space-y-1">
            {waitlist.map((id, i) => (
              <li
                key={id}
                className={
                  "flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 " +
                  (id === user.id ? "ring-2 ring-amber-400/40" : "")
                }
              >
                <span className="w-5 text-right text-sm tabular-nums text-slate-400">
                  {confirmed.length + i + 1}
                </span>
                <span className="min-w-0 flex-1 font-medium">{nicknameOf(id)}</span>
                {isGoalkeeper(id) && <span title="Igra golmana">🧤</span>}
                {admin && openForSignups && (
                  <form action={adminWithdrawFromMatch}>
                    <input type="hidden" name="groupId" value={grupaId} />
                    <input type="hidden" name="matchId" value={terminId} />
                    <input type="hidden" name="userId" value={id} />
                    <SubmitButton
                      pendingLabel="…"
                      className="text-sm text-red-700 underline underline-offset-4"
                    >
                      Odjavi
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {admin && openForSignups && addableMembers.length > 0 && (
        <AdminAddSignups
          groupId={grupaId}
          matchId={terminId}
          members={addableMembers}
        />
      )}

      {/* Anyone in the lineup can start live, but only half an hour before
          kickoff. Before that the button is NOT shown — better than the user
          tapping it and getting a rejection. */}
      {iAmInLineup &&
        (match.status === "zakljucan" || match.status === "najavljen") &&
        (mayStart ? (
          <StartButton grupaId={grupaId} terminId={terminId} alreadyLive={false} />
        ) : (
          <p className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
            Termin ne kreće sam — pokreće ga netko od igrača, a to je moguće{" "}
            <strong>{MINUTES_BEFORE_START} minuta prije početka</strong>, od{" "}
            {formatMatchDateTime(earliestStartAt(match.starts_at).toISOString())}.
          </p>
        ))}

      {match.status === "u_tijeku" && (
        <StartButton grupaId={grupaId} terminId={terminId} alreadyLive />
      )}

      {match.status !== "otkazan" && (
        <BusyLink
          href={`/grupe/${grupaId}/termin/${terminId}/ekipe`}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-lg
                     border border-slate-300 bg-white text-sm font-semibold
                     transition active:scale-[0.98] hover:border-slate-400"
        >
          Ekipe
        </BusyLink>
      )}

      {admin &&
        (match.status === "najavljen" || match.status === "zakljucan") && (
          <form action={cancelMatch} className="mt-10 border-t border-slate-200 pt-6">
            <input type="hidden" name="groupId" value={grupaId} />
            <input type="hidden" name="matchId" value={terminId} />
            <SubmitButton
              pendingLabel="Otkazujem…"
              className="flex h-12 w-full items-center justify-center rounded-lg border-2
                         border-red-600 bg-white text-sm font-semibold text-red-700
                         transition active:scale-[0.98] disabled:opacity-70"
            >
              Otkaži ovaj termin
            </SubmitButton>
            <p className="mt-1 text-sm text-slate-500">
              Otkazuje samo ovaj tjedan
              {match.series_id ? ", ne cijeli stalni termin." : "."}
            </p>
          </form>
        )}

      {admin && match.status === "otkazan" && (
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
            Trajno briše otkazani termin.
          </p>
        </form>
      )}

      {admin && match.series_id && seriesPaused !== null && (
        <form
          action={seriesPaused ? resumeSeries : pauseSeries}
          className="mt-4"
        >
          <input type="hidden" name="groupId" value={grupaId} />
          <input type="hidden" name="seriesId" value={match.series_id} />
          <input type="hidden" name="matchId" value={terminId} />
          <SubmitButton pendingLabel="…" className={softControlClassName}>
            {seriesPaused ? "Uključi stalni termin" : "Ugasi stalni termin"}
          </SubmitButton>
          <p className="mt-1 text-sm text-slate-500">
            {seriesPaused
              ? "Ponovno će se stvarati tjedne pojave."
              : "Prestaje stvarati nove tjedne pojave (ljetna pauza)."}
          </p>
        </form>
      )}

      {/* Primary button sticks to the bottom — thumb hits it without moving the hand. */}
      {openForSignups && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <form action={signedUp ? withdrawFromMatch : signUpForMatch}>
              <input type="hidden" name="groupId" value={grupaId} />
              <input type="hidden" name="matchId" value={terminId} />
              <SubmitButton
                pendingLabel={signedUp ? "Odjavljujem…" : "Prijavljujem…"}
                className={
                  "h-14 w-full rounded-lg text-base font-semibold transition active:scale-[0.98] " +
                  (signedUp
                    ? "border-2 border-red-600 bg-white text-red-700"
                    : "bg-marka text-white")
                }
              >
                {signedUp
                  ? "Odustajem"
                  : fill.freeSlots === 0
                    ? "Stavi me na listu čekanja"
                    : "Dolazim"}
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
