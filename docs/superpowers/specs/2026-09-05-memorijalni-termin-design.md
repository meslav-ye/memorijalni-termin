# Memorijalni termin — specifikacija aplikacije

**Datum:** 2026-09-05
**Repozitorij:** https://github.com/meslav-ye/memorijalni-termin
**Status:** dizajn odobren, spremno za izradu plana implementacije

---

## 0. Kako čitati ovaj dokument

Ovo je specifikacija iz koje se aplikacija gradi. Piše **što** aplikacija radi i **kako izgleda izvana**, uz dovoljno tehničkog detalja da se može implementirati bez novih pitanja.

Sve što je označeno kao **Faza 2+** namjerno se **ne** gradi u prvoj verziji, ali model podataka mora biti takav da to kasnije ne traži prepisivanje.

Jezik sučelja i podataka je **hrvatski**. Vremenska zona je **Europe/Zagreb**.

---

## 1. Cilj

Web aplikacija za organizaciju i praćenje rekreativnih nogometnih **5v5 termina** za zatvoreno društvo (~15–40 ljudi).

Aplikacija pokriva cijeli ciklus:

```
Grupa → Termin → Prijave → Ekipe → Termin uživo → Statistika
```

Radi jednako na laptopu i na mobitelu, s time da je **mobitel primarni uređaj** — posebno ekran "Termin uživo", koji se koristi stojeći pored terena, jednom rukom, po lošem vremenu.

---

## 2. Donesene odluke (sažetak)

| Odluka | Izbor | Obrazloženje |
|---|---|---|
| Doseg prve faze | Zatvoreno, samo jedno društvo | Nema javne registracije u grupe, nema moderiranja, nema spam zaštite |
| Grupe | Temeljni entitet od prvog dana | Svaki termin i svaka statistika pripadaju točno jednoj grupi |
| Prijava u aplikaciju | Google + magic link + email/lozinka | Sve tri metode; Apple **odgođen** (vidi 3.1) |
| Ulazak u grupu | Link za pozivnicu + odobrenje admina | Link se dijeli u WhatsApp, admin potvrđuje zahtjev |
| Prava | Admin + član | Dvije uloge, bez međurazine |
| Prijave na termin | Kvota + lista čekanja | Automatsko popunjavanje kad netko otkaže |
| Slaganje ekipa | Automatski prijedlog + ručna korekcija, bilo tko iz grupe | Nema zaključavanja ekipa na admina |
| Struktura termina | Jedan termin = jedna utakmica | Jedna štoperica, jedan rezultat |
| Unos statistike uživo | Svi prijavljeni s klupe mogu unositi | Traži živu sinkronizaciju i zaštitu od duplog unosa |
| Zapis gola | Ekipa + strijelac + asistent + autogol | Minuta se uzima automatski iz štoperice |
| Golman | Oznaka na profilu igrača, prepravljiva po terminu | Vidi 4.1, 4.8 i 7.2 |
| Rating igrača | Automatski iz rezultata (Elo), svi kreću jednaki | Bez ručnog ocjenjivanja ljudi |
| Obavijesti | Link za dijeljenje u WhatsApp | Push je Faza 2+ |
| Hosting | Besplatni tier (0 €/mj) | Vidi poglavlje 3 |

---

## 3. Tehnologija

| Sloj | Izbor |
|---|---|
| Sučelje | **Next.js** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui** |
| Baza podataka | **Supabase Postgres** |
| Prijava korisnika | **Supabase Auth** |
| Živa sinkronizacija | **Supabase Realtime** (websocket) |
| Sigurnost podataka | **Row Level Security (RLS)** u Postgresu |
| Hosting sučelja | **Vercel** (Hobby plan) |
| Regija baze | **EU — Frankfurt** (latencija iz HR + GDPR) |

### 3.1 Ograničenja besplatnog tiera — MORA se znati unaprijed

1. **Apple prijava nije besplatna.** "Sign in with Apple" traži plaćeno Apple Developer članstvo (~99 USD/god). Prva verzija zato podržava **Google, magic link i email+lozinku**. Apple se doda samo ako se članstvo plati.
2. **Supabase besplatni projekt se pauzira nakon ~7 dana neaktivnosti.** Kod tjednih termina se to neće dogoditi, ali nakon duže pauze (npr. ljeto) treba jedan klik u Supabase panelu da se projekt probudi.
3. **Vercel Hobby plan je za nekomercijalnu upotrebu.** Ovaj projekt je hobi, pa je u redu. Ako ikad postane komercijalan, treba plaćeni plan.
4. **Aktualne limite (veličina baze, broj korisnika, promet) provjeriti uživo prije početka izrade** — mijenjaju se i ne smiju se pretpostavljati iz sjećanja.

