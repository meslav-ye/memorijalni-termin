# Plan optimizacije — da ne udarimo u limite besplatnih planova

**Datum mjerenja: 2026-09-06**

## Prvo: nije hitno

Izmjereno je, ne procijenjeno. Trenutna potrošnja je **daleko ispod** bilo kojeg
razumnog limita za društvo od 15–40 ljudi:

| Radnja | Zahtjeva prema Supabaseu |
|---|---|
| Otvaranje ljestvice / statistike | **9** (11 s odigranim terminima) |
| Otvaranje popisa termina | ~6 |
| Otvaranje ekrana uživo | ~7 |
| **Svaki događaj uživo** (gol, poništavanje) | **3 × broj spojenih mobitela** |

Realan tjedan: jedan termin, 12 ljudi, ~40 događaja uživo, i 15 ljudi koji poslije
otvore ljestvicu dvaput.

```
uzivo:      40 dogadjaja × 12 mobitela × 3  =  1 440
ljestvica:  15 ljudi × 2 otvaranja × 11     =    330
ostalo:     ~500
────────────────────────────────────────────────────
tjedno:                                     ~2 300 zahtjeva
mjesecno:                                   ~10 000
```

Ovo je zanemarivo. **Ne treba ništa optimizirati sada.** Ovaj dokument postoji da
se zna *što* napraviti *kad* zatreba, i po kojem znaku.

## Znakovi da je vrijeme

Optimizira se tek kad se pojavi jedan od ovih:

| Znak | Gdje se vidi |
|---|---|
| Supabase javlja da se približavaš egress limitu | Supabase → Reports → Usage |
| Vercel javlja prekoračenje | Vercel → Usage |
| Ljestvica se otvara dulje od ~2 s | osjeti se |
| Grupa naraste preko ~50 ljudi ili se doda više grupa | znaš sam |

**Provjeri aktualne limite prije nego išta poduzmeš** — mijenjaju se, i nema smisla
raditi po brojkama iz ovog dokumenta.

## Popravci, poredani po omjeru koristi i truda

### 1. Ukloni dvostruke upite (30 min, −20% zahtjeva)

Mjerenje je pokazalo da se **isto pita dvaput** pri svakom otvaranju stranice grupe:

- `auth.getUser()` — jednom u `proxy.ts`, jednom u samoj stranici
- `group_members` — jednom u `app/grupe/[grupaId]/layout.tsx`, jednom u stranici

Layout i stranica se izvršavaju u istom zahtjevu, pa se rezultat može podijeliti
preko Reactovog `cache()` iz `react`. Omotati dohvat korisnika i članstva u
`cache()` i pozivati tu funkciju umjesto izravnog upita.

Nema promjene u ponašanju, samo manje upita.

### 2. Predmemorija ljestvice (1 h, −80% na najtežoj stranici)

Statistika se **preračunava iz sirovih događaja pri svakom otvaranju**. A mijenja
se samo kad termin završi — dakle jednom tjedno.

Omotati `dohvatiLjestvicu` u `unstable_cache` s oznakom po grupi, i poništiti
predmemoriju u `zavrsiTermin`. Ljestvica tad radi jedan upit umjesto jedanaest,
osim prvi put nakon odigranog termina.

Ovo je **najveći pojedinačni dobitak** i ne mijenja ni jedan redak sučelja.

### 3. Ekran uživo: koristi ono što Realtime već pošalje (2 h, −70% na najprometnijoj putanji)

Trenutno svaki događaj okine `osvjezi()` na **svakom spojenom mobitelu**, a to su
tri nova upita. Kod 12 ljudi oko terena jedan gol znači 36 zahtjeva.

Ali Supabase u poruci **već šalje cijeli promijenjeni redak** (zato smo postavili
`REPLICA IDENTITY FULL`). Umjesto ponovnog dohvata, primijeniti promjenu izravno
iz `payload.new` na lokalno stanje. Puni dohvat ostaje samo kao rezerva:

- pri prvom spajanju
- pri ponovnom spajanju nakon prekida veze
- ako stigne događaj koji se ne može primijeniti lokalno

**Oprez:** ovo je jedina promjena iz ovog popisa koja može uvesti grešku — lokalno
stanje se može razići sa stvarnim. Zato rezervni dohvat mora ostati, i nakon
promjene treba proći isti test kao u M6 (upis gola izravno u bazu, provjera da
se ekran osvježi).

### 4. Materijalizirana statistika (pola dana, ali tek na tisućama termina)

Umjesto računanja iz `match_events`, držati tablicu `player_season_stats` koja se
osvježava kad termin završi.

**Ne raditi ovo dok točka 2 ne prestane biti dovoljna.** Uvodi drugi izvor istine,
koji se može razići s događajima — a upravo je izbjegavanje toga bio razlog da
statistika bude izvedena, a ne spremljena.

### 5. Sitnice

- Popis odigranih termina već je ograničen na 20 — zadržati.
- `dohvatiLjestvicu` se poziva i na profilu igrača, gdje treba samo jedan redak.
  Kad se doda predmemorija (točka 2), to prestaje biti problem.
- Slike u `public/` se poslužuju kao statične datoteke s Vercelove mreže i
  **ne troše** ništa od baze.

## Što NE raditi

- **Ne gasiti živu sinkronizaciju.** Ona je razlog zašto aplikacija dobro radi na
  terenu. Točka 3 je rješava bez gubitka.
- **Ne uvoditi vlastiti sloj predmemorije** (Redis i slično). Next ga već ima
  ugrađenog, a dodatna infrastruktura znači dodatni trošak i dodatni kvar.
- **Ne optimizirati na slijepo.** Prvo izmjeriti istim postupkom kao ovdje:

```bash
docker logs --since <vrijeme> supabase_kong_memorijalni-termin 2>&1 \
  | grep -oE '"(GET|POST) /(rest|auth)/v1/[a-zA-Z_]+' | sort | uniq -c | sort -rn
```

Na produkciji isto stoji u Supabase → **Reports → API Gateway**.
