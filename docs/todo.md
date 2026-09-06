# To do

Zabilježene ideje i sitnice koje nisu dio MVP-a. Ovo je popis *što* i *zašto* —
kako se izvodi piše se tek kad se uzme u rad.

> Stavka se briše odavde tek kad je **odrađena, istestirana i na produkciji**.
> Ne kad je kod napisan i ne kad je commitan. Pravilo stoji u
> [README-u](../README.md#kako-se-vodi-docstodomd).

Veće odgođene stvari žive drugdje i ovdje se samo navode, da se ne traži na dva
mjesta:

- **Dodavanje termina u osobni kalendar** — [spec, 13.1](superpowers/specs/2026-09-05-memorijalni-termin-design.md)
- **Optimizacija potrošnje, koraci 3–5** — [optimizacija.md](optimizacija.md)
  (živi ekran, materijalizirana statistika, sitnice). Prva dva koraka su napravljena.

---

## 1. Profil člana dostupan s kartice Članovi

Na kartici **Članovi** treba se moći kliknuti na člana i otvoriti njegov profil sa
statistikom samo za tog igrača.

**Većina posla već postoji.** Stranica profila igrača je napravljena i pokazuje sve
što treba — `app/grupe/[grupaId]/igrac/[igracId]/page.tsx`:

| | |
|---|---|
| brojke | rating, golovi, asistencije, odigrani termini, golovi po terminu, pobjede–neriješeno–porazi, postotak pobjeda, dolaznost |
| nizovi | najduži niz dolazaka, trenutni niz |
| povijest | zadnjih 10 termina sa score-om i promjenom ratinga, svaki link na sažetak |

Ta se stranica trenutno otvara **samo s Ljestvice**. Na kartici Članovi nema ni
jednog linka na `/igrac/`.

### Što stvarno treba napraviti

1. U `app/grupe/[grupaId]/clanovi/page.tsx` omotati ime člana u `Link` na
   `/grupe/${grupaId}/igrac/${korisnikId}`.
2. **Popraviti povratak.** Profil igrača ima fiksni link „← Natrag na ljestvicu".
   Tko dođe s Članova, vratit će se na krivu karticu. Treba ga učiniti ovisnim o
   tome odakle se došlo — ili ga zamijeniti povratkom koji vodi natrag u prethodni
   prikaz.
3. Provjeriti članove **bez odigranog termina** — profil za njih već ima svoje
   stanje („Još nije odigrao nijedan termin u ovoj grupi"), pa se to ne mora
   dodavati, ali treba potvrditi da izgleda uredno kad se dođe s Članova, gdje su
   takvi članovi česti (novi, tek odobreni).

### Na što paziti

- Kartica Članovi prikazuje i članove **na čekanju** i one koji su izbačeni.
  Odlučiti vode li i njihova imena na profil ili samo aktivni članovi.
- Profil čita `dohvatiLjestvicu`, koja je od nedavno u predmemoriji s oznakom po
  grupi. To je u redu i ništa ne treba mijenjati — samo znati da se brojke na
  profilu osvježavaju kad završi termin, ne pri svakom otvaranju.

---

## 2. Prikaz učitavanja pri prelasku s kartice na karticu

Kad se s Ljestvice skoči na Članove, klik izgleda kao da se ništa nije dogodilo —
stara kartica stoji na ekranu dok se nova ne dovrši. Na mobitelu s lošijom vezom
to je dovoljno dugo da čovjek stisne drugi put.

**Uzrok nije sporost nego nedostatak granice učitavanja.** U cijeloj aplikaciji
nema **ni jednog** `loading.tsx` ni jednog `Suspense`. Bez toga App Router čeka da
se serverska komponenta dovrši prije nego išta iscrta, pa nema čega prikazati u
međuvremenu.

### Dva odvojena problema, dva različita rješenja

Treba oboje — rješavaju različite dojmove:

| Što fali | Rješenje |
|---|---|
| Nema povratne informacije na sam klik | `useLinkStatus()` u `Tabovi.tsx` — kartica koju si stisnuo odmah pokaže da radi |
| Nema ničega na ekranu dok se učitava | `loading.tsx` sa skeletonom |

`useLinkStatus` postoji u Nextu 16 i vraća `{ pending }`, ali radi **samo iz
komponente unutar `<Link>`** — dakle treba mala komponenta koja se ubaci u tab,
ne hook u samom `Tabovi`. Dokumentacija je u
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`.

### Gdje staviti `loading.tsx`

Najmanji zahvat je jedan zajednički na `app/grupe/[grupaId]/loading.tsx` — hvata
sve kartice odjednom. Ako se pokaže da skeleton treba izgledati različito po
karticama, tek onda praviti zasebne.

### Na što paziti

- **Skeleton mora imati istu visinu kao sadržaj koji zamjenjuje**, inače stranica
  poskoči kad se učita. Ljestvica ima tablicu poznate visine po članu, pa je to
  izvedivo.
- Ljestvica je od nedavno u predmemoriji i vraća se za 5 upita umjesto 10, pa je
  ona među bržima. **Članovi su sporiji** jer nisu predmemorirani — ondje se
  dobitak najviše osjeti.
- Ne dodavati spinner koji se vrti na sredini praznog ekrana. Skeleton koji ima
  oblik sadržaja djeluje brže, iako traje jednako.
