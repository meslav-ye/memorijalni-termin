"use client";

import { useActionState, useState } from "react";
import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type LoginState,
} from "./actions";

const EMPTY: LoginState = {};

function Poruka({ stanje }: { stanje: LoginState }) {
  if (stanje.error) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600">
        {stanje.error}
      </p>
    );
  }
  if (stanje.message) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-700">
        {stanje.message}
      </p>
    );
  }
  return null;
}

const POLJE =
  "w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base " +
  "placeholder:text-slate-400 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20";

const GUMB_GLAVNI =
  "w-full h-14 rounded-lg bg-marka text-base font-semibold text-white " +
  "transition active:scale-[0.98] disabled:opacity-50";

const GUMB_SPOREDNI =
  "w-full h-14 rounded-lg border-2 border-marka bg-white text-base font-semibold " +
  "text-slate-900 transition active:scale-[0.98] disabled:opacity-50";

export function LoginForm({ googleDostupan }: { googleDostupan: boolean }) {
  const [stanjeGoogle, akcijaGoogle, cekaGoogle] = useActionState(signInWithGoogle, EMPTY);
  const [stanjeLink, akcijaLink, cekaLink] = useActionState(sendMagicLink, EMPTY);
  const [stanjeLozinka, akcijaLozinka, cekaLozinka] = useActionState(signInWithPassword, EMPTY);
  const [stanjeRegistracija, akcijaRegistracija, cekaRegistracija] = useActionState(
    signUpWithPassword,
    EMPTY,
  );

  const [lozinkomOtvoreno, postaviLozinkom] = useState(false);
  const cekaBiloSto = cekaGoogle || cekaLink || cekaLozinka || cekaRegistracija;

  return (
    <div className="space-y-6">
      {/* 1. Google — najmanje trenja na mobitelu, zato je prvi.
          Prikazuje se SAMO ako je stvarno ukljucen na Supabase projektu:
          lokalni Docker Supabase ga nema, pa bi gumb tiho vracao na prijavu. */}
      {googleDostupan ? (
        <>
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
        </>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Prijava Googleom ovdje nije dostupna — radi samo na objavljenoj adresi.
          Za lokalno testiranje koristi email i lozinku.
        </p>
      )}

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
