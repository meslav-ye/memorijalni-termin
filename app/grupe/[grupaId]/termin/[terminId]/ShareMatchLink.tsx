"use client";

import { useState } from "react";
import { SoftButton } from "@/components/ui/SoftButton";

/**
 * Share the current termin URL. In the installed PWA there is no address
 * bar, so this is the only way to send the page to a teammate.
 */
export function ShareMatchLink({ title }: { title: string }) {
  const [status, setStatus] = useState<"" | "copied" | "error">("");

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus(""), 2500);
    }
  }

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}`;

    // Native share sheet on the phone (WhatsApp etc.); laptop falls back to copy.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        await copy(url);
      }
      return;
    }

    await copy(url);
  }

  return (
    <SoftButton type="button" onClick={share} aria-live="polite">
      {status === "copied"
        ? "Kopirano ✓"
        : status === "error"
          ? "Nije uspjelo"
          : "Podijeli"}
    </SoftButton>
  );
}
