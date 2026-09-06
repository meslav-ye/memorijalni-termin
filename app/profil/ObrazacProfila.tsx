"use client";

import { useActionState } from "react";
import { spremiProfil, type StanjeProfila } from "./akcije";

const PRAZNO: StanjeProfila = {};

export function ObrazacProfila({
  nadimak,
  golman,
}: {
  nadimak: string;
  golman: boolean;
}) {
  const [stanje, akcija, ceka] = useActionState(spremiProfil, PRAZNO);

  return (
    <form action={akcija} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="nickname" className="block text-sm font-medium text-slate-700">
          Nadimak
        </label>
        <input
          id="nickname"
          name="nickname"
          defaultValue={nadimak}
          maxLength={12}
          minLength={2}
          required
          autoComplete="nickname"
          className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base uppercase
                     focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
        />
        <p className="text-sm text-slate-500">
          Ovo se prikazuje na ekranu uživo dok traje termin — neka bude kratko, najviše 12 znakova.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          type="checkbox"
          name="golman"
          defaultChecked={golman}
          className="mt-1 h-5 w-5 rounded border-slate-300"
        />
        <span>
          <span className="block font-medium">Igram golmana</span>
          <span className="block text-sm text-slate-500">
            Kad se slažu ekipe, golmani se automatski razdvoje u suprotne ekipe.
            Za pojedini termin se to može promijeniti.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={ceka}
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {ceka ? "Spremam…" : "Spremi"}
      </button>

      {stanje.greska && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {stanje.greska}
        </p>
      )}
      {stanje.poruka && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {stanje.poruka}
        </p>
      )}
    </form>
  );
}