### 3.2 Razmatrane alternative (odbačene)

- **Cloudflare Pages + Workers + D1** — nema pauziranja i vrlo velikodušan besplatni tier, ali auth (Google + magic link + lozinka) se piše ručno, a živa sinkronizacija traži Durable Objects. Previše posla za dobiveno.
- **PocketBase na Oracle Cloud Always Free VPS-u** — najjeftinije dugoročno, auth i realtime ugrađeni, ali traži vlastito održavanje servera, backupe i TLS. Odbačeno jer je tražen hosting bez vlastitog servera.

---

## 4. Model podataka

Sve tablice su u Postgresu. Nazivi tablica i stupaca su na engleskom (standard), a **sav tekst prema korisniku je na hrvatskom**.

### 4.1 `profiles`
Proširuje `auth.users` iz Supabase Autha.

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | Ime i prezime |
| `nickname` | text | Nadimak — ovo se prikazuje na ekranu uživo (kratko!) |
| `avatar_url` | text null | Iz Google prijave ili prazno |
| `is_goalkeeper` | boolean, default `false` | **Oznaka golmana na razini profila** |
| `created_at` | timestamptz | |

### 4.2 `groups`

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | npr. "Utorak 20h" |
| `description` | text null | |
| `invite_code` | text unique | 8 znakova, koristi se u linku za pozivnicu |
| `default_capacity` | int, default `10` | Predložena kvota za nove termine |
| `created_by` | uuid → profiles | |
| `created_at` | timestamptz | |

### 4.3 `group_members`

| Stupac | Tip | Napomena |
|---|---|---|
| `group_id` | uuid → groups | |
| `user_id` | uuid → profiles | |
| `role` | enum `admin` \| `member` | |
| `status` | enum `pending` \| `active` \| `removed` | `pending` = čeka odobrenje admina |
| `joined_at` | timestamptz null | |

PK: (`group_id`, `user_id`)

### 4.4 `locations`

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `group_id` | uuid → groups | |
| `name` | text | npr. "Dvorana Trnje" |
| `address` | text null | |
| `maps_url` | text null | Link na kartu, otvara se u novom prozoru |

### 4.5 `seasons`

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `group_id` | uuid → groups | |
| `name` | text | npr. "2026" |
| `starts_on` | date | |
| `ends_on` | date | |

Sezona se automatski kreira kao kalendarska godina. Termin se veže na sezonu prema svom datumu.

### 4.6 `matches` (termini)

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `group_id` | uuid → groups | |
| `season_id` | uuid → seasons | |
| `location_id` | uuid → locations null | |
| `location_text` | text null | Ako lokacija nije spremljena, slobodan unos |
| `starts_at` | timestamptz | Datum i vrijeme termina |
| `capacity` | int | Kvota, default iz grupe |
| `notes` | text null | npr. "ponesi bijeli i tamni dres" |
| `status` | enum — vidi 5.1 | |
| `started_at` | timestamptz null | Kad je pritisnut *Pokreni termin* |
| `paused_at` | timestamptz null | Ako je štoperica trenutno pauzirana |
| `total_paused_seconds` | int, default `0` | Zbroj svih dosadašnjih pauza |
| `ended_at` | timestamptz null | |
| `score_a` | int, default `0` | Denormalizirano radi brzine; izvor istine je `match_events` |
| `score_b` | int, default `0` | |
| `created_by` | uuid → profiles | |

### 4.7 `match_signups` (prijave)

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `match_id` | uuid → matches | |
| `user_id` | uuid → profiles | |
| `signed_up_at` | timestamptz | Određuje redoslijed na listi čekanja |
| `manual_order` | int null | Admin može ručno preurediti listu |
| `cancelled_at` | timestamptz null | Ako je otkazao |

Unique: (`match_id`, `user_id`)

Status prijave (*prijavljen* / *lista čekanja*) se **ne sprema**, nego izračunava — vidi 7.1.

### 4.8 `match_lineup` (postava po ekipama)

