"use client";

import { useSyncExternalStore } from "react";
import { elapsedSeconds, formatClock } from "@/lib/domain/timer";
import type { MatchTimerState } from "@/lib/domain/types";

/**
 * Otkucaji sata kao vanjski izvor.
 *
 * Provjerava se 4 puta u sekundi da prijelaz bude tocan, ali se snimka
 * KVANTIZIRA na cijele sekunde — `getSnapshot` mora vracati stabilnu
 * vrijednost, inace React vrti render u krug. Posljedica: jedan render
 * po sekundi, koliko prikaz i treba.
 */
function pretplatiNaOtkucaje(promijenilo: () => void) {
  const id = setInterval(promijenilo, 250);
  return () => clearInterval(id);
}

const trenutnaSekunda = () => Math.floor(Date.now() / 1000);

/**
 * Stoperica se NE salje preko mreze. Svaki uredjaj je racuna sam iz
 * started_at / paused_at / total_paused_seconds, koje postavlja server —
 * pa svi pokazuju isto vrijeme, i onaj tko se spoji u 23. minuti vidi 23.
 */
export function Stoperica({ stanje }: { stanje: MatchTimerState }) {
  const sekunda = useSyncExternalStore(
    pretplatiNaOtkucaje,
    trenutnaSekunda,
    // Na serveru i pri hidraciji nema sata; prvi otkucaj odmah ispravi prikaz.
    () => 0,
  );

  const proteklo = sekunda === 0 ? 0 : elapsedSeconds(stanje, new Date(sekunda * 1000));

  return (
    <div
      className="stoperica text-5xl font-bold tabular-nums"
      role="timer"
      aria-label="Proteklo vrijeme"
    >
      {formatClock(proteklo)}
      {stanje.pausedAt && (
        <span className="ml-3 align-middle text-base font-semibold text-amber-600">
          PAUZA
        </span>
      )}
    </div>
  );
}
