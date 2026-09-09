import { BrandMark } from "./BrandMark";

type BrandLockupProps = {
  className?: string;
};

/**
 * Login header: dark-green tile + plain Croatian wordmark.
 * Name is text so it can change without redrawing the mark.
 */
export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-marka"
          aria-hidden
        >
          <BrandMark className="h-10 w-10 text-marka-linija" />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xl font-bold tracking-tight text-marka">
            Memorijalni termin
          </p>
          <p className="text-sm text-slate-500">5v5 · prijave · uživo</p>
        </div>
      </div>
    </div>
  );
}