| Stupac | Tip | Napomena |
|---|---|---|
| `match_id` | uuid → matches | |
| `user_id` | uuid → profiles | |
| `team` | enum `A` \| `B` | |
| `is_goalkeeper` | boolean, default `false` | **Predpopunjeno iz `profiles.is_goalkeeper`, prepravljivo po terminu** |

PK: (`match_id`, `user_id`)

### 4.9 `match_events` (događaji u terminu)

Ovo je **izvor istine** za sve što se dogodilo u terminu.

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `match_id` | uuid → matches | |
| `type` | enum `goal` \| `own_goal` \| `keeper_change` \| `pause` \| `resume` | |
| `team` | enum `A` \| `B` null | Ekipa **kojoj se pripisuje gol** |
| `scorer_id` | uuid → profiles null | Kod autogola: igrač koji ga je zabio |
| `assist_id` | uuid → profiles null | |
| `elapsed_seconds` | int | Sekunde od početka utakmice, bez pauza |
| `created_by` | uuid → profiles | Tko je unio |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz null | **Meko brisanje** — ništa se ne briše fizički |
| `deleted_by` | uuid → profiles null | |

### 4.10 `player_ratings`

| Stupac | Tip | Napomena |
|---|---|---|
| `group_id` | uuid → groups | |
| `user_id` | uuid → profiles | |
| `rating` | int, default `1000` | |
| `matches_played` | int, default `0` | |
| `updated_at` | timestamptz | |

PK: (`group_id`, `user_id`)

### 4.11 `rating_history`

| Stupac | Tip | Napomena |
|---|---|---|
| `id` | uuid PK | |
| `match_id` | uuid → matches | |
| `user_id` | uuid → profiles | |
| `rating_before` | int | |
| `rating_after` | int | |

Postoji da se rating može **ponovno izračunati** ako admin naknadno ispravi rezultat.

---

## 5. Životni ciklus termina

### 5.1 Stanja

```
                 ┌──────────────┐
                 │  najavljen   │  prijave otvorene
                 └──────┬───────┘
                        │ ekipe složene / admin zaključa
                 ┌──────▼───────┐
                 │  zakljucan   │  prijave zatvorene, ekipe vidljive
                 └──────┬───────┘
                        │ "Pokreni termin"
                 ┌──────▼───────┐
                 │  u_tijeku    │  štoperica radi, unos golova aktivan
                 └──────┬───────┘
                        │ "Završi termin"
                 ┌──────▼───────┐
                 │  zavrsen     │  statistika obračunata, rating ažuriran
                 └──────────────┘

  najavljen / zakljucan ──────► otkazan
```

Pravila:
- **`najavljen`** — svatko se prijavljuje i odjavljuje. Ekipe se mogu slagati unaprijed.
- **`zakljucan`** — nema novih prijava. Admin zaključava ručno; automatski se zaključava 1 sat prije `starts_at`.
- **`u_tijeku`** — gumb *Pokreni termin* je vidljiv **samo na dan termina** (i to od 2 sata prije `starts_at`). Štoperica kreće od 00:00.
- **`zavrsen`** — unos golova staje. Rating se preračuna. **Admin još 24 h može ispravljati događaje**; svaka ispravka ponovno preračunava rating iz `rating_history`.
- **`otkazan`** — termin ostaje vidljiv u povijesti, ne ulazi u statistiku.

### 5.2 Štoperica

Ne sprema se broj sekundi koji "tiktače" u bazi. Sprema se:
- `started_at` — kad je termin pokrenut
- `paused_at` — trenutak zadnje pauze ili `null`
- `total_paused_seconds` — zbroj prethodnih pauza

Proteklo vrijeme se **računa u pregledniku** iz tih vrijednosti:

```
ako je pauzirano:  proteklo = (paused_at - started_at) - total_paused_seconds
inače:             proteklo = (sada - started_at) - total_paused_seconds
```

Time svi mobiteli pokazuju **isto vrijeme** bez obzira kad su se spojili, jer se sve izvodi iz vremena servera.

**Izvor istine za štopericu su stupci na `matches`**, ne događaji. `pause` i `resume` u `match_events` postoje samo kao trag u kronologiji (tko je i kad pauzirao) i **ne koriste se za izračun vremena**.

---

## 6. Ekrani

