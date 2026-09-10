# To do

Zabilježene ideje i sitnice koje nisu dio MVP-a. Ovo je popis *što* i *zašto* —
kako se izvodi piše se tek kad se uzme u rad.

> Stavka se briše odavde tek kad je **odrađena, istestirana i na produkciji**.
> Ne kad je kod napisan i ne kad je commitan. Pravilo stoji u
> [README-u](../README.md#kako-se-vodi-docstodomd).

Veće odgođene stvari žive drugdje i ovdje se samo navode, da se ne traži na dva
mjesta:

- **UX poboljšanja (zadaci po prioritetu)** — [ux-zadaci.md](ux-zadaci.md)
- **Dodavanje termina u osobni kalendar** — [spec, 13.1](superpowers/specs/2026-09-05-memorijalni-termin-design.md)
- **Optimizacija potrošnje, koraci 3–5** — [optimizacija.md](optimizacija.md)
  (živi ekran, materijalizirana statistika, sitnice). Prva dva koraka su napravljena.

---

## 1. Ideja: povezivanje profila sa Stravom

> **Status:** ručni unos u `match_activity` (km / max / prosj. brzina na sažetku
> termina) je hobby put i prvi korak — brojke već idu u Statistiku i Ljestvicu.
> Strava ostaje odgođena; ako ikad dođe, vjerojatno samo vlastiti podaci.

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

Aplikacija **već zna točno kad je utakmica trajala** — `games` ima `started_at`,
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

