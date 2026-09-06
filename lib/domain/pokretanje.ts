/**
 * Koliko prije pocetka se termin smije pokrenuti.
 *
 * 30 minuta je taman: ekipa se skupi, netko pokrene stopericu i cekaju
 * zadnje. Prije toga nema razloga — a prosiriti to na sate znaci da netko
 * dan ranije slucajno pokrene termin i stoperica vrti cijelu noc.
 */
export const MINUTA_PRIJE_POCETKA = 30;

/**
 * Smije li se termin pokrenuti u danom trenutku.
 *
 * Nakon pocetka NEMA gornje granice — ako su zakasnili pola sata ili se
 * sjetili tek sutra upisati sto se dogodilo, neka mogu.
 */
export function mozeSePokrenuti(startsAt: string, sada: Date): boolean {
  const pocetak = new Date(startsAt).getTime();
  return sada.getTime() >= pocetak - MINUTA_PRIJE_POCETKA * 60_000;
}

/** Trenutak od kojeg se smije pokrenuti — za poruku korisniku. */
export function odKadaSePokrece(startsAt: string): Date {
  return new Date(new Date(startsAt).getTime() - MINUTA_PRIJE_POCETKA * 60_000);
}