### 6.1 Prijava / registracija
- Tri gumba: **Prijavi se Googleom**, **Pošalji mi link na email**, **Email i lozinka**.
- Nakon prve prijave: kratka forma za **nadimak** (obavezno, max 12 znakova — prikazuje se na ekranu uživo) i prekidač **"Igram golmana"**.

### 6.2 Moje grupe
- Lista grupa kojih je korisnik član.
- Ako je član samo jedne grupe → **preskoči ovaj ekran** i idi ravno u nju.
- Gumbi: **Kreiraj grupu**, **Pridruži se preko koda**.
- Ako je zahtjev za članstvo `pending` → prikaži "Čeka se odobrenje admina".

### 6.3 Grupa
Četiri kartice (tabovi):

**a) Termini** — nadolazeći na vrhu (najbliži prvi), odigrani ispod. Svaki termin je kartica: datum, dan u tjednu, vrijeme, lokacija, `7/10 prijavljenih`, i tvoj status (*Dolaziš* / *Na listi čekanja* / *Nisi se prijavio*). Admin ima gumb **Novi termin**.

**b) Ljestvica** — vidi poglavlje 8.

**c) Članovi** — lista s nadimkom, ikonom 🧤 ako je golman, ratingom i brojem odigranih termina. Admin ovdje vidi i **zahtjeve za članstvo** s gumbima *Odobri* / *Odbij*, te može mijenjati ulogu i izbaciti člana.

**d) Postavke** (samo admin) — naziv grupe, default kvota, lokacije, **link za pozivnicu** s gumbom *Kopiraj* i *Podijeli* (Web Share API → otvara WhatsApp direktno).

### 6.4 Termin — detalji

Redoslijed odozgo prema dolje:

1. **Zaglavlje** — datum i vrijeme velikim slovima, lokacija (klik → karta), napomena.
2. **Glavni gumb** — `Dolazim` / `Odustajem`. Ako je kvota puna: `Stavi me na listu čekanja`. Gumb je pun širine i lijepljen za dno ekrana na mobitelu.
3. **Prijavljeni** — numerirana lista 1..kvota s nadimcima i 🧤 oznakama.
4. **Lista čekanja** — nastavak numeracije, vizualno odvojen.
5. **Ekipe** — ako su složene, dvije kolone. Ako nisu, gumb **Predloži ekipe**.
6. Admin: **Uredi**, **Zaključaj prijave**, **Otkaži termin**.
7. Na dan termina: veliki gumb **Pokreni termin**.

### 6.5 Slaganje ekipa

- Gumb **Predloži ekipe** pokreće algoritam iz 7.2.
- Prikaz: dvije kolone (A i B), ispod svake **zbroj i prosjek ratinga** te razlika među ekipama.
- **Bilo tko iz grupe** može premjestiti igrača: tap na igrača → tap na drugu ekipu (na laptopu radi i povlačenje mišem).
- Tap na ikonu 🧤 postavlja/uklanja golmana za taj termin (nasljeđuje se s profila, ali se ovdje mijenja).
- Ako ekipa nema golmana → **žuto upozorenje**, ali se smije nastaviti.
- Gumb **Promiješaj ponovno** za novi prijedlog.

### 6.6 Termin uživo — **glavni ekran**

Vidi poglavlje 9. Ovo je najvažniji ekran u aplikaciji.

### 6.7 Termin — sažetak (nakon završetka)

- Konačni rezultat i trajanje.
- Kronologija golova.
- Tablica: po igraču — golovi, asistencije, autogolovi, ekipa, ishod, promjena ratinga (`+12` / `-9`).
- Gumb **Podijeli sažetak** — generira tekst za WhatsApp:
  ```
  Termin 05.09.2026, Dvorana Trnje
  Ekipa A 6 : 4 Ekipa B
  ⚽ Marko 3, Luka 2, Ivan 1 ...
  ```
- Admin: **Ispravi statistiku** (aktivno 24 h).

### 6.8 Profil igrača

Otvara se klikom na ime bilo gdje. Prikazuje: nadimak, avatar, oznaku golmana, rating i njegovo kretanje, ukupnu statistiku, zadnjih 10 termina.

---

## 7. Algoritmi

### 7.1 Lista čekanja

```sql
SELECT * FROM match_signups
WHERE match_id = :id AND cancelled_at IS NULL
ORDER BY manual_order NULLS LAST, signed_up_at ASC
```

```
prvih `capacity` redaka → status "prijavljen"
ostatak                 → status "lista čekanja"
```

