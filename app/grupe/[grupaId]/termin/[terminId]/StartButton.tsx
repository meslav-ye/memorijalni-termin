"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startMatch } from "./uzivo/actions";

export function StartButton({
  grupaId,
  terminId,
  vecUTijeku,
}: {
  grupaId: string;
  terminId: string;
  vecUTijeku: boolean;
}) {
  const router = useRouter();
  const [radim, postaviRadim] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);

  async function pokreni() {
    if (vecUTijeku) {
      router.push(`/grupe/${grupaId}/termin/${terminId}/uzivo`);
      return;
    }

    postaviRadim(true);
    postaviGresku(null);

    const odgovor = await startMatch(grupaId, terminId);
    postaviRadim(false);

    if ("error" in odgovor) {
      postaviGresku(odgovor.error);
      return;
    }
    router.push(`/grupe/${grupaId}/termin/${terminId}/uzivo`);
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={pokreni}
        disabled={radim}
        className="h-14 w-full rounded-lg bg-emerald-600 text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {radim ? "Pokrećem…" : vecUTijeku ? "Nastavi termin uživo" : "Pokreni termin"}
      </button>

      {greska && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-red-600">
          {greska}
        </p>
      )}
    </div>
  );
}
