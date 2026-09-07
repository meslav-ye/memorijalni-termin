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

## 4. Ideja: povezivanje profila sa Stravom

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

## 5. Stalni termin

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

`dohvatiTermine` u `lib/podaci/termini.ts` **dohvaća sve termine grupe i sve
njihove prijave, bez `limit`**. Ograničenje na 20 postoji samo u prikazu
(`app/grupe/[grupaId]/page.tsx`, `.slice(0, 20)`), ne u upitu.

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

## 6. Ponovno pokretanje utakmice unutar termina

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
   stavci 3 — riješiti ga jednom, za oba slučaja.

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

---

## 7. Ručno dodavanje ljudi u termin

Netko potvrdi u WhatsAppu da dolazi, a zaboravi se prijaviti u aplikaciji. Treba
ga se moći prijaviti umjesto njega.

### Konkretna prepreka

RLS pravilo za unos prijava je **`prijave: prijavi samo sebe`** (INSERT). Pravila
za UPDATE i DELETE su „svoju ili kao admin".

Znači: **admin već sad može nekoga odjaviti, ali ga ne može prijaviti.** Ta
asimetrija je cijeli posao — treba INSERT pravilo koje dopušta unos tuđe prijave.

### Treba odlučiti kome se to dopušta

Aplikacija je dosad namjerno popustljiva: termin pokreće bilo tko iz postave,
ekipe ispravlja bilo tko u grupi. Ali dodavanje **tuđe** prijave zauzima mjesto u
postavi, što je drugačije od ispravljanja ekipa.

Predlažem prvo **samo admin**, jer je to uža promjena i poklapa se s postojećim
pravilima za UPDATE i DELETE. Proširiti na sve članove je poslije lako; suziti
nije.

### Mjesto na listi čekanja

`splitSignups` poredak vodi po `signed_up_at`, uz `manual_order` kad postoji.
Ručno dodan igrač zato završi **na kraju**, što je i ispravno kad se doda u
zadnji trenutak.

Ali ako je čovjek u WhatsAppu potvrdio tri dana ranije, zaslužuje li svoje mjesto?
`manual_order` to već može izraziti — treba samo odlučiti radi li se to i po kojem
pravilu. Ako se ne odluči, dogodit će se svađa oko toga tko je 12. a tko 13.

### Na što paziti

- **Dodani čovjek to ne zna.** Nema notifikacija, pa saznaje samo ako otvori
  aplikaciju. Ako je dodan greškom, može se odjaviti sam — DELETE to već dopušta.
- Preko kapaciteta ne treba ništa: 13. prijava sama ide na čekanje kroz
  `splitSignups`.
- Isti ekran neka omogući i **odjavu tuđe prijave**, jer je to zrcalni slučaj i
  DELETE pravilo ga već dopušta.

---

## 8. Preimenovanje ekipa pri slaganju

Kad se slažu ekipe, treba im se moći dati ime umjesto „Ekipa A" i „Ekipa B" —
npr. „Bijeli" i „Šareni", ili kako se ekipa te večeri prozove.

### Ime je oznaka, ne identitet — ne dirati enum

U bazi postoji enum **`team_side` s vrijednostima `A` i `B`**. Na njemu stoji
`match_lineup.team`, `match_events.team` i `score_a` / `score_b`.

**Taj enum ostaje kakav je.** Preimenovanje mijenja samo ono što se ispisuje.
Tko pokuša preimenovati same vrijednosti enuma, ruši svaki dosad upisani gol i
svaku postavu.

Imena idu u dva nova stupca (npr. `team_a_name`, `team_b_name`), oba prazna po
zadanom, s ispisom „Ekipa A" / „Ekipa B" kad nisu postavljena.

### Tri mjesta gdje je „Ekipa A" zakucana

Sve tri treba prebaciti na isti izvor imena:

| Gdje | Datoteka |
|---|---|
| slaganje ekipa | `app/grupe/[grupaId]/termin/[terminId]/ekipe/page.tsx` (`naslov="Ekipa A"`, `"Ekipa B"`) |
| ekran uživo | `app/grupe/[grupaId]/termin/[terminId]/uzivo/EkranUzivo.tsx` |
| sažetak | `app/grupe/[grupaId]/termin/[terminId]/sazetak/page.tsx` — ispisuje `Ekipa {strana}`, dakle slovo iz enuma; treba mu isto pretraživanje imena |

### Ograničenje duljine nije kozmetika

Ekran uživo je pravljen za korištenje **jednom rukom pored terena**, s dvije ploče
ekipa jednu uz drugu. Dugo ime razbija taj raspored na užem mobitelu.

