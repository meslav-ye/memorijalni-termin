"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatClock, elapsedSeconds } from "@/lib/domain/timer";
import type { MatchTimerState, Team } from "@/lib/domain/types";
import { Stoperica } from "@/components/termin/Stoperica";
import { IgracGumb } from "@/components/termin/IgracGumb";
import { AsistencijaTraka, type CekaAsistenciju } from "@/components/termin/AsistencijaTraka";
import {
  addAssist,
  resumeMatch,
  pauseMatch,
  undoEvent,
  changeGoalkeeper,
  recordOwnGoal,
  recordGoal,
  finishMatch,
} from "./actions";

export type IgracPostave = {
  userId: string;
  nadimak: string;
  team: Team;
  jeGolman: boolean;
};

export type Dogadjaj = {
  id: string;
  type: string;
  team: Team | null;
  scorerId: string | null;
  assistId: string | null;
  elapsedSeconds: number;
  createdAt: string;
  deletedAt: string | null;
};

export type StanjeTermina = MatchTimerState & { status: string };

/** Pretplata na promjene stanja mreze, za useSyncExternalStore. */
function pretplatiNaMrezu(promijenilo: () => void) {
  window.addEventListener("online", promijenilo);
  window.addEventListener("offline", promijenilo);
  return () => {
    window.removeEventListener("online", promijenilo);
    window.removeEventListener("offline", promijenilo);
  };
}

