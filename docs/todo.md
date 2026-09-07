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

---

## 3. Razrada igrača: grupni i globalni rating

Igrač može biti u više grupa. Uz rating po grupi treba postojati i **globalni**,
koji ga prati kroz sve grupe u kojima igra.

**Grupni rating već postoji.** `player_ratings` je ključan na `(group_id, user_id)`,
a `profiles` ima jedan red po korisniku — dakle podjela je već napravljena, posao
je globalni rating i način na koji se prikazuje.

### Ovo treba pročitati prije nego se počne

Grupe su zatvorene i **nikad ne igraju jedna protiv druge**. Nema zajedničkih
protivnika između njih, pa ratinzi iz različitih grupa **nisu na istoj skali** —
1200 u jednoj grupi ne znači isto što i 1200 u drugoj. Ako je jedna grupa jača,
njezini igrači imaju niže brojke za istu kvalitetu.

Zato **globalni rating kao prosjek grupnih ne radi.** Izgledao bi kao broj koji
nešto znači, a ne bi značio.

Što radi: **jedan globalni rating koji se ažurira svakim odigranim terminom, u
kojoj god grupi bio.** Elo je nula-suma po terminu pa ostaje interno dosljedan.
Ali i tada mjeri „kako si prošao protiv onih s kojima si igrao", ne apsolutnu
kvalitetu. To treba i u sučelju biti jasno — ne predstavljati ga kao više nego
što jest.

### Zamka u shemi

`rating_history` ima samo `match_id, user_id, rating_before, rating_after` —
**nema stupca koji kaže o kojem se ratingu radi.** Sad je nedvosmisleno jer je
grupa izvediva preko `match_id → matches.group_id`. Čim postoje dva ratinga po
igraču po terminu, svaki red mora reći koji je koji — inače „zadnjih 10 termina s
promjenom ratinga" na profilu igrača prikazuje dvostruke redove bez objašnjenja.

### Gdje se to spaja

Rating upisuje `apply_rating`, funkcija sa `security definer` koju zove
`zavrsiTermin`. Definirana je u `supabase/migrations/20260906125103_events_ratings.sql`
i `20260906125106_rating_upsert.sql`, a prava su joj zatvorena u
`20260906220000_zatvori_apply_rating.sql`. Globalni rating se dodaje tu, u istoj
transakciji — ne zasebnim pozivom, da se dva ratinga ne mogu razići ako drugi
poziv padne.

### Na što još paziti

- Ljestvica je po definiciji **po grupi** i takva ostaje. Globalni rating ima
  smisla na profilu igrača, ne u grupnoj ljestvici.
- Početni rating je 1000 (`POCETNI_RATING`), K faktor 24 (`K_FAKTOR`). Odlučiti
  vrijedi li isti K za globalni — igrač koji igra u tri grupe skuplja tri puta
  više promjena, pa mu globalni rating skače tri puta brže.
- Predmemorija ljestvice ima oznaku **po grupi** (`ljestvica-<grupaId>`). Termin u
  jednoj grupi mijenja globalni rating, koji se vidi i u drugima — pa poništavanje
  po jednoj grupi više nije dovoljno ako se globalni rating negdje prikazuje uz
  predmemorirane podatke.

---

## 4. Ideja: povezivanje profila sa satom (Garmin, Strava)

Povezati profil igrača s analitikom sa sata i prikazati **pretrčane kilometre,
brzinu i puls** po terminu.

Status: **ideja**, nije istražena. Prije bilo kakvog koda treba razriješiti dvije
stvari ispod — obje mogu srušiti cijelu zamisao.

### 1. Ovo je u sukobu s onim što smo obećali

[Stranica o privatnosti](../app/privatnost/page.tsx) trenutno tvrdi:

> Ne spremamo broj telefona, adresu, **lokaciju uređaja** ni bilo kakve podatke o
> plaćanju.

Pretrčani kilometri i brzina **dolaze iz GPS-a** — to je lokacija uređaja. Puls je
podatak o zdravlju, što je po GDPR-u posebna kategorija i traži izričitu privolu,
ne samo kvačicu pri prijavi.

Znači: bez izmjene stranice o privatnosti i zasebne privole po igraču ovo se ne
smije uključiti. Nije formalnost — trenutačni tekst je obećanje koje bi ova
funkcija prekršila.

### 2. Treba provjeriti uvjete API-ja, ne pretpostaviti

Ne zna se je li ovo uopće izvedivo besplatno. **Provjeriti na izvoru prije
odluke**, jer se uvjeti obiju platformi mijenjaju:

- **Strava** ima javni OAuth API s ograničenjima broja poziva. Povijesno je
  zaoštravala uvjete oko toga što se smije prikazivati trećim stranama — treba
  pročitati aktualni API agreement, ne stariji članak.
- **Garmin** pristup ide preko razvojnog programa uz odobrenje zahtjeva.
  Provjeriti prima li uopće nekomercijalne projekte.

Ako ni jedno nije besplatno i dostupno, ideja pada ili se svodi na ručni upis.

### Što nam ide na ruku

Aplikacija **već zna točno kad je termin trajao** — `matches` ima `started_at`,
`paused_at` i `ended_at`, jer se vrijeme mjeri štopericom u aplikaciji. Aktivnost
sa sata se onda spaja na termin **preklapanjem vremena**, bez da igrač bilo što
odabire. To je najveći dio posla koji je već rješen.

### Na što paziti

- **Neće svi imati sat.** Brojke moraju biti dodatak na profilu, a ne nešto po
  čemu se rangira — inače ljestvica kažnjava one koji nemaju sat. Ovo je odluka o
  proizvodu, ne o kodu.
- **Tokeni.** OAuth refresh token po igraču je tajna; ide u tablicu zatvorenu
  RLS-om i nikad se ne šalje klijentu. Nikako ne u `profiles`, koji čitaju svi
  članovi grupe.
- **Potrošnja.** Povlačenje aktivnosti znači ili webhook ili periodično
  provjeravanje, što je novi izvor zahtjeva. Vidjeti [optimizacija.md](optimizacija.md)
  prije nego se doda periodično povlačenje.
- Puls smije vidjeti **samo sam igrač**, ne cijela grupa.
