import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Path under /public, e.g. `/brand/stats/stats-scorer.png` */
  imageSrc?: string | null;
  title: string;
  value: string;
  who: string;
  /** When set, nickname links to player page */
  href?: string | null;
  suffix?: string;
};

export function StatsLeaderCard({
  imageSrc,
  title,
  value,
  who,
  href,
  suffix,
}: Props) {
  const empty = who === "";

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
      {/* Soft category illustration as watermark */}
      {!empty && imageSrc && (
        <Image
          src={imageSrc}
          alt=""
          width={160}
          height={160}
          className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 object-contain opacity-[0.18]"
          aria-hidden
        />
      )}

      <div className="relative">
        <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
              aria-hidden
            />
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
