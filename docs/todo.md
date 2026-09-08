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

## 1. Ideja: povezivanje profila sa Stravom

Povezati profil igrača sa Stravom i prikazati **pretrčane kilometre, brzinu i
puls** po terminu.

**Cilj MVP-a:** igrač klikne `Poveži Stravu`, odobri pristup, i aplikacija može
dohvatiti njegove aktivnosti i povezati odgovarajuću s terminom.

**Zašto se to želi:** usporedba u statistici — tko više pretrči, tko je brži trkač
— i eventualno kao dodatni ulaz u slaganje ekipa. Drugi dio je zamka, vidi
„Trkačke brojke i slaganje ekipa" niže.

### Zašto samo Strava, a ne Garmin

Strava se radi prva jer je najjednostavnija za početnu integraciju:

- Jednostavan OAuth 2.0 tok za povezivanje računa.
- Javno dokumentiran API za dohvat aktivnosti.
- Daju se distanca, trajanje, puls, kalorije, GPS ruta — ovisno o dozvolama i o
  tome što je uređaj snimio.
- **Ne treba integracija sa svakim proizvođačem sata.** Garmin, Apple Watch i
  ostali sami sinkroniziraju u Stravu.

### Normalizirani sloj je glavna arhitekturna odluka

Podaci se iz Strave spremaju u **vlastiti, normaliziran oblik** (`Activity`), pa
ostatak aplikacije ne zna ništa o Stravi. Time se Garmin i drugi mogu dodati
kasnije kao još jedan izvor, bez diranja ičega iznad tog sloja.

Ovo treba napraviti **od prvog dana**, ne poslije. Ako Strava procuri u statistiku
i profil, dodavanje drugog izvora znači prepisivanje svega — a upravo je
izbjegavanje toga razlog da se počne od Strave.

### Trkačke brojke i slaganje ekipa

Ideja je da se po tim podacima igrače bolje raspodijeli u ekipe. Prije toga dvije
stvari koje treba svjesno odlučiti:

1. **Elo već mjeri ono što slaganje ekipa treba.** Odgovara na „tko čini da mu
   ekipa pobjeđuje". Trkačke brojke odgovaraju na „tko više trči" — a brži trkač
   nije nužno bolji igrač. Ako oboje ulazi u `suggestTeams`, može se dogoditi da
   se međusobno gaze. Nije samo po sebi loše, ali mora biti namjerno.
2. **Neće svi imati Stravu.** Ako trkačke brojke ulaze u slaganje ekipa, igrači
   bez njih se ne mogu ravnopravno rasporediti. `suggestTeams` ionako već ima
   prag (`MIN_TERMINA_ZA_RATING`) prije nego Elo uopće proradi — isto pitanje
   vrijedi i ovdje, samo je teže jer nedostatak podataka nije privremen nego
   trajan za onoga koji nema sat.

Sigurna prva verzija: brojke **samo prikazati** u statistici i na profilu, bez
ikakvog utjecaja na ekipe. Utjecaj na ekipe je zasebna odluka koja se donosi kad
se vidi ima li tih podataka dovoljno da nešto znače.

### Ovo je u sukobu s onim što smo obećali

[Stranica o privatnosti](../app/privatnost/page.tsx) trenutno tvrdi:

> Ne spremamo broj telefona, adresu, **lokaciju uređaja** ni bilo kakve podatke o
> plaćanju.

Pretrčani kilometri i brzina **dolaze iz GPS-a** — to je lokacija uređaja. Puls je
podatak o zdravlju, što je po GDPR-u posebna kategorija i traži izričitu privolu,
ne samo kvačicu pri prijavi.

Znači: bez izmjene stranice o privatnosti i zasebne privole po igraču ovo se ne
smije uključiti. Nije formalnost — trenutačni tekst je obećanje koje bi ova
funkcija prekršila.

### Provjeriti aktualne uvjete Strave, ne pretpostaviti

Strava ima javni OAuth API s ograničenjima broja poziva, ali je povijesno
**zaoštravala uvjete** oko toga što se smije prikazivati trećim stranama.

Prije nego se počne, pročitati **aktualni Strava API agreement na izvoru** — ne
stariji članak ni tuđi vodič. Konkretno provjeriti smije li se tuđa aktivnost
prikazivati drugim članovima grupe, jer cijela ideja usporedbe u statistici stoji
na tome. Ako ne smije, ostaje prikaz samo vlastitih brojki.

### Što nam ide na ruku

Aplikacija **već zna točno kad je termin trajao** — `matches` ima `started_at`,
`paused_at` i `ended_at`, jer se vrijeme mjeri štopericom u aplikaciji. Aktivnost
se onda spaja na termin **preklapanjem vremena**, bez da igrač bilo što odabire.
To je najveći dio posla koji je već riješen.

