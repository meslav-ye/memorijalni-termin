"use client";

import { useEffect } from "react";
import { formatClock } from "@/lib/domain/timer";

/** Nakon ovoliko bez ikakvog dodira traka se sama zatvori, bez asistencije. */
const SAM_SE_ZATVARA_MS = 5000;

export type CekaAsistenciju = {
  dogadjajId: string;
  strijelac: string;
  proteklo: number;
  suigraci: { userId: string; nadimak: string }[];
};

/**
 * Donja traka koja se pojavi ODMAH nakon upisanog gola.
 *
 * Gol je vec u bazi — ovo je samo drugi dodir koji dopisuje asistenta.
 * Ako se nista ne dira 5 sekundi, traka nestaje i gol ostaje bez asistencije.
 * Nitko ne mora nista dovrsavati.
 */
export function AsistencijaTraka({
  ceka,
  onOdabir,
  onPonisti,
  onIstek,
}: {
  ceka: CekaAsistenciju;
  onOdabir: (asistentId: string | null) => void;
  onPonisti: () => void;
  onIstek: () => void;
}) {
  // `onIstek` mora biti stabilan (useCallback u roditelju), inace bi se
  // odbrojavanje resetiralo pri svakom renderu i traka se nikad ne bi zatvorila.
  useEffect(() => {
    const id = setTimeout(onIstek, SAM_SE_ZATVARA_MS);
    return () => clearTimeout(id);
  }, [onIstek]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-slate-700 bg-slate-900 p-3 text-white shadow-2xl">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-bold">
            ⚽ GOL — {ceka.strijelac}{" "}
            <span className="font-normal text-slate-400 tabular-nums">
              {formatClock(ceka.proteklo)}
            </span>
          </p>
          <button
            type="button"
            onClick={onPonisti}
            className="h-10 shrink-0 rounded-lg border border-red-400 px-3 text-sm
                       font-semibold text-red-300 transition active:scale-95"
          >
            Poništi
          </button>
        </div>

        <p className="mb-2 text-sm text-slate-400">Tko je asistirao?</p>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {ceka.suigraci.map((s) => (
            <button
              key={s.userId}
              type="button"
              onClick={() => onOdabir(s.userId)}
              className="h-12 shrink-0 rounded-lg bg-white px-4 text-sm font-bold
                         uppercase text-slate-900 transition active:scale-95"
            >
              {s.nadimak}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onOdabir(null)}
            className="h-12 shrink-0 rounded-lg border border-slate-500 px-4 text-sm
                       font-bold uppercase text-slate-300 transition active:scale-95"
          >
            Nitko
          </button>
        </div>
      </div>
    </div>
  );
}
