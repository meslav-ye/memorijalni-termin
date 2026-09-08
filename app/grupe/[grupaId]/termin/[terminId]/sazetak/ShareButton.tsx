"use client";

import { useState } from "react";

export function ShareButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"" | "copied" | "error">("");

  async function share() {
    // On mobile opens the share sheet (WhatsApp etc.);
    // on laptop that is missing, so we fall back to copy.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User cancelled — not an error.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={share}
        className="h-12 w-full rounded-lg bg-marka text-sm font-semibold text-white
                   transition active:scale-[0.98]"
      >
        {status === "copied" ? "Kopirano ✓" : "Podijeli sažetak"}
      </button>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          Kopiranje nije uspjelo — označi tekst ispod i kopiraj ručno.
        </p>
      )}

      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        {text}
      </pre>
    </div>
  );
}
