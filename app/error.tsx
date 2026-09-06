"use client";

import { useEffect } from "react";

/**
 * Zadnja obrana kad nesto pukne u prikazu.
 *
 * Korisniku se NIKAD ne prikazuje `error.message` — moze sadrzavati imena
 * tablica, upite i druge detalje koji nikome ne pomazu, a nekome smetaju.
 * Prava poruka ide u konzolu i u logove poslužitelja.
 */
export default function Greska({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[greska]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold">Nešto je puklo</h1>
        <p className="mt-2 text-slate-600">
          Nije do tebe. Pokušaj ponovno — ako se nastavi, javi Mislavu.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-6 h-12 w-full rounded-lg bg-marka text-sm font-semibold text-white
                     transition active:scale-[0.98]"
        >
          Pokušaj ponovno
        </button>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-slate-400">Oznaka: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
