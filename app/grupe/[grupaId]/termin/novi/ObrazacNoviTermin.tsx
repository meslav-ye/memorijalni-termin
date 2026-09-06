"use client";

import { useActionState, useState } from "react";
import { kreirajTermin, type StanjeTermina } from "../akcije";

const PRAZNO: StanjeTermina = {};

const POLJE =
  "w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base " +
  "focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20";

type Lokacija = { id: string; name: string };

export function ObrazacNoviTermin({
  grupaId,
  lokacije,
  zadanaKvota,
  zadaniMin,
}: {
  grupaId: string;
  lokacije: Lokacija[];
  zadanaKvota: number;
  zadaniMin: number;
}) {
  const [stanje, akcija, ceka] = useActionState(
    kreirajTermin.bind(null, grupaId),
    PRAZNO,
  );

  // Ako grupa jos nema spremljenih lokacija, odmah nudimo slobodan unos.
  const [drugaLokacija, postaviDrugu] = useState(lokacije.length === 0);

  return (
    <form action={akcija} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="datum" className="block text-sm font-medium text-slate-700">
            Datum
          </label>
          <input id="datum" name="datum" type="date" required className={POLJE} />
        </div>
        <div className="space-y-2">
          <label htmlFor="vrijeme" className="block text-sm font-medium text-slate-700">
            Vrijeme
          </label>
          <input
            id="vrijeme"
            name="vrijeme"
            type="time"
            defaultValue="20:00"
            required
            className={POLJE}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="lokacija" className="block text-sm font-medium text-slate-700">
          Lokacija
        </label>

        {lokacije.length > 0 && (
          <select
            id="lokacija"
            name="lokacija"
            className={POLJE}
            defaultValue={lokacije[0]?.id}
            onChange={(e) => postaviDrugu(e.target.value === "")}
          >
            {lokacije.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value="">Druga lokacija…</option>
          </select>
        )}

        {drugaLokacija && (
          <input
            name="lokacijaTekst"
            type="text"
            placeholder="npr. Dvorana Trnje"
            required
            className={POLJE}
            aria-label="Upiši lokaciju"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="minIgraca" className="block text-sm font-medium text-slate-700">
            Najmanje igrača
          </label>
          <input
            id="minIgraca"
            name="minIgraca"
            type="number"
            inputMode="numeric"
            defaultValue={zadaniMin}
            min={2}
            max={30}
            required
            className={POLJE}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="kvota" className="block text-sm font-medium text-slate-700">
            Najviše mjesta
          </label>
          <input
            id="kvota"
            name="kvota"
            type="number"
            inputMode="numeric"
            defaultValue={zadanaKvota}
            min={2}
            max={30}
            required
            className={POLJE}
          />
        </div>
      </div>
      <p className="-mt-4 text-sm text-slate-500">
        Ispod najmanjeg broja termin je upitan. Preko broja mjesta se ide na listu
        čekanja i automatski ulazi kad netko otkaže.
      </p>

      <div className="space-y-2">
        <label htmlFor="napomena" className="block text-sm font-medium text-slate-700">
          Napomena <span className="font-normal text-slate-400">(neobavezno)</span>
        </label>
        <input
          id="napomena"
          name="napomena"
          type="text"
          placeholder="npr. ponesi svijetli i tamni dres"
          className={POLJE}
        />
      </div>

      <button
        type="submit"
        disabled={ceka}
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {ceka ? "Otvaram…" : "Otvori termin"}
      </button>

      {stanje.greska && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {stanje.greska}
        </p>
      )}
    </form>
  );
}
