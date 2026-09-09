import Link from "next/link";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  value: string;
  who: string;
  /** When set, nickname links to player page */
  href?: string | null;
  suffix?: string;
};

export function StatsLeaderCard({ icon, title, value, who, href, suffix }: Props) {
  const empty = who === "";
  const iconEl = isValidElement(icon) ? (icon as ReactElement<{ className?: string }>) : null;

  const whoEl = empty ? (
    <span className="text-slate-400">još nitko</span>
  ) : href ? (
    <Link href={href} className="font-medium text-marka underline-offset-2 hover:underline">
      {who}
    </Link>
  ) : (
    <span className="font-medium text-slate-700">{who}</span>
  );

  return (
    <div
      className={
        "relative overflow-hidden rounded-lg border p-4 " +
        (empty
          ? "border-dashed border-slate-300 bg-white"
          : "border-marka/15 bg-marka/[0.04]")
      }
    >
      {/* A: category watermark — large faded icon */}
      {!empty && iconEl && (
        <span
          className="pointer-events-none absolute -bottom-3 -right-3 text-marka opacity-[0.09] [&_svg]:h-20 [&_svg]:w-20"
          aria-hidden
        >
          {cloneElement(iconEl)}
        </span>
      )}

      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {iconEl && (
            <span className="shrink-0 text-marka [&_svg]:h-6 [&_svg]:w-6">
              {cloneElement(iconEl)}
            </span>
          )}
          {title}
        </p>
        <p
          className={
            "mt-2 text-2xl font-bold tabular-nums " +
            (empty ? "text-slate-300" : "text-slate-900")
          }
        >
          {value}
          {suffix && !empty && (
            <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
          )}
        </p>
        <p className="mt-1 text-sm">{whoEl}</p>
      </div>
    </div>
  );
}
