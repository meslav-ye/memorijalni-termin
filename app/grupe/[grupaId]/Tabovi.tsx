"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { oznaka: string; put: string };

export function Tabovi({ grupaId, admin }: { grupaId: string; admin: boolean }) {
  const putanja = usePathname();
  const korijen = `/grupe/${grupaId}`;

  const tabovi: Tab[] = [
    { oznaka: "Termini", put: korijen },
    { oznaka: "Statistika", put: `${korijen}/statistika` },
    { oznaka: "Ljestvica", put: `${korijen}/ljestvica` },
    { oznaka: "Članovi", put: `${korijen}/clanovi` },
    ...(admin ? [{ oznaka: "Postavke", put: `${korijen}/postavke` }] : []),
  ];

  return (
    <nav className="-mx-5 mb-6 overflow-x-auto border-b border-slate-200 px-5">
      <ul className="flex gap-1">
        {tabovi.map((t) => {
          // Tab "Termini" je korijen, pa se ne smije podudarati s podrutama.
          const aktivan = t.put === korijen ? putanja === korijen : putanja.startsWith(t.put);

          return (
            <li key={t.put}>
              <Link
                href={t.put}
                aria-current={aktivan ? "page" : undefined}
                className={
                  "block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition " +
                  (aktivan
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800")
                }
              >
                {t.oznaka}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