Zato ime treba **ograničiti u duljini** (nešto poput 12–14 znakova) i skraćivati
pri ispisu, a ne pustiti slobodan tekst. Provjeriti na 375 px širine, koliko je
iPhone SE.

### Na što paziti

- **Sudar sa stavkom 6.** Ako se uvedu više utakmica po terminu, ekipe se
  između utakmica premiješaju — pa imena onda pripadaju **utakmici, ne terminu**.
  Ako se radi prvo ova stavka, stupce staviti tako da se lako premjeste; ako se
  prvo radi stavka 6, imena odmah staviti na utakmicu.
- Preimenovanje smije **bilo koji član grupe**, isto kao i ispravljanje ekipa —
  tako je već postavljeno pa nema razloga za drukčije.
- Ako se ekipa preimenuje nakon odigranog termina, mijenja se i ispis u sažetku
  starog termina. To je u redu, samo neka se zna.

---

## 9. Kod mora biti na engleskom

Trenutno je **mješovit**, i to bez pravila — pa se pri svakoj novoj datoteci
pogađa. Treba ga svesti na engleski.

### Što je gdje sada, izmjereno

| Sloj | Stanje |
|---|---|
| `lib/podaci/` | **hrvatski** — `dohvatiLjestvicu`, `dohvatiTermine`, `dohvatiKorisnika`, `dohvatiClanstvo`, `jeClan`, `jeAdmin`, `oznakaLjestvice` |
| server akcije u `app/` | **hrvatski** — `upisiGol`, `zavrsiTermin`, `pokreniTermin`, `odobriClana`, `kreirajTermin`, `otkaziTermin`, … |
| `lib/domain/` | **mješovito** — engleski gdje pojam ima standardno ime (`aggregateStats`, `computeElo`, `elapsedSeconds`, `splitSignups`, `suggestTeams`, `findRecentDuplicate`, `formatClock`), hrvatski inače (`mozeSePokrenuti`, `odKadaSePokrece`, `popunjenost`, `normalizirajNadimak`, `provjeriNadimak`, `razlikujNadimke`) |
| konstante | **hrvatski** — `POCETNI_RATING`, `K_FAKTOR`, `MINUTA_PRIJE_POCETKA`, `MIN_TERMINA_ZA_RATING`, `MAX_DULJINA` |
| tipovi | **mješovito** — `MatchForStats`, `PlayerStats`, `SignupRow` naspram `Dolaznost`, `EloUlaz`, `EloIzlaz`, `Popunjenost`, `RezultatProvjere`, `IgracZaOznaku`, `Ton` |
| komponente i datoteke | **hrvatski** — `EkranUzivo.tsx`, `Tabovi.tsx`, `akcije.ts`, `podaci/`, `statistika.ts` |
| komentari | **hrvatski bez dijakritike**, dosljedno svugdje |
| stupci u bazi | **engleski** — `starts_at`, `score_a`, `match_lineup`, `player_ratings` |

Stupci u bazi su već engleski, pa migracije i tipovi iz baze ne trebaju ništa.

### Granica koju se NE smije prijeći

**Tekst koji korisnik vidi ostaje hrvatski.** Aplikacija je namjerno samo na
hrvatskom — „Prijavi se", „Fali još 7", „Ekipa A", „još nitko", poruke o
greškama, nazivi kartica. To nije kod, to je sadržaj.

Isto vrijedi za **domenske riječi koje nemaju dobar prijevod**: „termin" nije
„match" ni „session" — to je pojam iz ovog društva i u tekstu sučelja ostaje
termin. U kodu smije biti `match`, jer tako se već zove tablica.

### Kako to izvesti, a da se ne razbije

- **Ne u jednom potezu.** Preimenovanje `dohvatiLjestvicu` dira 11 stranica i
  predmemoriju s oznakom; server akcije su vezane na `<form action={...}>`.
- Ide sloj po sloj, svaki sloj svoj commit, uz `pnpm typecheck && pnpm lint &&
  pnpm test && pnpm build` nakon svakog. Testovi (114) hvataju domenski sloj;
  ostalo hvata typecheck.
- Krenuti od `lib/domain/`, jer je najmanje vezan i već je pola engleski.
- Komentare prevoditi **uz datoteku koja se ionako mijenja**, ne u zasebnom
  prolazu kroz cijeli repo — takav commit je nečitljiv u pregledu.
- Kad se sloj prevede, u `AGENTS.md` ili `README.md` zapisati pravilo, da se
  sljedeći put ne pogađa.
