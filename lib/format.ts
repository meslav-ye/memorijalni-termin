const ZONA = "Europe/Zagreb";

const HR_DANI = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"] as const;
const EN_DANI = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Dijelovi datuma u zagrebackoj zoni.
 *
 * Formatira se preko `en-GB`, a hrvatske kratice dana se mapiraju rucno:
 * kratki nazivi dana koje `hr-HR` vraca razlikuju se medju verzijama Node-a
 * i platformama, pa bi test koji na njih racuna bio krhak.
 */
function dijelovi(iso: string) {
  const d = new Date(iso);

  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const indeksDana = EN_DANI.indexOf(p.weekday as (typeof EN_DANI)[number]);

  return {
    dan: HR_DANI[indeksDana] ?? "",
    datum: `${p.day}.${p.month}.${p.year}.`,
    // Ponoc `en-GB` vraca kao "24", a ne "00".
    sat: p.hour === "24" ? "00" : p.hour,
    minuta: p.minute,
  };
}

/** e.g. "uto 08.09.2026. u 20:00" */
export function formatMatchDateTime(iso: string): string {
  const { dan, datum, sat, minuta } = dijelovi(iso);
  return `${dan} ${datum} u ${sat}:${minuta}`;
}

/** e.g. "08.09.2026." */
export function formatShortDate(iso: string): string {
  return dijelovi(iso).datum;
}

/** e.g. "20:00" */
export function formatTimeOfDay(iso: string): string {
  const { sat, minuta } = dijelovi(iso);
  return `${sat}:${minuta}`;
}

/** Koliko je zagrebacko vrijeme pomaknuto od UTC-a u danom trenutku (ms). */
function pomakZoneMs(trenutak: Date): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const p = Object.fromEntries(f.formatToParts(trenutak).map((x) => [x.type, x.value]));

  const kaoDaJeUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );

  return kaoDaJeUtc - trenutak.getTime();
}

/**
 * Pretvara ZAGREBACKO zidno vrijeme u ISO (UTC).
 *
 * Ovo postoji jer korisnik u obrascu upisuje "08.09.2026." i "20:00" misleci na
 * vrijeme u Hrvatskoj, dok server na Vercelu radi u UTC-u. `new Date("...T20:00")`
 * bi to protumacio u zoni SERVERA i pomaknuo svaki termin za sat ili dva —
 * ovisno jos i o godisnjem dobu.
 *
 * @param datum  "2026-09-08"
 * @param satnica "20:00"
 */
export function zagrebUIso(datum: string, satnica: string): string {
  // Prvo protumaci uneseno kao da je UTC, pa oduzmi stvarni pomak zone
  // za taj trenutak — time se hvata i ljetno i zimsko racunanje vremena.
  const naivno = new Date(`${datum}T${satnica}:00.000Z`);
  const pomak = pomakZoneMs(naivno);

  return new Date(naivno.getTime() - pomak).toISOString();
}
