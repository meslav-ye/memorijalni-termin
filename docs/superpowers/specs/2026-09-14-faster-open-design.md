# Brže otvaranje aplikacije

**Status:** approved  
**Date:** 2026-09-14  
**Scope:** cold open (A) + in-app navigacija (B); Free tier (Vercel Hobby + Supabase Free)

## Problem

App se čini spora i kad se otvori s početnog zaslona i dok se skakuće po ekranima. Uzrok nije veličina baze (~12 MB), nego:

1. **`proxy.ts` zove `getUser()` na skoro svakom requestu** → mrežni round-trip do Supabase Auth.
2. **Cold open na `/` radi redirect** → drugi full request na `/grupe/{id}` → opet Auth + layout + Termini.
3. **`getMatches` čeka `ensureUpcomingSeriesOccurrences`** prije listanja termina.
4. **`BusyLink` / mnogi linkovi imaju `prefetch={false}`** → in-app navigacija plaća cold RSC svaki put.

## Goal

- **Cold open:** jedan serverski hop do Termina (ili `/grupe`) kad je korisnik u jednoj grupi; manje Auth poziva.
- **In-app:** manje Auth u proxyju; prefetch na glavnim tabovima i karticama termina; shell grupe prije liste.
- **Ne mijenjati** RLS, pravila prijave, ni product ponašanje (osim što se sljedeći serijski termin može pojaviti tek nakon kratkog odgode / refresh-a).

## Non-goals

- Upgrade Vercel / Supabase plana.
- Service worker / offline PWA cache.
- Cache-iranje privatnih RSC payload-a na CDN-u.
- Zamjena `getUser()` u server actions (mutationi i dalje moraju potvrditi session).

---

## Design

### 1. Proxy: JWT fast-path (A + B)

**Danas:** svaki matchani request → `supabase.auth.getUser()` (mreža).

**Novo:**

1. Pročitaj access token iz Supabase auth cookieja.
2. Ako token **postoji** i `exp` je još **> 90s** u budućnosti → **ne zovi** Auth; `NextResponse.next()` (ili entry rewrite/redirect ispod).
3. Inače → postojeći `getUser()` (obnova / login / istekao token).

Session cookieji se i dalje postavljaju kad `getUser()` stvarno trči. RSC `getUser()` u `lib/data/user.ts` ostaje za autorizaciju stranica (jedan put po requestu preko `cache()`).

**Rizik:** korisnik revokean u Authu ostaje “ulogiran” do isteka JWT-a (obično ~1h). Prihvatljivo za hobby app; dokumentirano ovdje.

### 2. Cold `/`: rewrite + last-group cookie (A)

**Danas:** `/` → resolve (profile + memberships) → **302** → `/grupe/...` (drugi TTFB + drugi proxy).

**Novo — prioritet redoslijed za destinaciju:**

| Prioritet | Uvjet | Destinacija |
|-----------|--------|-------------|
| 1 | Nema usera (nema session / getUser null) | `/prijava` |
| 2 | Cookie `mt_home` = `/grupe/{uuid}` **i** profil ima nickname **i** aktivno članstvo u toj grupi (profile + jedan membership select) | rewrite na taj path |
| 3 | Inače query kao danas (profile + memberships) | `/profil`, `/grupe/{id}`, ili `/grupe` |

Bez nicknamea uvijek `/profil` — cookie ne smije to preskočiti. Stale cookie (ispao iz grupe) pada na korak 3.

**Rewrite, ne redirect**, kad je destinacija grupa ili lista grupa (ulogirani pathovi): browser dobije HTML u **istom** requestu; URL u adresnoj traci može ostati `/` dok korisnik ne klikne dalje — za PWA home screen to je OK. Canonical linkovi unutar app (`SoftLink`, tabovi) i dalje vode na `/grupe/...`.

Za **neulogirane** i **`/profil`** i dalje **redirect** (jasniji URL, manje edge caseova).

**Cookie `mt_home`:**

