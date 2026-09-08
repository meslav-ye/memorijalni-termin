"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type BusyContextValue = {
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const BusyContext = createContext<BusyContextValue | null>(null);

export function useBusy(): BusyContextValue {
  const ctx = useContext(BusyContext);
  if (!ctx) {
    throw new Error("useBusy must be used within BusyProvider");
  }
  return ctx;
}

/** Optional: when outside provider (tests), no-op. */
export function useOptionalBusy(): BusyContextValue {
  return (
    useContext(BusyContext) ?? {
      busy: false,
      setBusy: () => {},
    }
  );
}

function TopBar({ busy }: { busy: boolean }) {
  return (
    <div
      className={
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-slate-200/80 " +
        (busy ? "opacity-100" : "opacity-0")
      }
      role="progressbar"
      aria-hidden={!busy}
      aria-valuetext={busy ? "Učitavanje" : undefined}
    >
      <div
        className={
          "h-full w-1/3 bg-marka-svijetla " +
          (busy ? "animate-[loading-slide_1s_ease-in-out_infinite]" : "")
        }
      />
    </div>
  );
}

function NavigationBusy() {
  const { setBusy } = useBusy();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setBusy(false);
  }, [pathname, searchParams, setBusy]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-no-loading]")) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const samePath =
        url.pathname === window.location.pathname &&
        url.search === window.location.search;
      if (samePath) return;

      setBusy(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [setBusy]);

  return null;
}

export function BusyProvider({ children }: { children: ReactNode }) {
  const [busy, setBusyState] = useState(false);
  const setBusy = useCallback((value: boolean) => {
    setBusyState(value);
  }, []);

  const value = useMemo(() => ({ busy, setBusy }), [busy, setBusy]);

  return (
    <BusyContext.Provider value={value}>
      <TopBar busy={busy} />
      <NavigationBusy />
      {children}
    </BusyContext.Provider>
  );
}
