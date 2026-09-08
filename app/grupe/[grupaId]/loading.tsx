/** Shared skeleton for group tabs while the server page loads. */
export default function GroupLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-5 w-28 rounded bg-slate-300" />
      <div className="space-y-2 rounded-lg border border-slate-300 bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2">
            <div className="h-5 w-32 rounded bg-slate-300" />
            <div className="h-5 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-300 bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