### Na što paziti

- **Tokeni.** OAuth refresh token po igraču je tajna; ide u tablicu zatvorenu
  RLS-om i nikad se ne šalje klijentu. Nikako ne u `profiles`, koji čitaju svi
  članovi grupe.
- **Potrošnja.** Povlačenje aktivnosti znači ili webhook ili periodično
  provjeravanje, što je novi izvor zahtjeva. Vidjeti [optimizacija.md](optimizacija.md)
  prije nego se doda periodično povlačenje.
- Puls smije vidjeti **samo sam igrač**, ne cijela grupa.

---

## 2. Stalni termin

Mogućnost da se termin označi kao **stalni**, da se za grupu koja ionako igra
svaki tjedan ne mora svaki put otvarati novi.

**Stalni znači tjedni — jedan put u tjednu, i ništa drugo.** Nema dvotjednih,
mjesečnih ni „svaki drugi četvrtak". To nije ograničenje koje treba kasnije
proširivati, nego namjeran obuhvat.

Primjer: *svaki ponedjeljak u 18:00, dok se stalni termin ne ugasi.*

**Nema datuma završetka.** Traje neograničeno i prestaje samo kad ga netko ugasi.
Dakle u modelu ne treba `zavrsava_na`, nego **stanje uključeno/ugašeno** (npr.
`ugasen_at`, ili `aktivan boolean`). Kad se ugasi, već stvorene i vidljive pojave
ostaju — one su stvarni termini s prijavama; prestaje se samo stvarati nove.

Zato **ne treba općeniti sustav ponavljanja** (RRULE i slično). Dovoljna su tri
podatka: **dan u tjednu, satnica i dvorana**, plus to stanje. Sve ostalo se
izračuna.

Iz tjednog razdoblja slijedi i prozor vidljivosti od 6 dana — vidi niže.

### Kad se pojavljuje i zašto točno 6 dana

Novi termin se na kartici pojavljuje **6 dana prije početka**, ne 7.

Razlog: kod tjednog termina je sljedeći točno 7 dana kasnije. Da je prozor 7 dana,
sljedeći bi se pojavio **u trenutku kad tekući počinje** — pa bi dva termina
stajala pod „Nadolazeći" istovremeno. Sa 6 dana se sljedeći pojavi dan nakon
odigranog.

**Ne mijenjati na 7 misleći da je zaokruženije.** Broj je takav namjerno.

Time popis nadolazećih ostaje kratak, a povijesni termini pregledni — što je i
cijela svrha.

### Dva načina izvedbe, treba odabrati

| | Kako | Problem |
|---|---|---|
| **Unaprijed** | `pg_cron` u Supabaseu stvara red 6 dana prije | Treba zakazani posao, ali baza je ionako tu — bolje od Vercelovog crona, kojemu treba provjeriti ograničenja na besplatnom planu |
| **Lijeno** | red se stvori kad netko otvori popis i prozor je otvoren | Čitanje bi pisalo; dva posjetitelja istovremeno mogu stvoriti dva termina |

Lijeni način je izvediv i ne traži ništa zakazano, **ali samo uz jedinstveni
indeks** na pojavu termina — npr. `unique (group_id, starts_at)` ili
`unique (stalni_id, starts_at)` — plus `on conflict do nothing`. Bez toga se
duplikati dogode prvi put kad dvojica otvore aplikaciju u istoj sekundi.

Red **mora postojati prije nego se ikto prijavi**, jer `match_signups` ima strani
ključ na `matches`. Dakle trenutak pojavljivanja i trenutak stvaranja su isti.

### Ovo treba popraviti prije nego stalni termin proradi

`getMatches` u `lib/data/matches.ts` **dohvaća sve termine grupe i sve
njihove prijave, bez `limit`**. Ograničenje na 20 postoji samo u prikazu
(`app/grupe/[grupaId]/page.tsx`, past slice), ne u upitu.

Danas je to bezopasno jer grupa ima jedan termin. Stalni termin znači ~52 termina
i preko 600 redova prijava **po godini**, sve dohvaćeno pri svakom otvaranju
kartice Termini. Znači: `limit` ide u upit, a prijave se dohvaćaju samo za termine
koji se prikazuju.

> Napomena: `optimizacija.md` je do sada tvrdio da je popis „već ograničen na 20".
> To nije bilo točno i ispravljeno je.

### Zamka: „ponedjeljkom u 18" je lokalno vrijeme, ne fiksni UTC interval

Svaka pojava se mora izračunati iz **dana u tjednu i satnice po zagrebačkom
satu**, pomoću postojećeg `zagrebUIso(datum, satnica)` iz `lib/format.ts` — koji
uzima stvarni pomak zone za taj trenutak.

