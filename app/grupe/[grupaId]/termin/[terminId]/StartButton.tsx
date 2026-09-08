"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOptionalBusy } from "@/components/BusyProvider";
import { startMatch } from "./uzivo/actions";

export function StartButton({
  grupaId,
  terminId,
  alreadyLive,
}: {
  grupaId: string;
  terminId: string;
  alreadyLive: boolean;
}) {
  const router = useRouter();
  const { setBusy: setGlobalBusy } = useOptionalBusy();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGlobalBusy(busy);
    return () => setGlobalBusy(false);
  }, [busy, setGlobalBusy]);

  async function start() {
    if (alreadyLive) {
      setGlobalBusy(true);
      router.push(`/grupe/${grupaId}/termin/${terminId}/uzivo`);
      return;
    }

    setBusy(true);
    setError(null);

    const result = await startMatch(grupaId, terminId);
    setBusy(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setGlobalBusy(true);
    router.push(`/grupe/${grupaId}/termin/${terminId}/uzivo`);
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        aria-busy={busy || undefined}
        className="h-14 w-full rounded-lg bg-emerald-600 text-base font-semibold text-white
                   transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Pokrećem…" : alreadyLive ? "Nastavi termin uživo" : "Pokreni termin"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
