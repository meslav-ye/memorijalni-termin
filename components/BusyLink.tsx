"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import {
  useEffect,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useOptionalBusy } from "@/components/BusyProvider";

/**
 * Drives the global top bar while this Link's navigation is pending.
 * setBusy lives in a child so context updates do not reset useLinkStatus.
 */
function BusySync({ pending }: { pending: boolean }) {
  const { setBusy } = useOptionalBusy();

  useEffect(() => {
    setBusy(pending);
    return () => setBusy(false);
  }, [pending, setBusy]);

  return null;
}

function LinkBusy({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className={pending ? "opacity-70" : undefined}>
      <BusySync pending={pending} />
      {children}
      <span
        aria-hidden
        className={
          "ml-2 inline-block h-2 w-2 rounded-full bg-marka align-middle " +
          (pending ? "animate-pulse opacity-100" : "opacity-0")
        }
      />
    </span>
  );
}

type Props = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  /** Default false so pending UI can show (prefetched routes skip pending). */
  prefetch?: ComponentProps<typeof Link>["prefetch"];
};

/**
 * Next.js Link that shows global + inline pending feedback for slower
 * navigations (e.g. Ekipe). Prefetch off by default so pending is not skipped.
 */
export function BusyLink({
  children,
  prefetch = false,
  ...rest
}: Props) {
  return (
    <Link prefetch={prefetch} {...rest}>
      <LinkBusy>{children}</LinkBusy>
    </Link>
  );
}
