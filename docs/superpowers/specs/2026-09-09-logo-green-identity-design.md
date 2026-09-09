# Logo & green identity — design

**Datum:** 2026-09-09  
**Status:** odobreno za plan implementacije  
**Doseg:** logo + PWA ikone + osvježavanje zelenih tokena (ne full UI redesign)

---

## 1. Cilj

Zamijeniti postojeći neon shield/ball PNG novim **geometrijskim 5v5 pitch** markom
(europski nogomet, small-sided), integrirati ga u aplikaciju (login, PWA ikone,
favicon, theme), i učvrstiti zelenu paletu kao CSS tokene.

---

## 2. Odluke

| Odluka | Izbor |
|---|---|
| Doseg | Logo + ikone + green tokens (opcija B) |
| Simbol | Pitch / linije terena (ne lopta, ne kopačka) |
| Stil | Geometric / minimal |
| Varijanta marka | **A — Compact 5v5 pitch** (obris, polovica, centar-krug, dva gol-prostora) |
| Jezik / sport | Europski nogomet, rekreativni **5v5** (ne American football) |
| Ime proizvoda | Ostaje fleksibilno; wordmark se može mijenjati bez crtanja marka ispočetka |

---

## 3. Mark

### 3.1 Oblik

Kompaktan pravokutni 5v5 teren:

- vanjski obris (zaobljeni kutovi, blago)
- srednja linija (halfway)
- mali centar-krug
- dva gol-prostora (goal boxes) na kraćim stranama

Samo linije — bez lopte, štita, gradijenta, sjene, “neon” efekta.

### 3.2 Boje marka

| Token / uloga | Hex | Gdje |
|---|---|---|
| Podloga ikone / pločice | `#0c300c` (`marka`) | PWA tile, login mark tile |
| Linije na tamnoj podlozi | `#9fd49f` (`marka-linija`, novo) | SVG stroke na dark green |
| Linije na svijetloj podlozi | `#0c300c` | Ako se mark crta na bijelom |

### 3.3 Lockup (login)

- Lijevo: kvadratna pločica s markom na `marka`
- Desno: plain sans wordmark **Memorijalni termin** (+ opcionalni kratki podnaslov tipa `5v5 · prijave · uživo`)
- Bez starog horizontalnog PNG-a sa štitom i gradijentnim tekstom

### 3.4 Asseti

| Datoteka | Svrha |
|---|---|
| `public/brand/mark.svg` | Izvor istine (vektor) |
| `public/logo.png` ili `public/brand/lockup.png` | Login lockup (ili SVG+HTML lockup umjesto PNG) |
| `public/icons/icon-192.png` | PWA |
| `public/icons/icon-512.png` | PWA |
| `public/icons/icon-maskable-512.png` | Maskable (mark s safe padding) |
| `public/icons/apple-touch-icon.png` | iOS add-to-home |
| favicon (npr. `app/icon.png` ili `public/favicon.ico`) | Preglednik |

Stari shield/ball asseti se uklanjaju ili prestaju referencirati.

---

## 4. Green tokens u aplikaciji

Postojeće vrijednosti ostaju; uloge se pojašnjavaju:

| Token | Hex | Uloga |
|---|---|---|
| `--color-marka` | `#0c300c` | Primarni gumbi, scoreboard, icon tile, themeColor |
| `--color-marka-svijetla` | `#307830` | GK / success / meki naglasci |
| `--color-marka-linija` | `#9fd49f` | Pitch linije na tamnoj zelenoj (logo; rijetko u UI) |

**U opsegu:** audit da brand CTA-i, focus ringovi, tabovi i live scoreboard koriste ove tokene; `manifest.json` / `themeColor` ostaju `#0c300c`.

**Izvan opsega:** full UI redesign, dark mode, nova tipografija, animirani logo, marketing site, rename proizvoda.

---

## 5. Integracijske točke u kodu

- `app/prijava/page.tsx` — lockup umjesto starog `/logo.png`
- `app/globals.css` — dodati `marka-linija`
- `app/layout.tsx` — icons + themeColor
- `public/manifest.json` — icons + theme/background po potrebi
- Generiranje PNG-ova iz SVG-a (script ili jednokratni export)

---

## 6. Definition of done

1. Login prikazuje novi mark + wordmark lockup.
2. Add-to-home-screen / PWA ikona je zelena 5v5 pitch pločica.
3. Brand zelene su tokenizirane; primarni CTA-i konzistentno koriste `marka`.
4. Nema referenci na stari neon shield/ball kao aktivni brand asset.

---

## 7. Veze

- `PRODUCT.md` — pitch-side first, Croatian UI, ime fleksibilno
- `docs/ux-zadaci.md` — zasebni UX zadaci; ovaj posao je brand identity, ne UX-01…26
