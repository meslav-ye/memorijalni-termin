"use client";

import { useState } from "react";

/**
 * Link stize gotov sa servera (iz zaglavlja zahtjeva), pa ovdje nema efekta
 * ni odgodjenog prikaza — samo kopiranje i dijeljenje, koji stvarno trebaju
 * preglednik.
 */
export function LinkPozivnice({ link, nazivGrupe }: { link: string; nazivGrupe: string }) {
  const [status, postaviStatus] = useState<"" | "kopirano" | "greska">("");

  const poruka = `Ekipa, prijave za ${nazivGrupe} idu ovdje: ${link}`;

  async function kopiraj() {
    try {
      await navigator.clipboard.writeText(link);
      postaviStatus("kopirano");
      setTimeout(() => postaviStatus(""), 2500);
    } catch {
      postaviStatus("greska");
    }
  }

  async function podijeli() {
    // Web Share API postoji uglavnom na mobitelu; na laptopu padamo na kopiranje.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: nazivGrupe, text: poruka });
      } catch {
        // Korisnik je odustao od dijeljenja — nije greska, ne prikazujemo nista.
      }
      return;
    }
    await kopiraj();
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <code className="block break-all text-sm text-slate-700">{link}</code>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={podijeli}
          className="h-12 flex-1 rounded-lg bg-marka text-sm font-semibold text-white
                     transition active:scale-[0.98]"
        >
          Podijeli
        </button>
        <button
          type="button"
          onClick={kopiraj}
          className="h-12 flex-1 rounded-lg border border-slate-300 bg-white text-sm
                     font-semibold transition active:scale-[0.98]"
        >
          {status === "kopirano" ? "Kopirano ✓" : "Kopiraj"}
        </button>
      </div>

      {status === "greska" && (
        <p role="alert" className="text-sm text-red-600">
          Kopiranje nije uspjelo — označi link gore i kopiraj ručno.
        </p>
      )}
    </div>
  );
}
