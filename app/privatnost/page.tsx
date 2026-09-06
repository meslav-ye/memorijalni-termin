import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privatnost — Memorijalni termin",
  description: "Koje podatke aplikacija sprema, zašto, i kako ih obrisati.",
};

/** Zadnja izmjena ovog teksta. Mijenja se RUCNO kad se tekst promijeni. */
const ZADNJA_IZMJENA = "6. rujna 2026.";

/**
 * Kontakt na koji se salju zahtjevi za uvid i brisanje.
 * JAVNO je vidljiv na stranici i Google ga provjerava pri objavi OAuth aplikacije.
 */
const KONTAKT = "misso998@gmail.com";

function Odjeljak({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-bold tracking-tight">{naslov}</h2>
      <div className="space-y-2 text-slate-700">{children}</div>
    </section>
  );
}

export default function StranicaPrivatnosti() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <Link href="/" className="text-sm text-slate-500 underline underline-offset-4">
        ← Natrag
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">Privatnost</h1>
      <p className="mt-2 text-slate-600">
        Kratko i bez pravničkog jezika: ovo je hobi aplikacija za organizaciju
        nogometnih termina u zatvorenom društvu.
      </p>

      <Odjeljak naslov="Tko obrađuje podatke">
        <p>
          Aplikaciju održava privatna osoba, ne tvrtka. Kontakt za sva pitanja i
          zahtjeve:{" "}
          <a href={`mailto:${KONTAKT}`} className="underline underline-offset-4">
            {KONTAKT}
          </a>
          .
        </p>
      </Odjeljak>

      <Odjeljak naslov="Koji se podaci spremaju">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>O tebi:</strong> email adresa, ime i slika profila (ako se prijaviš
            Googleom), te nadimak koji sam upišeš.
          </li>
          <li>
            <strong>O terminima:</strong> na koje si se termine prijavio, u kojoj si
            ekipi igrao, tvoji golovi i asistencije, te rezultati utakmica.
          </li>
        </ul>
        <p>
          Ne spremamo broj telefona, adresu, lokaciju uređaja ni bilo kakve podatke o
          plaćanju.
        </p>
      </Odjeljak>

      <Odjeljak naslov="Zašto">
        <p>
          Isključivo da aplikacija radi: da te se može prijaviti, da grupa vidi tko
          dolazi na termin, i da postoji statistika. Nema profiliranja, nema oglasa.
        </p>
      </Odjeljak>

      <Odjeljak naslov="Tko ih vidi">
        <p>
          Samo <strong>odobreni članovi tvoje grupe</strong>. Termini i statistika nisu
          javno dostupni — traži se prijava i članstvo koje odobrava admin grupe.
        </p>
        <p>
          Podaci se ne prodaju i ne dijele ni s kim. Kao infrastrukturu koristimo
          Supabase (baza, poslužitelji u Njemačkoj) i Vercel (posluživanje stranice).
          Oni podatke obrađuju samo da bi aplikacija radila.
        </p>
      </Odjeljak>

      <Odjeljak naslov="Kolačići">
        <p>
          Koristi se samo kolačić koji te drži prijavljenim. Nema kolačića za praćenje
          ni analitike trećih strana.
        </p>
      </Odjeljak>

      <Odjeljak naslov="Koliko dugo">
        <p>
          Dok ne zatražiš brisanje. Pošalji poruku na{" "}
          <a href={`mailto:${KONTAKT}`} className="underline underline-offset-4">
            {KONTAKT}
          </a>{" "}
          i račun se briše.
        </p>
        <p>
          Napomena: statistika odigranih termina ostaje u grupi, ali bez veze s tobom —
          tvoje ime i email se uklanjaju.
        </p>
      </Odjeljak>

      <Odjeljak naslov="Tvoja prava">
        <p>
          Možeš tražiti uvid u svoje podatke, ispravak ili brisanje. Nadimak i oznaku
          golmana mijenjaš sam na stranici profila; za ostalo se javi na kontakt gore.
        </p>
      </Odjeljak>

      <p className="mt-10 text-sm text-slate-400">Zadnja izmjena: {ZADNJA_IZMJENA}</p>
    </main>
  );
}