export function EkranUzivo({
  grupaId,
  terminId,
  pocetnaPostava,
  pocetniDogadjaji,
  pocetnoStanje,
}: {
  grupaId: string;
  terminId: string;
  pocetnaPostava: IgracPostave[];
  pocetniDogadjaji: Dogadjaj[];
  pocetnoStanje: StanjeTermina;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [postava, postaviPostavu] = useState(pocetnaPostava);
  const [dogadjaji, postaviDogadjaje] = useState(pocetniDogadjaji);
  const [stanje, postaviStanje] = useState(pocetnoStanje);

  const [ceka, postaviCeka] = useState<CekaAsistenciju | null>(null);
  const [duplikat, postaviDuplikat] = useState<{
    strijelac: IgracPostave;
    sekundiPrije: number;
  } | null>(null);
  const [greska, postaviGresku] = useState<string | null>(null);
  const [radim, postaviRadim] = useState(false);

  // --- Dohvat svjezih podataka ---------------------------------------------

  const osvjezi = useCallback(async () => {
    const [{ data: dog }, { data: post }, { data: term }] = await Promise.all([
      supabase
        .from("match_events")
        .select("id, type, team, scorer_id, assist_id, elapsed_seconds, created_at, deleted_at")
        .eq("match_id", terminId)
        .order("created_at", { ascending: false }),
      supabase
        .from("match_lineup")
        .select("user_id, team, is_goalkeeper")
        .eq("match_id", terminId),
      supabase
        .from("matches")
        .select("status, started_at, paused_at, total_paused_seconds")
        .eq("id", terminId)
        .maybeSingle(),
    ]);

    if (dog) {
      postaviDogadjaje(
        dog.map((e) => ({
          id: e.id,
          type: e.type,
          team: e.team as Team | null,
          scorerId: e.scorer_id,
          assistId: e.assist_id,
          elapsedSeconds: e.elapsed_seconds,
          createdAt: e.created_at,
          deletedAt: e.deleted_at,
        })),
      );
    }

    if (post) {
      postaviPostavu((prethodna) =>
        prethodna.map((p) => ({
          ...p,
          team: (post.find((x) => x.user_id === p.userId)?.team ?? p.team) as Team,
          jeGolman: post.find((x) => x.user_id === p.userId)?.is_goalkeeper ?? false,
        })),
      );
    }

    if (term) {
      postaviStanje({
        status: term.status,
        startedAt: term.started_at,
        pausedAt: term.paused_at,
        totalPausedSeconds: term.total_paused_seconds,
      });
    }
  }, [supabase, terminId]);

  // --- Ziva sinkronizacija --------------------------------------------------

  useEffect(() => {
    const kanal = supabase
      .channel(`termin:${terminId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `match_id=eq.${terminId}` },
        () => void osvjezi(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_lineup", filter: `match_id=eq.${terminId}` },
        () => void osvjezi(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${terminId}` },
        () => void osvjezi(),
      )
      .subscribe((status) => {
        // Poziva se i pri prvom spajanju i pri svakom ponovnom spajanju nakon
        // prekida veze. Tu povlacimo sve sto se dogodilo dok nismo slusali —
        // zato osvjezavanje ne treba zaseban efekt nad stanjem mreze.
        if (status === "SUBSCRIBED") void osvjezi();
      });

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [supabase, terminId, osvjezi]);

  // --- Stanje mreze ---------------------------------------------------------

  // Stanje veze je vanjski izvor koji se mijenja mimo Reacta, pa se cita
  // preko useSyncExternalStore. Rucni useEffect + setState bi ovdje radio
  // dodatni render pri svakom ucitavanju i nije preporucen obrazac.
  const naMrezi = useSyncExternalStore(
    pretplatiNaMrezu,
    () => navigator.onLine,
    () => true, // na serveru pretpostavljamo da veza postoji
  );

  // Osvjezavanje na povratak veze NE ide ovdje — radi ga callback Realtime
  // pretplate gore, koji se okine na svako (ponovno) spajanje. `naMrezi`
  // sluzi samo za traku upozorenja.

  // --- Izvedene vrijednosti -------------------------------------------------

  const vazeci = dogadjaji.filter((e) => e.deletedAt === null);
  const golovi = vazeci.filter((e) => e.type === "goal" || e.type === "own_goal");

  const rezultatA = golovi.filter((e) => e.team === "A").length;
  const rezultatB = golovi.filter((e) => e.team === "B").length;

  const golovaIgraca = (userId: string) =>
    vazeci.filter((e) => e.type === "goal" && e.scorerId === userId).length;

  const nadimak = (userId: string | null) =>
    postava.find((p) => p.userId === userId)?.nadimak ?? "?";

  const ekipaA = postava.filter((p) => p.team === "A");
  const ekipaB = postava.filter((p) => p.team === "B");

  const uTijeku = stanje.status === "u_tijeku";
  const zakljucano = !uTijeku || radim;

  function trenutnoProteklo() {
    return elapsedSeconds(stanje, new Date());
  }

  // Stabilna referenca: AsistencijaTraka je koristi kao ovisnost odbrojavanja.
  const zatvoriTraku = useCallback(() => postaviCeka(null), []);

  // --- Radnje ---------------------------------------------------------------

  async function nakonPromjene() {
    await osvjezi();
    router.refresh();
  }

  async function gol(igrac: IgracPostave, potvrdjen = false) {
    postaviGresku(null);
    postaviRadim(true);

    const proteklo = trenutnoProteklo();
    const odgovor = await recordGoal(terminId, igrac.userId, igrac.team, proteklo, potvrdjen);

    postaviRadim(false);

    if ("error" in odgovor) {
      postaviGresku(odgovor.error);
      return;
    }

    if ("possibleDuplicate" in odgovor) {
      postaviDuplikat({
        strijelac: igrac,
        sekundiPrije: odgovor.possibleDuplicate.secondsBefore,
      });
      return;
    }

    postaviCeka({
      dogadjajId: odgovor.eventId,
      strijelac: igrac.nadimak,
      proteklo,
      suigraci: postava
        .filter((p) => p.team === igrac.team && p.userId !== igrac.userId)
        .map((p) => ({ userId: p.userId, nadimak: p.nadimak })),
    });

    await osvjezi();
  }

  async function autogol(igrac: IgracPostave) {
    postaviGresku(null);
    postaviRadim(true);
    const odgovor = await recordOwnGoal(terminId, igrac.userId, igrac.team, trenutnoProteklo());
    postaviRadim(false);

    if ("error" in odgovor) postaviGresku(odgovor.error);
    await nakonPromjene();
  }

  async function golman(igrac: IgracPostave) {
    postaviRadim(true);
    await changeGoalkeeper(terminId, igrac.userId, igrac.team, trenutnoProteklo());
    postaviRadim(false);
    await nakonPromjene();
  }

  async function ponisti(dogadjajId: string) {
    postaviRadim(true);
    await undoEvent(terminId, dogadjajId);
    postaviRadim(false);
    postaviCeka(null);
    await nakonPromjene();
  }

  async function odaberiAsistenta(asistentId: string | null) {
    if (!ceka) return;
    const id = ceka.dogadjajId;
    postaviCeka(null);
    await addAssist(terminId, id, asistentId);
    await nakonPromjene();
  }

  async function pauzaIliNastavak() {
    postaviRadim(true);
    if (stanje.pausedAt) await resumeMatch(terminId);
    else await pauseMatch(terminId);
    postaviRadim(false);
    await nakonPromjene();
  }

  const [potvrdaZavrsetka, postaviPotvrdu] = useState(false);

  async function zavrsi() {
    postaviRadim(true);
    const odgovor = await finishMatch(grupaId, terminId);
    postaviRadim(false);

    if ("error" in odgovor) {
      postaviGresku(odgovor.error);
      postaviPotvrdu(false);
      return;
    }
    router.push(`/grupe/${grupaId}/termin/${terminId}/sazetak`);
  }

  // --- Prikaz ---------------------------------------------------------------

  return (
    <div className="pb-56">
      {!naMrezi && (
        <p className="mb-3 rounded-lg bg-amber-500 px-3 py-2 text-center text-sm font-semibold text-white">
          Nema veze — unosi neće proći dok se ne vratiš na mrežu
        </p>
      )}

      {greska && (
        <p role="alert" className="mb-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
          {greska}
        </p>
      )}

      {/* Rezultat i stoperica */}
      <div className="rounded-xl bg-marka p-4 text-center text-white">
        <div className="flex items-center justify-center gap-4">
          <span className="flex-1 text-right text-sm font-semibold uppercase text-slate-400">
            Ekipa A
          </span>
          <span className="text-4xl font-bold tabular-nums" aria-label="Rezultat">
            {rezultatA} : {rezultatB}
          </span>
          <span className="flex-1 text-left text-sm font-semibold uppercase text-slate-400">
            Ekipa B
          </span>
        </div>

        <div className="mt-2 flex justify-center">
          <Stoperica stanje={stanje} />
        </div>

        {uTijeku && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={pauzaIliNastavak}
              disabled={radim}
              className="h-12 flex-1 rounded-lg border border-slate-600 text-sm font-semibold
                         transition active:scale-[0.98] disabled:opacity-50"
            >
              {stanje.pausedAt ? "Nastavi" : "Pauza"}
            </button>
            <button
              type="button"
              onClick={() => postaviPotvrdu(true)}
              disabled={radim}
              className="h-12 flex-1 rounded-lg bg-white text-sm font-semibold text-slate-900
                         transition active:scale-[0.98] disabled:opacity-50"
            >
              Završi
            </button>
          </div>
        )}
      </div>

      {!uTijeku && (
        <p className="mt-3 rounded-lg bg-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700">
          Termin je završen. Unos je zaključan.
        </p>
      )}

      {/* Igraci */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {ekipaA.map((p) => (
            <IgracGumb
              key={p.userId}
              nadimak={p.nadimak}
              golovi={golovaIgraca(p.userId)}
              jeGolman={p.jeGolman}
              onemoguceno={zakljucano}
              onGol={() => void gol(p)}
              onAutogol={() => void autogol(p)}
              onGolman={() => void golman(p)}
            />
          ))}
        </div>
        <div className="space-y-2">
          {ekipaB.map((p) => (
            <IgracGumb
              key={p.userId}
              nadimak={p.nadimak}
              golovi={golovaIgraca(p.userId)}
              jeGolman={p.jeGolman}
              onemoguceno={zakljucano}
              onGol={() => void gol(p)}
              onAutogol={() => void autogol(p)}
              onGolman={() => void golman(p)}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Dodir = gol · Dugi pritisak = autogol · 🧤 = golman
      </p>

      {/* Kronologija */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Što se dogodilo
        </h3>

        {vazeci.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            Još nema golova.
          </p>
        ) : (
          <ul className="space-y-1">
            {vazeci.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="w-12 shrink-0 tabular-nums text-slate-400">
                  {formatClock(e.elapsedSeconds)}
                </span>

                <span className="min-w-0 flex-1">
                  {e.type === "goal" && (
                    <>
                      ⚽ <span className="font-medium">{nadimak(e.scorerId)}</span>
                      {e.assistId && (
                        <span className="text-slate-500"> ({nadimak(e.assistId)})</span>
                      )}
                    </>
                  )}
                  {e.type === "own_goal" && (
                    <>
                      🥅 <span className="font-medium">{nadimak(e.scorerId)}</span>
                      <span className="text-slate-500"> — autogol</span>
                    </>
                  )}
                  {e.type === "keeper_change" && (
                    <>
                      🧤 <span className="font-medium">{nadimak(e.scorerId)}</span>
                      <span className="text-slate-500"> ide u gol</span>
                    </>
                  )}
                </span>

                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  {e.team}
                </span>

                {uTijeku && (
                  <button
                    type="button"
                    onClick={() => void ponisti(e.id)}
                    disabled={radim}
                    className="h-8 w-8 shrink-0 rounded text-slate-400 transition
                               active:scale-90 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Poništi ovaj unos"
                    title="Poništi"
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Traka za asistenciju */}
      {ceka && (
        <AsistencijaTraka
          key={ceka.dogadjajId}
          ceka={ceka}
          onOdabir={(id) => void odaberiAsistenta(id)}
          onPonisti={() => void ponisti(ceka.dogadjajId)}
          onIstek={zatvoriTraku}
        />
      )}

      {/* Upozorenje na mogući dupli unos */}
      {duplikat && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Je li ovo drugi gol?</h4>
            <p className="mt-2 text-slate-600">
              Netko je već upisao gol za <strong>{duplikat.strijelac.nadimak}</strong> prije{" "}
              {duplikat.sekundiPrije} s.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const igrac = duplikat.strijelac;
                  postaviDuplikat(null);
                  void gol(igrac, true);
                }}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white
                           transition active:scale-[0.98]"
              >
                Da, upiši
              </button>
              <button
                type="button"
                onClick={() => postaviDuplikat(null)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold
                           transition active:scale-[0.98]"
              >
                Ne, odustani
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Potvrda završetka */}
      {potvrdaZavrsetka && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-4">
          <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5">
            <h4 className="text-lg font-bold">Završiti termin?</h4>
            <p className="mt-2 text-slate-600">
              Nakon toga se statistika zaključava i golovi se više ne mogu unositi.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void zavrsi()}
                disabled={radim}
                className="h-12 flex-1 rounded-lg bg-marka font-semibold text-white
                           transition active:scale-[0.98] disabled:opacity-50"
              >
                Da, završi
              </button>
              <button
                type="button"
                onClick={() => postaviPotvrdu(false)}
                className="h-12 flex-1 rounded-lg border border-slate-300 font-semibold
                           transition active:scale-[0.98]"
              >
                Odustani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
