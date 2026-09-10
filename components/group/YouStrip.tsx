import Link from "next/link";

type Props = {
  grupaId: string;
  userId: string;
  nickname: string;
  /** e.g. "3. · 1042 Rtg" or "5 G · 2 A · 8 U" */
  statsLine: string;
  /** Back-link context on the player page (`statistika` | `ljestvica`). */
  from: "statistika" | "ljestvica";
};

export function YouStrip({ grupaId, userId, nickname, statsLine, from }: Props) {
  return (
    <Link
      href={`/grupe/${grupaId}/igrac/${userId}?from=${from}`}
      className="mt-3 flex items-center gap-3 rounded-lg border border-marka/25 bg-marka/5 px-3 py-2.5 transition active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-marka">
          {nickname}
          <span className="ml-2 text-xs font-bold uppercase tracking-wide text-marka-svijetla">
            Ti
          </span>
        </p>
        <p className="text-xs tabular-nums text-slate-600">{statsLine}</p>
      </div>
      <span className="text-slate-400" aria-hidden>
        →
      </span>
    </Link>
  );
}
