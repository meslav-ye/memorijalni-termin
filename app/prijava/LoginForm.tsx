"use client";

import { useActionState, useEffect, useState } from "react";
import { useOptionalBusy } from "@/components/BusyProvider";
import { SoftButton } from "@/components/ui/SoftButton";
import { softControlClassName } from "@/components/ui/softControl";
import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type LoginState,
} from "./actions";

const EMPTY: LoginState = {};

function StatusMessage({ state }: { state: LoginState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-700">
        {state.message}
      </p>
    );
  }
  return null;
}

const FIELD =
  "w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-base " +
  "placeholder:text-slate-400 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20";

const PRIMARY_BTN =
  "w-full h-14 rounded-lg bg-marka text-base font-semibold text-white " +
  "transition active:scale-[0.98] disabled:opacity-50";

const SECONDARY_BTN =
  "w-full h-14 rounded-lg border-2 border-marka bg-white text-base font-semibold " +
  "text-slate-900 transition active:scale-[0.98] disabled:opacity-50";

export function LoginForm({ googleAvailable }: { googleAvailable: boolean }) {
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, EMPTY);
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, EMPTY);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    EMPTY,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpWithPassword, EMPTY);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const anyPending = googlePending || linkPending || passwordPending || signUpPending;
  const { setBusy } = useOptionalBusy();

  useEffect(() => {
    setBusy(anyPending);
    return () => setBusy(false);
  }, [anyPending, setBusy]);

  return (
    <div className="space-y-6">
      {/* 1. Google — least friction on mobile, so it comes first.
          Shown ONLY if it is actually enabled on the Supabase project:
          local Docker Supabase does not have it, so the button would silently
          bounce back to login. */}
      {googleAvailable ? (
        <>
          <form action={googleAction} className="space-y-2">
            <button type="submit" disabled={anyPending} className={SECONDARY_BTN}>
              {googlePending ? "Otvaram Google…" : "Prijavi se Googleom"}
            </button>
            <StatusMessage state={googleState} />
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
      <form action={linkAction} className="space-y-2">
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
          className={FIELD}
          required
        />
        <button type="submit" disabled={anyPending} className={PRIMARY_BTN}>
          {linkPending ? "Šaljem…" : "Pošalji mi link"}
        </button>
        <StatusMessage state={linkState} />
      </form>

      {/* 3. Email and password — collapsed, because it is the rarest choice.
          One form, two buttons: the second overrides the action via formAction,
          so both share the same fields. */}
      <div className="border-t border-slate-200 pt-4">
        <SoftButton
          type="button"
          onClick={() => setPasswordOpen((v) => !v)}
          aria-expanded={passwordOpen}
        >
          {passwordOpen ? "Sakrij prijavu lozinkom" : "Radije lozinkom?"}
        </SoftButton>

        {passwordOpen && (
          <form action={passwordAction} className="mt-4 space-y-3">
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
                className={FIELD}
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
                className={FIELD}
                required
              />
            </div>

            <button type="submit" disabled={anyPending} className={PRIMARY_BTN}>
              {passwordPending ? "Prijavljujem…" : "Prijavi se"}
            </button>

            <button
              type="submit"
              formAction={signUpAction}
              disabled={anyPending}
              className={`${softControlClassName} h-12 w-full`}
            >
              {signUpPending ? "Registriram…" : "Nemam račun — registriraj me"}
            </button>

            <StatusMessage state={passwordState} />
            <StatusMessage state={signUpState} />
          </form>
        )}
      </div>
    </div>
  );
}
