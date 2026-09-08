/** Skeleton while a termin subpage (ekipe, uživo, sažetak) loads. */
export default function TerminLoading() {
  return (
    <div className="animate-pulse space-y-4 pb-28" aria-busy="true" aria-live="polite">
      <div className="h-4 w-36 rounded bg-slate-300" />
      <div className="h-8 w-56 rounded bg-slate-300" />
      <div className="h-24 rounded-lg border border-slate-200 bg-white" />
      <div className="h-40 rounded-lg border border-slate-200 bg-white" />
      <div className="h-12 rounded-lg bg-slate-300" />
    </div>
  );
}