Posljedica: kad se netko odjavi, **prvi s liste čekanja automatski ulazi** — ne treba nikakva dodatna logika ni posao. Kad igrač otkaže, aplikacija mu pokaže tko je ušao umjesto njega.

Ako se odjavi manje od 3 sata prije termina, prikazuje se upozorenje *"Termin je uskoro — javi ekipi u WhatsApp"*. (Bilježenje kasnih odjava je Faza 2+.)

### 7.2 Prijedlog ekipa

```
1. Uzmi sve igrače sa statusom "prijavljen".
2. Odvoji golmane (is_goalkeeper po terminu, inicijalno s profila).
   - 2+ golmana → uzmi 2 s najbližim ratingom i stavi po jednog u A i B.
   - točno 1    → stavi ga u nasumičnu ekipu; upozorenje "Ekipa X nema golmana".
   - 0          → upozorenje "Nijedna ekipa nema golmana".
   - 3+         → višak se tretira kao obični igrači u koraku 3.
3. Ako grupa ima MANJE od 5 odigranih termina:
      → preostale igrače podijeli NASUMIČNO.
   Inače:
      → sortiraj preostale po ratingu silazno
      → raspodijeli "zmijski": A, B, B, A, A, B, B, A, ...
        (ekipa koja trenutno ima manji zbroj ratinga bira prva)
4. Ako je broj igrača neparan → ekipa s manje igrača dobiva zadnjeg.
5. Prikaži zbroj i prosjek ratinga po ekipi i razliku.
```

### 7.3 Rating (Elo)

Pokreće se **jednom, pri prijelazu termina u `zavrsen`**.

```
R_A = prosjek ratinga igrača ekipe A
R_B = prosjek ratinga igrača ekipe B

E_A = 1 / (1 + 10^((R_B - R_A) / 400))

S_A = 1     ako je A pobijedila
    = 0.5   ako je neriješeno
    = 0     ako je A izgubila

K = 24

delta = round(K * (S_A - E_A))

svaki igrač ekipe A:  rating += delta
svaki igrač ekipe B:  rating -= delta
```

Pravila:
- Početni rating svakog igrača je **1000**.
- Rating je **po grupi** — isti čovjek u dvije grupe ima dva ratinga.
- Svaka promjena se upisuje u `rating_history` da se može poništiti.
- Ako admin naknadno ispravi rezultat: poništi zapise iz `rating_history` za taj termin i **preračunaj sve kasnije termine kronološki**.
- Skaliranje po razlici u golovima (*margin of victory*) je **Faza 2+**.

### 7.4 Zaštita od duplog unosa

Prije upisa gola:

```
postoji li nepobrisani "goal" event u ovom terminu
  s istim scorer_id
  kreiran unutar zadnjih 10 sekundi?
     → prikaži dijalog:
       "Netko je već upisao gol za Marka prije 4 s.
        Je li ovo drugi gol?"   [Da, upiši]  [Ne, odustani]
```

---

## 8. Statistika

Prikazuje se **po grupi**, s prekidačem **Sezona / Sve vrijeme**. U izračun ulaze **samo termini sa statusom `zavrsen`**, i **samo nepobrisani** događaji (`deleted_at IS NULL`).

### 8.1 Ljestvica — kolone

| Kolona | Izračun |
|---|---|
| Golovi | broj `goal` eventa gdje je igrač `scorer_id` |
| Asistencije | broj `goal` eventa gdje je igrač `assist_id` |
| Autogolovi | broj `own_goal` eventa gdje je igrač `scorer_id` |
| Termini | broj termina u kojima je igrač bio u `match_lineup` |
| Golovi po terminu | golovi / termini, 2 decimale |
| Pobjede / Neriješeno / Porazi | prema `score_a` vs `score_b` i ekipi igrača |
| Postotak pobjeda | (P + 0.5·N) / termini |
| Rating | trenutni rating |

Ljestvica se može sortirati klikom na bilo koju kolonu. Default: golovi silazno.

### 8.2 Dolaznost

| Podatak | Izračun |
|---|---|
| Odigrani termini | broj termina u postavi |
| Postotak dolaznosti | odigrani / ukupan broj završenih termina grupe u razdoblju |
| Trenutni niz | broj uzastopnih zadnjih termina na kojima je igrao |
| Najduži niz | povijesni maksimum |

### 8.3 Golmani

