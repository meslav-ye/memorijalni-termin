"use client";

import { useActionState } from "react";
import { kreirajGrupu, type StanjeGrupe } from "../akcije";

const PRAZNO: StanjeGrupe = {};

export function ObrazacNovaGrupa() {
  const [stanje, akcija, ceka] = useActionState(kreirajGrupu, PRAZNO);

  return (
    <form action={akcija} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="naziv" className="block text-sm font-medium text-slate-700">
          Naziv grupe
        </label>
        <input
          id="naziv"
          name="naziv"
          type="text"
          required
          minLength={2}
          maxLength={60}
          placeholder="npr. Utorak 20h"
          className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base
                     placeholder:text-slate-400 focus:border-slate-900 focus:outline-none
                     focus:ring-2 focus:ring-slate-900/20"
        />
        <p className="text-sm text-slate-500">
          Ovo ljudi vide u popisu — dan i vrijeme su obično najkorisniji.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="kvota" className="block text-sm font-medium text-slate-700">
          Koliko igrača stane na termin
        </label>
        <input
          id="kvota"
          name="kvota"
          type="number"
          inputMode="numeric"
          defaultValue={10}
          min={2}
          max={30}
          required
          className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base
                     focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        />
        <p className="text-sm text-slate-500">
          Za 5v5 je to 10. Tko se prijavi preko toga ide na listu čekanja i
          automatski ulazi ako netko otkaže. Može se promijeniti za svaki termin.
        </p>
      </div>

      <button
        type="submit"
        disabled={ceka}
        className="w-full h-14 rounded-lg bg-slate-900 text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {ceka ? "Otvaram…" : "Otvori grupu"}
      </button>

      {stanje.greska && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {stanje.greska}
        </p>
      )}
    </form>
  );
}
