"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string };

function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className={pending ? "opacity-50" : undefined}>
      {label}
      <span
        aria-hidden
        className={
          "ml-1 inline-block h-1.5 w-1.5 rounded-full bg-marka align-middle " +
          (pending ? "opacity-100" : "opacity-0")
        }
      />
    </span>
  );
}

export function GroupTabs({ grupaId, admin }: { grupaId: string; admin: boolean }) {
  const pathname = usePathname();
  const root = `/grupe/${grupaId}`;

  const tabs: Tab[] = [
    { label: "Termini", href: root },
    { label: "Statistika", href: `${root}/statistika` },
    { label: "Ljestvica", href: `${root}/ljestvica` },
    { label: "Članovi", href: `${root}/clanovi` },
    ...(admin ? [{ label: "Postavke", href: `${root}/postavke` }] : []),
  ];

  return (
    <nav className="-mx-5 mb-6 overflow-x-auto border-b border-slate-200 px-5">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          // The "Termini" tab is the root, so it must not match sub-routes.
          const active = t.href === root ? pathname === root : pathname.startsWith(t.href);

          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={
                  "block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition " +
                  (active
                    ? "border-marka text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800")
                }
              >
                <TabLabel label={t.label} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
