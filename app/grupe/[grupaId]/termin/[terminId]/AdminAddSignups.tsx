"use client";

import { useState, useTransition, useEffect } from "react";
import { useOptionalBusy } from "@/components/BusyProvider";
import { SoftButton } from "@/components/ui/SoftButton";
import { adminSignUpForMatch } from "../actions";

type Member = { userId: string; nickname: string };

export function AdminAddSignups({
  groupId,
  matchId,
  members,
}: {
  groupId: string;
  matchId: string;
  members: Member[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const { setBusy } = useOptionalBusy();

  useEffect(() => {
    setBusy(pending);
    return () => setBusy(false);
  }, [pending, setBusy]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const allSelected = selected.size === members.length && members.length > 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.userId)));
  };

  const submit = () => {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("matchId", matchId);
    for (const id of selected) fd.append("userId", id);
    startTransition(async () => {
      await adminSignUpForMatch(fd);
      setSelected(new Set());
    });
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Dodaj članove
        </h3>
        <SoftButton type="button" data-no-loading onClick={toggleAll}>
          {allSelected ? "Makni sve" : "Odaberi sve"}
        </SoftButton>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
          {members.map((m) => {
            const on = selected.has(m.userId);
            return (
              <li key={m.userId}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(m.userId)}
                    className="h-4 w-4 rounded border-slate-300 text-marka focus:ring-marka"
                  />
                  <span className="min-w-0 flex-1 font-medium text-slate-900">{m.nickname}</span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            disabled={selected.size === 0 || pending}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-marka text-sm
                       font-semibold text-white transition active:scale-[0.98]
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Prijavljujem…"
              : selected.size === 0
                ? "Odaberi članove"
                : selected.size === 1
                  ? "Prijavi 1 člana"
                  : `Prijavi ${selected.size} članova`}
          </button>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Završe na kraju reda (ili na listi čekanja ako je kvota puna).
      </p>
    </section>
  );
}