Golmani rotiraju, pa se primljeni golovi pripisuju **onome tko je bio označen kao golman u tom trenutku** — to se izvodi iz `keeper_change` eventa i početne postave.

| Podatak | Izračun |
|---|---|
| Minute u golu | zbroj intervala u kojima je bio golman |
| Primljeni golovi | golovi protivnika u tim intervalima |
| Čiste mreže | termini bez primljenog gola dok je bio u golu |

**Podaci se skupljaju od prvog dana**, ali prikaz ove tablice može doći u Fazi 2 ako komplicira MVP.

### 8.4 Rekordi

- Najviše golova na jednom terminu (igrač + termin)
- Najviše asistencija na jednom terminu
- Najduži niz pobjeda
- Najbolji strijelac sezone
- Najveća pobjeda (razlika u golovima)

---

## 9. Ekran "Termin uživo" — detaljna specifikacija

Ovo je jedini ekran optimiziran za korištenje **stojeći, jednom rukom, po kiši**. Svi gumbi su **minimalno 56 px visoki**, kontrast visok, bez sitnog teksta.

### 9.1 Raspored

```
┌───────────────────────────────────┐
│   EKIPA A     3 : 2     EKIPA B   │   ← rezultat, ogroman
│            ⏱  23:14               │   ← štoperica, monospace
│      [ Pauza ]     [ Završi ]     │
├─────────────────┬─────────────────┤
│  MARKO    ⚽2   │  IVAN           │
│  LUKA           │  PETAR    ⚽1   │
│  ANTE     🧤    │  JOSIP    🧤    │
│  ...            │  ...            │
├─────────────────┴─────────────────┤
│  23'  ⚽ Marko  (Luka)         ✕  │   ← kronologija, najnovije gore
│  18'  ⚽ Petar                 ✕  │
│  11'  🥅 Ante — autogol        ✕  │
└───────────────────────────────────┘
```

Na laptopu je isti raspored, samo šire kolone i kronologija sa strane.

### 9.2 Unos gola — dva dodira

**Dodir 1:** tap na ime igrača.
- Gol je **odmah upisan** kao `match_events` redak s `assist_id = NULL`. Rezultat skoči.
- `elapsed_seconds` se uzme iz štoperice.
- `team` se izvodi iz ekipe igrača.

Ovo je važno: gol je **zapisan i prije nego se odabere asistent**. Drugi dodir samo radi `UPDATE` istog retka i postavlja `assist_id`. Ako čovjek zaključa mobitel ili ode s ekrana, gol je već u bazi.

**Dodir 2:** na dnu ekrana iskoči traka:

```
┌───────────────────────────────────┐
│  ⚽ GOL — MARKO  23'     [Poništi] │
│  Tko je asistirao?                 │
│  [ LUKA ][ ANTE ][ IVO ][ NITKO ]  │
└───────────────────────────────────┘
```

- Prikazuju se **samo suigrači iz iste ekipe**.
- Tap na ime → asistencija upisana, traka nestaje.
- Tap na **Nitko** → gotovo bez asistencije.
- **Ako se 5 sekundi ništa ne dira → automatski se sprema bez asistencije** i traka nestaje. Nitko ne mora ništa dovršavati.

**Poništi** ostaje aktivan 10 sekundi nakon upisa i briše cijeli gol (meko brisanje).

### 9.3 Autogol

**Dugi pritisak (long press) na ime igrača**, ili tap na malu oznaku `AG` u kutu kartice igrača.

- Kreira se `own_goal` event.
- `team` = **protivnička** ekipa (njihov rezultat raste).
- `scorer_id` = igrač koji je zabio autogol.
- Ne traži se asistencija.
- U kronologiji se prikazuje kao `🥅 Ante — autogol`.

### 9.4 Promjena golmana

Tap na ikonu 🧤 → uđe se u način *"Tko ide u gol?"* → tap na drugog igrača iz iste ekipe. Kreira se `keeper_change` event s trenutnim `elapsed_seconds`.

### 9.5 Živa sinkronizacija

- Svi uređaji su pretplaćeni na Supabase Realtime kanal tog termina.
- Novi događaj → rezultat i kronologija se **odmah** ažuriraju kod svih, uz kratku animaciju i (opcionalnu) vibraciju.
- Štoperica se ne šalje preko mreže — svaki uređaj je računa lokalno iz `started_at` (poglavlje 5.2), pa je uvijek usklađena.
- **Ako padne internet:** ekran prelazi u način *"Nema veze — unosi se spremaju"*. Događaji idu u lokalni red čekanja i šalju se čim se veza vrati. Štoperica nastavlja raditi.

