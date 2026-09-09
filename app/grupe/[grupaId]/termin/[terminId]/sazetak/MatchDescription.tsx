"use client";

import { useState } from "react";
import { updateMatchDescription } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { LinkifiedText } from "@/components/termin/LinkifiedText";

export function MatchDescription({
  grupaId,
  terminId,
  description,
  admin,
}: {
  grupaId: string;
  terminId: string;
  description: string | null;
  admin: boolean;
}) {
  const trimmed = description?.trim() || null;
  const [editing, setEditing] = useState(false);

  if (!admin && !trimmed) return null;

  if (admin && editing) {
    return (
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <form
          action={async (formData) => {
            await updateMatchDescription(formData);
            setEditing(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="groupId" value={grupaId} />
          <input type="hidden" name="matchId" value={terminId} />
          <label htmlFor="opis" className="block text-sm font-medium text-slate-700">
            Opis
          </label>
          <textarea
            id="opis"
            name="opis"
            rows={3}
            maxLength={2000}
            defaultValue={trimmed ?? ""}
            placeholder="npr. Snimka: https://youtu.be/…"
            autoFocus
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-marka focus:outline-none focus:ring-2 focus:ring-marka/20"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              URL-ovi postaju klikabilni nakon spremanja.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-10 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Odustani
              </button>
              <SubmitButton pendingLabel="Spremam…">Spremi</SubmitButton>
            </div>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="mt-8">
      {trimmed ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
          <LinkifiedText text={trimmed} />
        </div>
      ) : null}

      {admin && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={
            trimmed
              ? "mt-2 text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-800"
              : "h-12 w-full rounded-lg border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 active:scale-[0.98]"
          }
        >
          {trimmed ? "Uredi opis" : "Dodaj opis"}
        </button>
      )}
    </section>
  );
}
