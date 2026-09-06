import Link from "next/link";

/**
 * Prikazuje se i za nepostojece adrese i za notFound() iz koda — npr. kad
 * obican clan pokusa otvoriti postavke grupe. Namjerno ne otkriva razliku
 * izmedju "ne postoji" i "nemas pravo".
 */
export default function NijePronadjeno() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-4xl font-bold text-slate-300">404</p>
        <h1 className="mt-3 text-xl font-bold">Ovdje nema ničega</h1>
        <p className="mt-2 text-slate-600">
          Stranica ne postoji, ili joj nemaš pristup.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg
                     bg-slate-900 px-6 text-sm font-semibold text-white
                     transition active:scale-[0.98]"
        >
          Natrag na početak
        </Link>
      </div>
    </main>
  );
}
