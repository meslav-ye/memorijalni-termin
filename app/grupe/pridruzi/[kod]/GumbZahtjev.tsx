"use client";

import { useActionState } from "react";
import { requestJoin, type GroupState } from "../../actions";

const EMPTY: GroupState = {};

export function GumbZahtjev({ kod }: { kod: string }) {
  const [stanje, akcija, ceka] = useActionState(requestJoin.bind(null, kod), EMPTY);

  // Nakon uspjesno poslanog zahtjeva gumb nema smisla ostaviti.
  if (stanje.message) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p role="status" className="font-medium text-emerald-800">
          {stanje.message}
        </p>
      </div>
    );
  }

  return (
    <form action={akcija} className="space-y-3">
      <button
        type="submit"
        disabled={ceka}
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {ceka ? "Šaljem…" : "Pošalji zahtjev za članstvo"}
      </button>

      {stanje.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {stanje.error}
        </p>
      )}
    </form>
  );
}
