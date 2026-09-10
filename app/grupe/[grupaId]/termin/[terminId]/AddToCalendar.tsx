"use client";

import { SoftAnchor } from "@/components/ui/SoftAnchor";

type Props = {
  ics: string;
  fileName: string;
  googleUrl: string;
};

export function AddToCalendar({ ics, fileName, googleUrl }: Props) {
  function downloadIcs() {
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6 space-y-2">
      <button
        type="button"
        onClick={downloadIcs}
        className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-300
                   bg-white text-sm font-semibold transition active:scale-[0.98] hover:border-slate-400"
      >
        Dodaj u kalendar (.ics)
      </button>
      <SoftAnchor
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="h-11 w-full"
      >
        Otvori u Google Calendaru
      </SoftAnchor>
      <p className="text-center text-xs text-slate-500">
        Podsjetnik 2 sata prije početka — šalje ga tvoj kalendar.
      </p>
    </div>
  );
}
