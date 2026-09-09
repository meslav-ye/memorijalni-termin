# Ljestvica & Statistika redesign — design

**Datum:** 2026-09-09  
**Status:** odobreno za plan implementacije  
**Doseg:** vizualni polish + restrukturiranje hijerarhije; isti metrike; oba taba ravnopravna

---

## 1. Cilj

Redizajnirati **Ljestvicu** i **Statistiku** tako da se na mobitelu brzo vidi *gdje sam ja* i *tko vodi*, uz jasniji season kontroler i manje šuma — bez novih metrika i bez spajanja tabova.

---

## 2. Odluke

| Odluka | Izbor |
|---|---|
| Dubina | **A+B** — polish + restrukturiranje hijerarhije, isti podaci |
| Primarni korisnik | **C** — oba taba ravnopravna (igrač i organizator) |
| Vizualni jezik | **C** — zeleno za identity momente (sezona, Ti, vodeći), slate za guste tablice |
| Layout pristup | **A** — shared chrome + „Ti” prvi, zatim sadržaj taba |

Uključuje UX zadatke: **UX-13** (season chip), **UX-22** (legenda), **UX-23** (linkovi Vodeći), **UX-24** (highlight „ti”).

---

## 3. Shared chrome (oba taba)

Redoslijed od vrha:

1. **Season control** — chipovi za sezone + „Sve vrijeme”. Samo aktivni chip izgleda odabran.  
   Bug danas: bez `?sezona=` svi season chipovi izgledaju aktivni (`requestedSeason === s.id || (!requestedSeason && !allTime)`). Popravak: default sezona = najnovija; aktivno stanje samo za tu / odabranu / all-time.
2. **Context line** — npr. „12 utakmica · sezona 2026”, ili postojeća poruka kad nema odigranih utakmica.
3. **Ti strip** (ako član ima red u leaderboardu za odabrani raspon) — kompaktan red: nadimak + „Ti”, ključni brojevi ovisno o tabu:
   - Ljestvica: rang + Rtg
   - Statistika: G / A / U (iz istih podataka)
   - Klik na ime → `/grupe/[grupaId]/igrac/[igracId]`
   - Ako nema reda (nije igrao u rasponu): **ne prikazivati** strip s lažnim nulama.

Komponenta season UI izvući na jedno mjesto (danas je duplicirana).

Boje: aktivni season chip i blagi tint na Ti stripu koriste `marka` / `marka-svijetla`; ostatak slate.

---

## 4. Ljestvica

Ispod shared chrome:

1. **Legenda stupaca** — vidljiva na touchu (ne samo `title`):  
   `G golovi · A asistencije · U utakmice · % pobjede · Rtg Elo`
2. **LeaderboardTable** — zadržati sortiranje i responsive skrivanje stupaca; red trenutnog korisnika jasno označen (pozadina + oznaka); top-3 može zadržati blagi tint; linkovi na igrače; 🧤 ostaje.
3. **Dolaznost** — ispod tablice; isti „ti” highlight; streak chip ostaje zeleni naglasak.

Metrike i sort logika se ne mijenjaju.

---

## 5. Statistika

Ispod shared chrome:

1. **Ukupno** — isti četiri totala (utakmice, termini, golovi, asistencije); čišća tipografija, manje „card buke”; zelena samo kao tanki naglasak po potrebi.
2. **Vodeći** — iste kategorije; **svaki nadimak link** na profil igrača (UX-23); emoji demovirati ili maknuti kao primarnu dekoraciju — hijerarhiju nose tipografija i brand zelena.
3. **Golmani** — zadržati (link, Na golu / PG / Prosjek / CS + footnote); zategnuti razmake; highlight „ti” ako si na listi.
4. **Rekordi** — zadržati; prazni placeholderi ostaju iskreni; datumi gdje već postoje.
5. **Footer** — link na Ljestvicu (jasan tekstualni CTA).

---

## 6. Izvan opsega

- Nove metrike, promjena Elo formule, spajanje tabova
- Live ekran / ostali tabovi grupe
- Full app redesign, dark mode, rename proizvoda

---

## 7. Definition of done

1. Season selection je jednoznačan (samo jedan aktivni chip).
2. Na oba taba se „ti” nalazi u jednom pogledu (strip + highlight u listama).
3. Vodeći vode na stranice igrača.
4. Kratica G/A/U/%/Rtg čitljive su bez hovera.
5. Nema novih metrika; postojeći loader (`getLeaderboard`) ostaje izvor istine.

---

## 8. Ključne datoteke (za plan)

- `app/grupe/[grupaId]/ljestvica/page.tsx`
- `app/grupe/[grupaId]/ljestvica/LeaderboardTable.tsx`
- `app/grupe/[grupaId]/statistika/page.tsx`
- Nova shared komponenta za season bar (+ Ti strip) npr. `components/group/SeasonBar.tsx` / `YouStrip.tsx`
- `lib/data/leaderboard.ts` — vjerojatno bez promjene ugovora; eventualno proslijediti `userId` za highlight

---

## 9. Veze

- `PRODUCT.md` — pitch-side / Croatian UI / invite-only hobby
- `docs/ux-zadaci.md` — UX-13, UX-22, UX-23, UX-24
- Brand: `marka` `#0c300c`, `marka-svijetla` `#307830` (i `marka-linija` ako treba za sitne linije)
