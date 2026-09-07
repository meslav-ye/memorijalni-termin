# Plan optimizacije — da ne udarimo u limite besplatnih planova

**Datum mjerenja: 2026-09-06**

## Prvo: nije hitno

Izmjereno je, ne procijenjeno. Trenutna potrošnja je **daleko ispod** bilo kojeg
razumnog limita za društvo od 15–40 ljudi:

| Radnja | Zahtjeva prema Supabaseu |
|---|---|
| Otvaranje ljestvice / statistike | ~~**9**~~ → **5** nakon popravka 2 (10 prvi put nakon termina) |
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

### 1. Ukloni dvostruke upite — ✅ napravljeno (procijenjeno −20%, izmjereno ~−1 upit)

> **Ishod je bio slabiji od procjene.** Napravljeno je `lib/podaci/korisnik.ts` s
> Reactovim `cache()`, ali dobitak je oko **jedan upit po stranici**, ne 20%.
> Razlog: dva `group_members` upita nisu isti upit („jesam li ja admin" iz layouta
> naspram „tko je sve u grupi" iz ljestvice), a drugi `auth/v1/user` dolazi iz
> `proxy.ts` koji se izvršava u zasebnom kontekstu i `cache()` ga ne doseže.
> Popravak je i dalje ispravan i ostaje, samo nije bio ono što je obećavao.

Mjerenje je pokazalo da se **isto pita dvaput** pri svakom otvaranju stranice grupe:

- `auth.getUser()` — jednom u `proxy.ts`, jednom u samoj stranici
- `group_members` — jednom u `app/grupe/[grupaId]/layout.tsx`, jednom u stranici

Layout i stranica se izvršavaju u istom zahtjevu, pa se rezultat može podijeliti
preko Reactovog `cache()` iz `react`. Omotati dohvat korisnika i članstva u
`cache()` i pozivati tu funkciju umjesto izravnog upita.

Nema promjene u ponašanju, samo manje upita.

### 2. Predmemorija ljestvice — ✅ napravljeno (procijenjeno −80%, izmjereno −50%)

> **Izmjereno na produkcijskoj gradnji** (`next start`), ne na dev serveru — dev
> zaobilazi predmemoriju i dao bi lažan broj:
>
> | | Zahtjeva prema Supabaseu |
> |---|---|
> | hladno (prvo otvaranje nakon završenog termina) | **10** |
> | toplo (svako sljedeće) | **5** |
>
> Preostalih 5 su namjerno **izvan** predmemorije: 2 × `auth/v1/user` (layout +
> `proxy.ts`), `groups` (ime grupe u layoutu), `group_members` (provjera članstva —
> stoji izvan predmemorije *zbog sigurnosti*, da se tuđa ljestvica ne posluži iz
> predmemorije) i `seasons` (izbornik sezone).
>
> Nije −80% jer procjena nije računala te fiksne upite. Ali dobitak **raste s
> podacima**: hladna cijena raste kako se gomilaju odigrani termini, topla ostaje 5.
>
> Provjereno oboje, ne samo da se ne ruši:
> 1. rating promijenjen izravno u bazi na 1234 → stranica i dalje pokazuje 1000
>    (dokaz da predmemorija stvarno služi);
> 2. pokrenut server action koji zove `updateTag` → stranica pokazuje 1234
>    (dokaz da se poništavanje okida).
>
> Upotrijebljen je `updateTag`, ne `revalidateTag`: u Nextu 16 `revalidateTag` bez
> drugog argumenta je zastario, a `updateTag(tag)` je isti poziv bez upozorenja
> (oboje zovu istu `revalidate()` u `next/dist/server/web/spec-extension/revalidate.js`,
> pa uredno poništava i `unstable_cache` oznake) uz „vidi vlastitu promjenu odmah",
> što je točno ono što treba onome tko je upravo završio termin.
>
> `use cache` je **odbačen**: traži `cacheComponents: true`, što mijenja pravila
> predmemorije u cijeloj aplikaciji — prevelik rizik za popravak koji nije hitan.

### 2b. Kako je bilo procijenjeno (1 h, −80% na najtežoj stranici)

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

- ~~Popis odigranih termina već je ograničen na 20 — zadržati.~~
  **Netočno, ispravljeno 2026-09-07.** Ograničenje na 20 postoji samo u prikazu
  (`app/grupe/[grupaId]/page.tsx`, `.slice(0, 20)`). Upit u
  `lib/podaci/termini.ts` **nema `limit`** i dohvaća sve termine grupe i sve
  njihove prijave. Bezopasno dok grupa ima nekoliko termina; postaje problem sa
  stalnim terminom (~52 termina i 600+ redova prijava po godini). Vidi
  [todo.md](todo.md), stavka 5.
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
