/** Root route transition fallback. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8" aria-busy="true" aria-live="polite">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded bg-slate-300" />
        <div className="h-24 rounded-lg border border-slate-200 bg-white" />
        <div className="h-24 rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
