import type { SignupRow, SignupBuckets } from "./types";

/**
 * Dijeli prijave na potvrdjene i listu cekanja.
 *
 * Redoslijed: rucni redoslijed (ako je postavljen) ima prednost, zatim vrijeme
 * prijave. Otkazane prijave se preskacu — zato se lista cekanja "sama" popunjava
 * cim netko odustane, bez ikakve dodatne logike.
 *
 * Status se namjerno NE sprema u bazu, nego se uvijek izracunava. Time nema
 * stanja koje se moze razici sa stvarnoscu.
 */
export function splitSignups(signups: SignupRow[], capacity: number): SignupBuckets {
  const ordered = signups
    .filter((s) => s.cancelledAt === null)
    .sort((a, b) => {
      // Rucni redoslijed prvi; tko ga nema ide iza svih koji ga imaju.
      if (a.manualOrder !== null && b.manualOrder !== null) {
        if (a.manualOrder !== b.manualOrder) return a.manualOrder - b.manualOrder;
      } else if (a.manualOrder !== null) {
        return -1;
      } else if (b.manualOrder !== null) {
        return 1;
      }
      return a.signedUpAt.localeCompare(b.signedUpAt);
    });

  const limit = Math.max(0, capacity);

  return {
    confirmed: ordered.slice(0, limit).map((s) => s.userId),
    waitlist: ordered.slice(limit).map((s) => s.userId),
  };
}
