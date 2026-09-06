"use client";

import { useActionState, useState } from "react";
import {
  posaljiMagicLink,
  prijavaGoogle,
  prijavaLozinkom,
  registracijaLozinkom,
  type StanjePrijave,
} from "./akcije";

const PRAZNO: StanjePrijave = {};

function Poruka({ stanje }: { stanje: StanjePrijave }) {
  if (stanje.greska) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600">
        {stanje.greska}
      </p>
    );
  }
  if (stanje.poruka) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-700">
        {stanje.poruka}
      </p>
    );
  }
  return null;
}

const POLJE =
  "w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base " +
  "placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20";

const GUMB_GLAVNI =
  "w-full h-14 rounded-lg bg-slate-900 text-base font-semibold text-white " +
  "transition active:scale-[0.98] disabled:opacity-50";

const GUMB_SPOREDNI =
  "w-full h-14 rounded-lg border-2 border-slate-900 bg-white text-base font-semibold " +
  "text-slate-900 transition active:scale-[0.98] disabled:opacity-50";

export function ObrazacPrijave() {
  const [stanjeGoogle, akcijaGoogle, cekaGoogle] = useActionState(prijavaGoogle, PRAZNO);
  const [stanjeLink, akcijaLink, cekaLink] = useActionState(posaljiMagicLink, PRAZNO);
  const [stanjeLozinka, akcijaLozinka, cekaLozinka] = useActionState(prijavaLozinkom, PRAZNO);
  const [stanjeRegistracija, akcijaRegistracija, cekaRegistracija] = useActionState(
    registracijaLozinkom,
    PRAZNO,
  );

  const [lozinkomOtvoreno, postaviLozinkom] = useState(false);
  const cekaBiloSto = cekaGoogle || cekaLink || cekaLozinka || cekaRegistracija;

  return (
    <div className="space-y-6">
      {/* 1. Google — najmanje trenja na mobitelu, zato je prvi */}
      <form action={akcijaGoogle} className="space-y-2">
        <button type="submit" disabled={cekaBiloSto} className={GUMB_SPOREDNI}>
          {cekaGoogle ? "Otvaram Google…" : "Prijavi se Googleom"}
        </button>
        <Poruka stanje={stanjeGoogle} />
      </form>

      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        ili
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* 2. Magic link */}
      <form action={akcijaLink} className="space-y-2">
        <label htmlFor="email-link" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email-link"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="ime@primjer.hr"
          className={POLJE}
          required
        />
        <button type="submit" disabled={cekaBiloSto} className={GUMB_GLAVNI}>
          {cekaLink ? "Šaljem…" : "Pošalji mi link"}
        </button>
        <Poruka stanje={stanjeLink} />
      </form>

      {/* 3. Email i lozinka — sklopljeno, jer je najrjedji izbor.
          Jedna forma, dva gumba: drugi pregazi akciju preko formAction,
          pa oba dijele ista polja. */}
      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => postaviLozinkom((v) => !v)}
          aria-expanded={lozinkomOtvoreno}
          className="text-sm font-medium text-slate-600 underline underline-offset-4"
        >
          {lozinkomOtvoreno ? "Sakrij prijavu lozinkom" : "Radije lozinkom?"}
        </button>

        {lozinkomOtvoreno && (
          <form action={akcijaLozinka} className="mt-4 space-y-3">
            <div className="space-y-2">
              <label htmlFor="email-lozinka" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email-lozinka"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className={POLJE}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="lozinka" className="block text-sm font-medium text-slate-700">
                Lozinka
              </label>
              <input
                id="lozinka"
                name="lozinka"
                type="password"
                autoComplete="current-password"
                minLength={8}
                className={POLJE}
                required
              />
            </div>

            <button type="submit" disabled={cekaBiloSto} className={GUMB_GLAVNI}>
              {cekaLozinka ? "Prijavljujem…" : "Prijavi se"}
            </button>

            <button
              type="submit"
              formAction={akcijaRegistracija}
              disabled={cekaBiloSto}
              className="w-full h-12 text-sm font-medium text-slate-600 underline underline-offset-4 disabled:opacity-50"
            >
              {cekaRegistracija ? "Registriram…" : "Nemam račun — registriraj me"}
            </button>

            <Poruka stanje={stanjeLozinka} />
            <Poruka stanje={stanjeRegistracija} />
          </form>
        )}
      </div>
    </div>
  );
}
