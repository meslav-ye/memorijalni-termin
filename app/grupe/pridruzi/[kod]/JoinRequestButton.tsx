"use client";

import { useActionState } from "react";
import { requestJoin, type GroupState } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";

const EMPTY: GroupState = {};

export function JoinRequestButton({ kod }: { kod: string }) {
  const [state, action] = useActionState(requestJoin.bind(null, kod), EMPTY);

  // After a successful request the button no longer makes sense.
  if (state.message) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p role="status" className="font-medium text-emerald-800">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <SubmitButton
        type="submit"
        pendingLabel="Šaljem…"
        className="w-full h-14 rounded-lg bg-marka text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        Pošalji zahtjev za članstvo
      </SubmitButton>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