- Postavi u **`proxy.ts`** (ne u RSC layout — `cookies().set` u Server Componentima često ne uspije): httpOnly, `SameSite=Lax`, `Path=/`, max-age ~30 dana, vrijednost `/grupe/{grupaId}`.
- Kad: (a) `/` resolve završi na grupi, ili (b) request path je `/grupe/{uuid}` (ili podruta) i postoji session/user.
- Na cookie fast-pathu na `/` **provjeri** active membership za taj `grupaId`; ako ne — ignoriši cookie, full resolve, po želji obriši cookie.
- Ne koristi cookie za skip Auth.

`app/page.tsx` ostaje fallback ako proxy matcher propusti `/`.

### 3. Termini: series ensure van critical patha (A)

**Danas:** `getMatches` → `await ensureUpcomingSeriesOccurrences` → tek onda SELECT-ovi.

**Novo:**

1. Prvo učitaj matches / signups / fillers (isto kao sada).
2. Pokreni `ensureUpcomingSeriesOccurrences(groupId)` **bez blokiranja** odgovora:
   - preferirano Next.js `after()` iz `next/server` (ako je dostupno u našoj Next verziji), inače fire-and-forget s `.catch(log)` na kraju requesta.
3. Ako ensure ubaci novi termin, korisnik ga vidi na **sljedećem** otvaranju / navigaciji / soft refresh — ne na istom cold openu. Prihvatljivo: prozor vidljivosti je 6 dana; kašnjenje sekundi do minuta nije product bug.

Ne mijenjati logiku inserta / unique `(series_id, starts_at)`.

### 4. Perceived speed: Suspense oko liste (A)

U `app/grupe/[grupaId]/page.tsx` (ili tanki child):

- Layout grupe (naslov, tabovi) rendera odmah (već u layoutu).
- Lista Nadolazeći / Odigrani u `<Suspense fallback={skeleton}>` s async childom koji zove `getMatches`.

`loading.tsx` ostaje za cijeli segment; Suspense dodatno skraćuje čekanje unutar grupe kad layout već ima podatke.

### 5. Prefetch na glavnim in-app linkovima (B)

| Mjesto | Promjena |
|--------|----------|
| `GroupTabs` | `prefetch={true}` (default Link) |
| `MatchCard` Link na termini | `prefetch={true}` |
| Teški ekrani (Ekipe / uživo) preko `BusyLink` | ostavi `prefetch={false}` **ili** uključi prefetch samo za Ekipe ako pending UI i dalje radi dovoljno često — default: **prefetch Ekipe = true**, uživo ostavi false (realtime težak) |

Cilj: hover / viewport prefetch RSC za Termini ↔ Ljestvica ↔ Statistika ↔ kartice.

### 6. Explicitly out of scope (ponovljeno)

- Ne dirati Auth u server actions.
- Ne grade-ati compute.
- Ne dodavati service worker.

---

## Success criteria

1. Cold open (PWA / URL `/`, jedan group, svjež JWT): **jedan** document request do HTML-a Termina (rewrite); proxy **bez** Auth mreže.
2. In-app tab switch (svjež JWT): proxy **bez** Auth mreže; RSC i dalje jedan `getUser` po navigaciji.
3. Series ensure ne produžava TTFB liste (mjerljivo: ensure start **nakon** ili paralelno bez `await` ispred SELECT-ova).
4. Nema regresije: nečlan i dalje ne vidi tuđu grupu; logout i dalje radi; istekli JWT i dalje ide kroz `getUser()`.

## Verification

- Ručno: cold open s home screena; Network: 1 document za `/`, nema Auth `user` na proxy kad je JWT zelen.
- Ručno: tabovi + kartica termina — prefetch u Network (RSC).
- Ručno: serija u 6-day window — novi termin se pojavi nakon reload-a ako ensure nije stigao prije SELECT-a.
- Unit: JWT “exp soon / not soon” helper ako izdvojimo pure funkciju; postojeći past-matches / series testovi i dalje prolaze.

## Files likely touched

- `proxy.ts`
- `lib/auth/jwt-fresh.ts` (ili slično) — pure `isAccessTokenFresh`
- `proxy.ts` — set/clear `mt_home` (not layout RSC)
- `lib/data/matches.ts` — defer ensure
- `app/grupe/[grupaId]/page.tsx` — Suspense
- `app/grupe/[grupaId]/Tabs.tsx` — prefetch
- `components/BusyLink.tsx` / MatchCard — prefetch policy
