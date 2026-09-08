"use client";

import { useState } from "react";

/**
 * The link arrives ready from the server (from the request headers), so there
 * is no effect or deferred display here — only copy and share, which truly
 * need the browser.
 */
export function InviteLink({ link, groupName }: { link: string; groupName: string }) {
  const [status, setStatus] = useState<"" | "copied" | "error">("");

  const message = `Ekipa, prijave za ${groupName} idu ovdje: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("error");
    }
  }

  async function share() {
    // Web Share API exists mainly on mobile; on laptop we fall back to copy.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: groupName, text: message });
      } catch {
        // User cancelled sharing — not an error, show nothing.
      }
      return;
    }
    await copy();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <code className="block break-all text-sm text-slate-700">{link}</code>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="h-12 flex-1 rounded-lg bg-marka text-sm font-semibold text-white
                     transition active:scale-[0.98]"
        >
          Podijeli
        </button>
        <button
          type="button"
          onClick={copy}
          className="h-12 flex-1 rounded-lg border border-slate-300 bg-white text-sm
                     font-semibold transition active:scale-[0.98]"
        >
          {status === "copied" ? "Kopirano ✓" : "Kopiraj"}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          Kopiranje nije uspjelo — označi link gore i kopiraj ručno.
        </p>
      )}
    </div>
  );
}
