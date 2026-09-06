"use client";

import { useState } from "react";

export function GumbPodijeli({ tekst }: { tekst: string }) {
  const [status, postaviStatus] = useState<"" | "kopirano" | "greska">("");

  async function podijeli() {
    // Na mobitelu otvara izbornik dijeljenja (WhatsApp i ostalo);
    // na laptopu toga nema, pa padamo na kopiranje.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: tekst });
      } catch {
        // Korisnik je odustao — nije greska.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(tekst);
      postaviStatus("kopirano");
      setTimeout(() => postaviStatus(""), 2500);
    } catch {
      postaviStatus("greska");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={podijeli}
        className="h-12 w-full rounded-lg bg-marka text-sm font-semibold text-white
                   transition active:scale-[0.98]"
      >
        {status === "kopirano" ? "Kopirano ✓" : "Podijeli sažetak"}
      </button>

      {status === "greska" && (
        <p role="alert" className="text-sm text-red-600">
          Kopiranje nije uspjelo — označi tekst ispod i kopiraj ručno.
        </p>
      )}

      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        {tekst}
      </pre>
    </div>
  );
}
