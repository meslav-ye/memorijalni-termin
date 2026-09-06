export const MIN_DULJINA = 2;
export const MAX_DULJINA = 12;

/**
 * Kanonski oblik nadimka.
 *
 * Sve se svodi na velika slova i jedan razmak izmedju rijeci, jer nadimak je
 * oznaka osobe — "Marko", "MARKO" i "marko " su isti covjek. Bez ovoga bi se
 * kroz provjeru jedinstvenosti provukla dva "ista" nadimka koja se razlikuju
 * samo velicinom slova, a na ekranu uzivo bi izgledala identicno.
 *
 * Hrvatski znakovi se cuvaju. Č i C ostaju RAZLICITI — to su razliciti
 * nadimci, ne isti napisan drukcije.
 */
export function normalizirajNadimak(unos: string): string {
  return unos.trim().replace(/\s+/g, " ").toLocaleUpperCase("hr-HR");
}

export function istiNadimak(a: string, b: string): boolean {
  return normalizirajNadimak(a) === normalizirajNadimak(b);
}

export type RezultatProvjere = { ok: true; nadimak: string } | { greska: string };

/** Provjerava oblik nadimka. Jedinstvenost se provjerava odvojeno, uz bazu. */
export function provjeriNadimak(unos: string): RezultatProvjere {
  const nadimak = normalizirajNadimak(unos);

  if (nadimak.length < MIN_DULJINA) {
    return { greska: `Nadimak mora imati barem ${MIN_DULJINA} znaka.` };
  }
  if (nadimak.length > MAX_DULJINA) {
    return { greska: `Nadimak smije imati najviše ${MAX_DULJINA} znakova.` };
  }

  return { ok: true, nadimak };
}

// ---------- Razlikovanje istih nadimaka ----------

export type IgracZaOznaku = {
  userId: string;
  nadimak: string;
  fullName?: string | null;
  email?: string | null;
};

/** Prezime iz punog imena; ako je ime od jedne rijeci, cijelo ime. */
function prezime(fullName: string | null | undefined): string | null {
  const dijelovi = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (dijelovi.length === 0) return null;
  return dijelovi[dijelovi.length - 1];
}

/** Dio maila prije @. */
function izMaila(email: string | null | undefined): string | null {
  const lokalni = (email ?? "").split("@")[0]?.trim();
  return lokalni ? lokalni : null;
}

/**
 * Za svakog igraca vraca oznaku za prikaz.
 *
 * Ako je nadimak jedinstven u ovoj skupini — oznaka je sam nadimak. Ako dvoje
 * ili vise dijeli nadimak, svima iz te skupine se doda razlikovni dodatak:
 * prezime, pa dio maila, pa redni broj — prvo ono sto ih stvarno razlikuje.
 *
 * Postoji jer na ekranu uzivo dva jednaka gumba znace da onaj s klupe mora
 * pogadjati na koga tapnuti. Podaci su ispravni i bez ovoga; problem je ljudski.
 */
export function razlikujNadimke(igraci: IgracZaOznaku[]): Map<string, string> {
  const oznake = new Map<string, string>();

  const poNadimku = new Map<string, IgracZaOznaku[]>();
  for (const igrac of igraci) {
    const kljuc = normalizirajNadimak(igrac.nadimak);
    if (!poNadimku.has(kljuc)) poNadimku.set(kljuc, []);
    poNadimku.get(kljuc)!.push(igrac);
  }

  for (const [, skupina] of poNadimku) {
    if (skupina.length === 1) {
      oznake.set(skupina[0].userId, skupina[0].nadimak);
      continue;
    }

    // Uzimamo prvi izvor koji sve u skupini stvarno razlikuje.
    const kandidati: (string | null)[][] = [
      skupina.map((g) => prezime(g.fullName)),
      skupina.map((g) => izMaila(g.email)),
    ];

    const dodaci =
      kandidati.find(
        (niz) => niz.every(Boolean) && new Set(niz).size === skupina.length,
      ) ?? skupina.map((_, indeks) => String(indeks + 1));

    skupina.forEach((g, indeks) => {
      oznake.set(g.userId, `${g.nadimak} (${dodaci[indeks]})`);
    });
  }

  return oznake;
}
