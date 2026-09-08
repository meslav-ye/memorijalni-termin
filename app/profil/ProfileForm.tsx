"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

const EMPTY: ProfileState = {};

export function ProfileForm({
  nickname,
  isGoalkeeper,
}: {
  nickname: string;
  isGoalkeeper: boolean;
}) {
  const [state, action] = useActionState(saveProfile, EMPTY);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="nickname" className="block text-sm font-medium text-slate-700">
          Nadimak
        </label>
        <input
          id="nickname"
          name="nickname"
          defaultValue={nickname}
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
          name="goalkeeper"
          defaultChecked={isGoalkeeper}
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

      <SubmitButton
        type="submit"
        pendingLabel="Spremam…"
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        Spremi
      </SubmitButton>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
