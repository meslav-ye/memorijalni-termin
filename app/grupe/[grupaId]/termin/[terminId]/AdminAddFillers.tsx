"use client";

import { useState, useTransition, useEffect } from "react";
import { useOptionalBusy } from "@/components/BusyProvider";
import { addMatchFiller } from "../actions";

export function AdminAddFillers({
  groupId,
  matchId,
  canAdd,
}: {
  groupId: string;
  matchId: string;
  canAdd: boolean;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const { setBusy } = useOptionalBusy();

  useEffect(() => {
    setBusy(pending);
    return () => setBusy(false);
  }, [pending, setBusy]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !canAdd) return;
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("matchId", matchId);
    fd.set("displayName", trimmed);
    startTransition(async () => {
      await addMatchFiller(fd);
      setName("");
    });
  };

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Dodaj popunjača
      </h3>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
        <label className="block text-sm text-slate-600" htmlFor="filler-name">
          Ime (neregistrirani igrač sa strane)
        </label>
        <input
          id="filler-name"
          type="text"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="npr. Marko"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!canAdd || name.trim().length === 0 || pending}
          onClick={submit}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-lg bg-marka text-sm
                     font-semibold text-white transition active:scale-[0.98]
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Dodajem…" : "Dodaj popunjača"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Broji se u kapacitet termina, ali nema statistike ni ratinga.
        {!canAdd && " Kapacitet je pun."}
      </p>
    </section>
  );
}
