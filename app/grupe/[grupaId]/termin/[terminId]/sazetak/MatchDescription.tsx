"use client";

import { useEffect, useId, useRef, useState } from "react";
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

  if (!trimmed) {
    return (
      <section className="mt-8">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="h-12 w-full rounded-lg border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800 active:scale-[0.98]"
        >
          Dodaj opis
        </button>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="relative rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 whitespace-pre-wrap">
        {admin && (
          <div className="absolute right-2 top-2">
            <DescriptionMenu
              onEdit={() => setEditing(true)}
              onDelete={async () => {
                if (!confirm("Obrisati opis?")) return;
                const formData = new FormData();
                formData.set("groupId", grupaId);
                formData.set("matchId", terminId);
                formData.set("opis", "");
                await updateMatchDescription(formData);
              }}
            />
          </div>
        )}
        <div className={admin ? "pr-8" : undefined}>
          <LinkifiedText text={trimmed} />
        </div>
      </div>
    </section>
  );
}

function DescriptionMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Opcije opisa"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <span aria-hidden className="text-lg leading-none">
          ⋮
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Uredi
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={deleting}
            className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete();
              } finally {
                setDeleting(false);
                setOpen(false);
              }
            }}
          >
            {deleting ? "Brišem…" : "Obriši"}
          </button>
        </div>
      )}
    </div>
  );
}
