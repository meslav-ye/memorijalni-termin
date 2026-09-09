# UX zadaci — poboljšanja

Pregled sučelja (rujan 2026) naspram PRODUCT.md: pitch-side first, invite-only,
Croatian UI. Ovo nisu nove značajke (Strava i sl.), nego trenje koje već postoji.

**Kako raditi:** uzmi **jedan** zadatak po sesiji. Kad je odrađen, istestiran i na
produkciji — briši ga odavde (isto pravilo kao u [todo.md](todo.md)).

**Što zadržati:** veliki gumbi i long-press na uživo, kratki hrvatski copy,
WhatsApp invite / sticky „Dolazim”.

**Napomena (redesign u tijeku):** UX-13 / UX-22 / UX-23 / UX-24 pokriva [ljestvica-statistika redesign](superpowers/plans/2026-09-09-ljestvica-statistika-redesign.md) — ne brisati dok nije na produkciji.

---

## P0 — pitch-side i trust

### UX-01 — Vrati korisnika na invite nakon prijave
**Zašto:** Join link šalje `?povratak=…`, ali auth callback uvijek ide na `/` —
novi igrač gubi pozivnicu.
**Gdje:** `app/auth/callback/route.ts`, `app/prijava/*`, `app/grupe/pridruzi/[kod]/page.tsx`
**Veličina:** M

### UX-02 — Uživo termin vidljiv na hubu grupe
**Zašto:** Termin `u_tijeku` pada u „Odigrani” (jer je `starts_at` u prošlosti) bez
jasnog Ulaska u uživo — sporo vani pored terena.
**Gdje:** `lib/data/matches.ts`, `app/grupe/[grupaId]/page.tsx`
**Veličina:** M

### UX-03 — Fokusirani chrome na ekranu uživo
**Zašto:** Uživo sjedi pod grupnim headerom, tabovima, „Moje grupe/Profil” i
footerom Privatnost — gubi vertikalu i rizika mid-match mis-tap.
**Gdje:** `app/grupe/[grupaId]/layout.tsx`, `…/uzivo/*`, `app/layout.tsx`
**Veličina:** M

### UX-04 — Screen Wake Lock dok je utakmica uživo
**Zašto:** Telefon se vani gasi / zaključava usred unosa gola.
**Gdje:** `LiveScreen.tsx`
**Veličina:** S

---

## P1 — jasno trenje

### UX-05 — Odjava na prvom profilu (nadimak)
**Zašto:** Krivi Google/email račun ne može izaći dok se ne spremi nadimak.
**Gdje:** `app/profil/page.tsx`
**Veličina:** S

### UX-06 — Badge za pending join na Članovi
**Zašto:** Admin ne vidi da netko čeka odobrenje dok ne otvori tab.
**Gdje:** `Tabs.tsx`, `clanovi/page.tsx`
**Veličina:** S

### UX-07 — Potvrda za Izbaci / skini admina
**Zašto:** Jedan mis-tap izbacuje prijatelja bez undo.
**Gdje:** `clanovi/page.tsx`
**Veličina:** S

### UX-08 — Potvrda prije rotacije invite linka
**Zašto:** „Izdaj novi link” ubija već podijeljene WhatsApp linkove.
**Gdje:** `postavke/page.tsx` / `InviteLink.tsx`
**Veličina:** S

### UX-09 — Potvrda otkazivanja / brisanja termina
**Zašto:** Crveni full-width gumbi bez confirm brišu prijave / povijest.
**Gdje:** detail termina, `sazetak/page.tsx`
**Veličina:** S

### UX-10 — Safe-area ispod sticky CTA (Dolazim + assist strip)
**Zašto:** Na iPhone PWA home indicator prekriva thumb gumb.
**Gdje:** match detail footer, `AssistStrip.tsx`
**Veličina:** S

### UX-11 — Vodič kad se ne može Pokrenuti
**Zašto:** „Pokreni” je skriven ako nisi u lineup-u; prazne ekipe izgledaju kao
slijepa ulica.
**Gdje:** `termin/[terminId]/page.tsx`
**Veličina:** S

### UX-12 — Pokreni / Nastavi uživo na Ekipe (igraj odmah)
**Zašto:** „Igramo odmah” završi na ekipama bez start CTA — još jedan hop vani.
**Gdje:** `ekipe/page.tsx`
**Veličina:** S

### UX-13 — Season chip: samo aktivna sezona označena
**Zašto:** Bez `?sezona=` svi chipovi izgledaju odabrani.
**Gdje:** `ljestvica/page.tsx`, `statistika/page.tsx`
**Veličina:** S
**Status:** pokriveno ljestvica/statistika redesignom (ostaje dok nije na produkciji).

### UX-14 — Own-goal long-press otporniji na scroll
**Zašto:** Scroll jednom rukom može okiniti long-press i upisati autogol.
**Gdje:** `components/termin/PlayerButton.tsx`
**Veličina:** M

---

## P2 — polish (kad P0/P1 budu gotovi)

### UX-15 — Password show/hide + confirm na registraciji
**Gdje:** `LoginForm.tsx` · S

### UX-16 — Unos invite koda na praznoj listi grupa
**Gdje:** `grupe/page.tsx` · M

### UX-17 — Jasniji pending „čekaj admina” + refresh
**Gdje:** join + grupe list · S

### UX-18 — Zaključaj uređivanje imena ekipa kad je igra krenula
**Gdje:** `ekipe/page.tsx` · S

### UX-19 — Europe/Zagreb hint na novom terminu
**Gdje:** `NewMatchForm.tsx` · S

### UX-20 — Duži / pauzirani assist strip dok korisnik tipka
**Gdje:** `AssistStrip.tsx` · S

### UX-21 — Elo objašnjenje na sažetku sklopivo (default zatvoreno)
**Gdje:** `sazetak/page.tsx` · S

### UX-22 — Legenda kratica na ljestvici (G/A/U/%/Rtg)
**Gdje:** `LeaderboardTable.tsx` · S
**Status:** pokriveno ljestvica/statistika redesignom (ostaje dok nije na produkciji).

### UX-23 — Linkovi s „Vodeći” kartica na statistici → igrač
**Gdje:** `statistika/page.tsx` · S
**Status:** pokriveno ljestvica/statistika redesignom (ostaje dok nije na produkciji).

### UX-24 — Istakni „ti” na ljestvici / dolascima
**Gdje:** `LeaderboardTable.tsx`, ljestvica · S
**Status:** pokriveno ljestvica/statistika redesignom (ostaje dok nije na produkciji).

### UX-25 — 404: link na Moje grupe
**Gdje:** `not-found.tsx` · S

### UX-26 — Feedback spremanja profila iznad tipkovnice
**Gdje:** `ProfileForm.tsx` · S