**Nikako ne dodavati 7 × 24 h na `starts_at` prethodne pojave.** To puca dvaput
godišnje, pri prelasku na ljetno i zimsko vrijeme. Provjereno na stvarnom datumu:

```
pojava 1              : pon 19.10.2026. u 18:00
+7 × 24 h u UTC-u     : pon 26.10.2026. u 17:00   ← sat prerano
željeno               : pon 26.10.2026. u 18:00
```

Prelazak na zimsko vrijeme je 25.10.2026., dan prije te pojave. Ekipa bi došla u
18, a termin bi u aplikaciji stajao na 17.

### Na što još paziti

- **Otkazivanje jedne pojave naspram cijele serije.** Ako netko otkaže termin,
  otkazuje li taj tjedan ili stalni termin prestaje? Moraju biti dvije različite
  radnje, inače će netko slučajno ugasiti cijelu seriju.
- **Promjena satnice ili dvorane** mijenja li samo buduće pojave ili i onu koja je
  već vidljiva i na koju su se ljudi prijavili? Već vidljiva pojava je stvaran
  termin s prijavama i ne smije se tiho pomaknuti.
- **Ljetna pauza** je pokrivena istim stanjem uključeno/ugašeno — ugasi se u
  šestom, upali u devetom mjesecu. Zato to stanje mora biti **lako prebaciti i
  vratiti**, a ne radnja koja briše stalni termin; inače ga ekipa preko ljeta
  ugasi i u jesen mora ponovno unositi dan, satnicu i dvoranu.
- Sezona se veže po datumu termina, pa pojava stvorena u siječnju automatski ide u
  novu sezonu — to već radi i ne treba ništa dodavati.

---

## 3. Ponovno pokretanje utakmice unutar termina

Mogućnost da se utakmica pokrene ispočetka: **rezultat, minutaža, golovi i
asistencije kreću od nule**, a dotadašnje stanje se spremi. Nakon toga se igrači
smiju izmiješati u nove ekipe, ali ne moraju.

### Ovo nije „reset" nego više utakmica po terminu

Zahtjev kaže da se dotadašnje stanje **spremi**. To znači da stara utakmica ostaje
kao zapis — dakle jedan termin sadrži N utakmica. **Ta razina u modelu ne
postoji.**

Sada je jedan red u `matches` istovremeno termin *i* utakmica. Na njemu stoji
sve: `score_a`, `score_b`, `started_at`, `paused_at`, `total_paused_seconds`,
`status`. Događaji gledaju u `match_id`, a postava je `match_lineup(match_id,
user_id, team)` — **jedna postava po terminu**.

Treba razina između termina i događaja: tablica utakmica, a rezultat, sat, događaji
i postava vise o njoj, ne o terminu.

### Najveće pitanje je rating

`apply_rating` po završetku digne `matches_played + 1` i upiše **jedan red u
`rating_history` po igraču**. `rating_history` je keyed na `(match_id, user_id)` i
**nema stupac za utakmicu**.

Iz toga slijede dvije stvari:

1. **Računa li se svaka utakmica zasebno za rating?** Ako se ekipe izmiješaju
   između utakmica, **mora** — inače se rating računa protiv protivnika s kojima
   igrač te utakmice nije igrao, što je jednostavno pogrešno.
2. Ako se računa zasebno, `rating_history` dobiva N redova po igraču po terminu
   koji izgledaju **identično**, i „zadnjih 10 termina s promjenom ratinga" na
   profilu igrača postaje neupotrebljivo. Isti nedostatak je već zapisan u
   stavci 1 — riješiti ga jednom, za oba slučaja.

### Statistika mijenja značenje

`aggregateStats` broji `matches += 1` po redu utakmice i iz toga izvodi
`goalsPerMatch` i `winRate`. S više utakmica po terminu „matches" postaje
dvosmisleno:

- **Dolaznost** je po terminu — čovjek je došao ili nije.
- **Golovi po utakmici** i **postotak pobjeda** su po utakmici.

To su različiti brojevi i moraju se svjesno razdvojiti. Paziti da promjena
**retroaktivno mijenja postojeće brojke** — dosadašnji termini imaju po jednu
utakmicu, pa se brojke ne smiju razići.

### Na što paziti

- **Postava nove utakmice mora biti kopija, ne referenca.** Ako druga utakmica
  gleda u istu postavu, izmjena ekipa za drugu utakmicu prepiše povijest prve.
  Zadana vrijednost je kopija prethodne postave, pa se smije mijenjati.
- Sat se vodi iz `started_at` po utakmici, ne po terminu — inače druga utakmica
  počinje na minutaži prve. Vidi `lib/domain/timer.ts`.
- Ako se ekipe **ne** izmiješaju, ovo je i dalje nova utakmica s vlastitim
  rezultatom, ne nastavak stare.