### 9.6 Tko smije unositi

Svaki **aktivni član grupe koji je u postavi tog termina**, dok je termin `u_tijeku`. Uz svaki događaj se sprema `created_by`, pa se u kronologiji na dugi pritisak vidi *"upisao: Ivan"*.

### 9.7 Završetak

Gumb **Završi** traži potvrdu (*"Sigurno? Nakon toga se statistika zaključava."*). Nakon potvrde:
1. `status` → `zavrsen`, `ended_at` = sada
2. Izračun i upis ratinga (7.3)
3. Preusmjeravanje na ekran sažetka (6.7)

---

## 10. Uloge i sigurnost

### 10.1 Prava

| Radnja | Admin | Član |
|---|---|---|
| Kreirati / urediti / otkazati termin | ✅ | ❌ |
| Odobriti zahtjev za članstvo | ✅ | ❌ |
| Izbaciti člana, promijeniti ulogu | ✅ | ❌ |
| Urediti postavke grupe i lokacije | ✅ | ❌ |
| Prijaviti se / odjaviti s termina | ✅ | ✅ |
| Slagati i mijenjati ekipe | ✅ | ✅ |
| Pokrenuti termin | ✅ | ✅ (ako je u postavi) |
| Unositi golove dok termin traje | ✅ | ✅ (ako je u postavi) |
| Ispravljati statistiku nakon završetka | ✅ (24 h) | ❌ |
| Vidjeti statistiku grupe | ✅ | ✅ |

### 10.2 RLS pravila (Postgres)

Sva prava se provode **u bazi**, ne samo u sučelju:

- `groups`, `locations`, `seasons`, `matches`, `player_ratings` — **čitanje** samo za `active` članove te grupe.
- `group_members` — čitanje za članove grupe; **insert** (zahtjev za članstvo) za svakog prijavljenog korisnika uz `status = 'pending'`; **update** samo admin te grupe.
- `matches` — insert/update/delete samo admin grupe.
- `match_signups` — korisnik smije upisati/otkazati **samo sebe**; admin smije sve.
- `match_lineup` — svaki `active` član grupe.
- `match_events` — **insert i meko brisanje** samo ako je korisnik u `match_lineup` tog termina **i** `matches.status = 'u_tijeku'`. Nakon završetka: samo admin, i to unutar 24 h od `ended_at`.
- `profiles` — korisnik uređuje samo svoj; čita profile ljudi s kojima dijeli grupu.

### 10.3 Privatnost

- Grupa i njezini termini **nisu javno dostupni** — traži se prijava i članstvo.
- Link za pozivnicu ne daje pristup, nego samo mogućnost slanja **zahtjeva** koji admin odobrava.
- Admin može **regenerirati kod pozivnice** ako procuri.
- Spremaju se samo: ime, nadimak, email, avatar. Bez telefona, bez lokacije uređaja, bez analitike trećih strana.

---

## 11. Ne-funkcionalni zahtjevi

- **Responzivno**: jedan raspored, tri prijelomne točke (mobitel < 640 px, tablet, laptop). Mobitel je polazište, ne naknadna prilagodba.
- **PWA**: `manifest.json`, ikone 192/512 px, `display: standalone`, `apple-touch-icon`. Aplikacija se može dodati na početni zaslon i otvara se bez adresne trake. **Bez push obavijesti u prvoj fazi.**
- **Brzina**: ekran uživo mora reagirati na dodir **ispod 100 ms** — gol se prikaže odmah (optimistički), a slanje na server ide u pozadini.
- **Jezik**: samo hrvatski, tekstovi u kodu bez prevoditeljskog sloja.
- **Datumi**: uvijek `Europe/Zagreb`, format `pon 05.09.2026. u 20:00`.
- **Greške**: svaka greška ima poruku na hrvatskom i ponudi radnju (*Pokušaj ponovno*). Nikad sirovi tekst greške korisniku.
- **Prazna stanja**: svaki popis ima smislen prazan ekran (*"Još nema termina — otvori prvi"*).
- **Pristupačnost**: kontrast najmanje AA, sve radnje dostupne tipkovnicom, ikone imaju tekstualne oznake.

