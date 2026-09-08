"use client";

import { useActionState, useState } from "react";
import { createMatch, type MatchFormState } from "../actions";

const EMPTY: MatchFormState = {};

const FIELD =
  "w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base " +
  "focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20";

type LocationOption = { id: string; name: string };

export function NewMatchForm({
  grupaId,
  locations,
  defaultCapacity,
  defaultMin,
}: {
  grupaId: string;
  locations: LocationOption[];
  defaultCapacity: number;
  defaultMin: number;
}) {
  const [state, action, pending] = useActionState(
    createMatch.bind(null, grupaId),
    EMPTY,
  );

  // If the group has no saved locations yet, offer free-text input immediately.
  const [otherLocation, setOtherLocation] = useState(locations.length === 0);

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="datum" className="block text-sm font-medium text-slate-700">
            Datum
          </label>
          <input id="datum" name="datum" type="date" required className={FIELD} />
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
            className={FIELD}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="lokacija" className="block text-sm font-medium text-slate-700">
          Lokacija
        </label>

        {locations.length > 0 && (
          <select
            id="lokacija"
            name="lokacija"
            className={FIELD}
            defaultValue={locations[0]?.id}
            onChange={(e) => setOtherLocation(e.target.value === "")}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
            <option value="">Druga lokacija…</option>
          </select>
        )}

        {otherLocation && (
          <input
            name="lokacijaTekst"
            type="text"
            placeholder="npr. Dvorana Trnje"
            required
            className={FIELD}
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
            defaultValue={defaultMin}
            min={2}
            max={30}
            required
            className={FIELD}
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
            defaultValue={defaultCapacity}
            min={2}
            max={30}
            required
            className={FIELD}
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
          className={FIELD}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? "Otvaram…" : "Otvori termin"}
      </button>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
