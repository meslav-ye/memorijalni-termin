"use client";

import { useRef } from "react";

const DUGI_PRITISAK_MS = 600;

/**
 * Gumb igraca na ekranu uzivo.
 *
 *   obican dodir   -> gol
 *   dugi pritisak  -> autogol
 *   dodir na 🧤    -> promjena golmana
 *
 * Visina je 56 px jer se ovaj ekran koristi stojeci, jednom rukom, vani.
 */
export function IgracGumb({
  nadimak,
  golovi,
  jeGolman,
  onemoguceno,
  onGol,
  onAutogol,
  onGolman,
}: {
  nadimak: string;
  golovi: number;
  jeGolman: boolean;
  onemoguceno?: boolean;
  onGol: () => void;
  onAutogol: () => void;
  onGolman: () => void;
}) {
  const tajmer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dugiOkinut = useRef(false);

  function pocetak() {
    if (onemoguceno) return;
    dugiOkinut.current = false;
    tajmer.current = setTimeout(() => {
      dugiOkinut.current = true;
      // Kratka vibracija kao potvrda — na terenu se ekran cesto ni ne gleda.
      navigator.vibrate?.(40);
      onAutogol();
    }, DUGI_PRITISAK_MS);
  }

  function kraj() {
    if (tajmer.current) {
      clearTimeout(tajmer.current);
      tajmer.current = null;
    }
  }

  function klik() {
    if (onemoguceno) return;
    // Nakon dugog pritiska preglednik posalje i obican klik — preskacemo ga.
    if (dugiOkinut.current) {
      dugiOkinut.current = false;
      return;
    }
    onGol();
  }

  return (
    <div
      className={
        "flex items-stretch gap-1 rounded-lg border " +
        (jeGolman ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white")
      }
    >
      <button
        type="button"
        disabled={onemoguceno}
        onClick={klik}
        onPointerDown={pocetak}
        onPointerUp={kraj}
        onPointerLeave={kraj}
        onPointerCancel={kraj}
        onContextMenu={(e) => e.preventDefault()}
        className="flex h-14 min-w-0 flex-1 items-center justify-between gap-2 px-3
                   text-left text-base font-bold uppercase tracking-tight
                   transition select-none active:scale-[0.97] disabled:opacity-40"
        style={{ WebkitTouchCallout: "none" }}
        aria-label={`Gol za ${nadimak}. Dugi pritisak upisuje autogol.`}
      >
        <span className="min-w-0 truncate">{nadimak}</span>
        {golovi > 0 && (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500">
            ⚽{golovi}
          </span>
        )}
      </button>

      <button
        type="button"
        disabled={onemoguceno}
        onClick={onGolman}
        className={
          "w-11 shrink-0 rounded-r-lg text-lg transition active:scale-95 disabled:opacity-40 " +
          (jeGolman ? "bg-emerald-100" : "opacity-25 hover:opacity-60")
        }
        aria-label={jeGolman ? `${nadimak} je golman` : `Postavi ${nadimak} za golmana`}
        title={jeGolman ? "Golman" : "Postavi za golmana"}
      >
        🧤
      </button>
    </div>
  );
}