---

## 12. Objava i infrastruktura

### 12.1 Postavljanje

1. GitHub repo **`meslav-ye/memorijalni-termin`**.
2. Supabase projekt, regija **EU (Frankfurt)**. Uključiti Google OAuth, magic link i email/lozinku.
3. Vercel račun otvoren **prijavom preko GitHub računa `meslav-ye`** → *Import Project* → odabir repoa.
4. Varijable okoline na Vercelu: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (samo server).
5. Svaki `push` na `main` → automatski deploy. Svaki pull request → svoj *preview* URL.
6. Javna adresa: **`https://memorijalni-termin.vercel.app`** (besplatan HTTPS). Taj se link dijeli u WhatsApp.
7. Vlastita domena je opcija kasnije (~10–15 €/god) — DNS se usmjeri na Vercel.

### 12.2 Migracije baze

Sve promjene sheme kao **SQL migracije u repou** (`supabase/migrations/`), primjenjuju se preko Supabase CLI-ja. Nikad ručno klikanje po web sučelju — inače se ne može ponoviti.

### 12.3 Odvojeni GitHub identitet (bez diranja poslovnog)

Globalni git na ovom računalu je postavljen na `mislav.jelusic@huddle.tech` i **ostaje takav**. Za ovaj projekt koristi se poseban ključ i per-repo postavka.

```bash
ssh-keygen -t ed25519 -C "meslav-ye" -f ~/.ssh/id_ed25519_meslav
```

Zatim se u `~/.ssh/config` doda alias:

```
Host github-meslav
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_meslav
  IdentitiesOnly yes
```

Javni ključ (`~/.ssh/id_ed25519_meslav.pub`) doda se na GitHub račun **meslav-ye** → *Settings → SSH and GPG keys*.

Kloniranje ide **preko aliasa**, ne preko `github.com`:

```bash
git clone git@github-meslav:meslav-ye/memorijalni-termin.git
```

Identitet se postavlja **samo za taj repo**:

```bash
git -C memorijalni-termin config user.name "meslav-ye"
```

```bash
git -C memorijalni-termin config user.email "<privatni-email>"
```

Provjera da je odvajanje ispravno:

```bash
ssh -T git@github-meslav
```

Napomena: `gh` CLI nije instaliran na ovom računalu. Nije nužan — sve gore radi preko čistog gita. Ako se poželi, instalira se s `brew install gh`, ali onda treba paziti na `gh auth switch` između računa.

---

## 13. Faze isporuke

### Faza 1 — MVP (ovo se gradi)

1. Prijava (Google, magic link, email/lozinka) + profil s nadimkom i oznakom golmana
2. Kreiranje grupe, link za pozivnicu, odobravanje članova
3. Kreiranje termina s lokacijom i kvotom
4. Prijava/odjava + lista čekanja
5. Prijedlog ekipa (nasumično dok nema podataka) + ručna korekcija + golmani
6. **Ekran uživo**: štoperica, gol u dva dodira, autogol, poništi, promjena golmana, živa sinkronizacija, zaštita od duplog unosa
7. Završetak termina + sažetak + dijeljenje u WhatsApp
8. Ljestvica: golovi, asistencije, dolaznost, pobjede, sezona/sve vrijeme
9. Elo rating + zmijsko balansiranje nakon 5 termina
10. PWA manifest

### Faza 2+ (svjesno odgođeno)

- Push obavijesti (novi termin, podsjetnik dan prije, "ušao si s liste čekanja")
- Statistika golmana u sučelju (podaci se skupljaju od Faze 1)
- Plaćanje terena, tko duguje koliko
- Više utakmica unutar jednog termina, rotacija ekipa
- Bilježenje kasnih odjava i discipline
- Slike i galerija termina
- Elo skaliran po razlici u golovima
- Apple prijava (traži plaćeno članstvo)
- Javne grupe, engleski jezik, mobilne aplikacije u trgovinama

---

## 14. Otvorena pitanja za kasnije

Ništa ne blokira početak izrade. Za dogovoriti kad MVP proradi:

1. Treba li neriješen rezultat posebno tretirati, ili se u vašem društvu uvijek igra do pobjednika?
2. Koliko dugo prosječno traje termin — da se štoperica može opcionalno postaviti kao odbrojavanje?
3. Želi li se ograničiti tko smije **pokrenuti** termin (sad to može bilo tko iz postave)?
