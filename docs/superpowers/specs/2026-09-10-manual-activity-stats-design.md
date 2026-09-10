# Ručni unos trkačkih podataka — design

**Datum:** 2026-09-10  
**Status:** odobreno za plan implementacije (revidirano: Vodeći vs Rekordi)  
**Doseg:** unos distance / max / avg brzine po završenom terminu; Vodeći (ukupni km); Rekordi (km/max/avg s jednog termina); Ljestvica (samo zbroj km); brand slikice

---

## 1. Cilj

Omogućiti igraču da **sam** unese trkačke brojke s termina (bez Strave), i da grupa vidi usporedbu u statistikama.

Success: igrač koji je igrao završeni termin unese km / max / avg; na Statistici **Vodeći** pokazuje ukupne km; **Rekordi** pokazuje najbolji km, max i avg s jednog termina; na Ljestvici lista „Trčanje” zbraja samo distancu.

---

## 2. Odluke

| Odluka | Izbor |
|---|---|
| Izvor podataka | Ručni unos (ne Strava) |
| Tko unosi | **Samo igrač sam za sebe** |
| Opseg unosa | **Jedan red po terminu** (cijela večer), ne po game-u |
| Tko smije unijeti | Bio u `match_lineup` barem na jednoj igri tog termina |
| Jedinice | Distanca **km**, brzine **km/h** |
| Kad | Tek kad je match `zavrsen`; **bez** vremenskog limija |
| Polja | **Opcionalna** — može samo distanca, ili samo brzine |
| Elo / ekipe | **Ne ulaze** u rating ni `suggestTeams` |
| UI unosa | Blok na **sažetku** + read-only popis unosa ekipe |
| **Vodeći** | Samo **ukupna distanca** (zbroj) — avg/max se ne zbrajaju |
| **Rekordi** | **Distanca**, **max brzina** i **prosj. brzina** s **jednog termina** (+ datum kao ostali rekordi) |
| **Ljestvica** | Lista **Trčanje** prije Dolaznosti — **samo zbroj km**, bez avg/max u redu |
| Privatnost | Ručni brojevi, ne GPS stream; puls **nije** u scopeu |

---

## 3. Podaci

Nova tablica `match_activity`:

| Kolona | Tip | Napomena |
|---|---|---|
| `match_id` | uuid FK → matches | dio PK |
| `user_id` | uuid FK → profiles | dio PK |
| `distance_km` | numeric nullable | ≥ 0 |
| `max_speed_kmh` | numeric nullable | ≥ 0 |
| `avg_speed_kmh` | numeric nullable | ≥ 0 |
| `updated_at` | timestamptz | |

**RLS**
- SELECT: aktivni članovi grupe kojoj pripada match
- INSERT/UPDATE/DELETE: samo `user_id = auth.uid()`, i samo ako je match `zavrsen` i postoji red u `match_lineup` za taj match (bilo koji `game_id` termina) za tog usera

**Validacija (server action)**
- parsiranje decimala (zarez ili točka)
- vrijednosti ≥ 0
- ako su oba speed-a postavljena: `avg_speed_kmh ≤ max_speed_kmh`
- gornji limiti protiv tipfelera: distanca ≤ 50, max ≤ 50, avg ≤ 40
- ako su sva tri polja prazna nakon submita → obriši red (nema „praznog” zapisa)

Agregacija i UI **ne** čitaju Strava / GPS.

---

## 4. Unos (sažetak)

Na `/grupe/[grupaId]/termin/[terminId]/sazetak`, samo za `status = zavrsen`:

1. Ako je trenutni user bio u lineup-u → sekcija **„Moji trkački podaci”**: tri polja + Spremi (server action upsert).
2. Ispod: **„Unosi ekipe”** — read-only lista svih igrača iz lineupa; tko nema unos → `—`.

Admin **ne** može unijeti tuđe brojke (odluka A).

---

## 5. Agregacije i rekordi (sezona / sve vrijeme)

Isti `SeasonBar` filter kao ostatak Statističke / Ljestvice. Uključeni su samo završeni termini u rasponu; samo redovi iz `match_activity`.

### 5.1 Ukupno (za Vodeće i Ljestvicu)

| Metrika | Formula | Gdje |
|---|---|---|
| Distanca po igraču | `sum(distance_km)` (null se ignorira) | Vodeći + lista Trčanje |

Igrač bez ijednog `distance_km` **ne ulazi** u Vodeće ni listu Trčanje.

### 5.2 Po terminu (za Rekorde)

Rekordi su **uvijek** vezani uz jedan termin (isti pattern kao „Najviše golova na utakmici” — `who` s datumom).

| Title | Formula | Art |
|---|---|---|
| Najviše kilometara na terminu | najveći `distance_km` na jednom terminu; čuva `user_id` + `starts_at` | `stats-distance.png` |
| Najveća max brzina | najveći `max_speed_kmh` među unosima u rasponu; isto | `stats-max-speed.png` |
| Najveća prosj. brzina | najveći `avg_speed_kmh` među unosima u rasponu; isto | `stats-avg-speed.png` |

Napomena: ista slikica `stats-distance.png` služi i Vodećem (ukupno) i Rekordu (jedan termin) — kao golovi danas.

Remi: stariji termin / abeceda nadimka — uskladiti s postojećim `computeRecords` tie-breakom ako postoji; inače prvi nađeni max.

**Nije Vodeći:** max/avg (samo ukupni km). **Nije sezonski rang** za max/avg — samo single-termin Rekordi.

---

## 6. Statistika — Vodeći

U **Vodeći** dodati **jednu** `StatsLeaderCard`:

| Title | Value | Art |
|---|---|---|
| Najviše kilometara | sum km | `/brand/stats/stats-distance.png` |

Link na profil igrača. Prazno → `—`.

Proširiti `STATS_ART` s `distance`, `maxSpeed`, `avgSpeed` (speed art ide na Rekorde).

---

## 7. Statistika — Rekordi

U postojeći `recordCards` / `computeRecords` pipeline dodati tri naslova (prazni placeholderi ostaju vidljivi kao ostali rekordi):

- **Najviše kilometara na terminu** — value npr. `8.4 km`, who npr. `Mislav · 12. 3.`
- **Najveća max brzina** — value npr. `31.2 km/h`, who npr. `Ivan · 12. 3.`
- **Najveća prosj. brzina** — value npr. `9.4 km/h`, who s datumom

Ikone: `STATS_ART.distance` / `maxSpeed` / `avgSpeed`.

---

## 8. Ljestvica — lista Trčanje

Ispod glavne tablice, **prije** sekcije Dolaznost:

- Naslov: **Trčanje**
- Sort: ukupni km desc, pa nickname
- Red: nickname (+ Ti highlight) · **`X.X km`** (samo distanca — **bez** max/avg)
- Samo igrači s barem jednim `distance_km` u rasponu
- Ako nitko: „Još nema unesenih kilometara.”

---

## 9. Brand slikice

Tri PNG u `public/brand/stats/`:

- `stats-distance.png` — Vodeći (ukupni km) + Rekord (km na terminu)  
- `stats-max-speed.png` — Rekord max  
- `stats-avg-speed.png` — Rekord avg  

---

## 10. Van scopea

- Strava / Garmin OAuth  
- Puls / GPS ruta  
- Utjecaj na Elo ili slaganje ekipa  
- Admin unos za druge  
- Unos po pojedinoj utakmici (game)  
- Vodeći kartice za max/avg  
- Max/avg stupci ili brojke na listi Trčanje  
- Sezonski „prosjek prosjeka” kao zasebna rang lista  

---

## 11. Testiranje (smjer)

- Domain: sum distance; single-termin max/avg records s datumom; avg ≤ max validacija; prazan submit briše  
- RLS / action: tuđi upsert odbijen; unos prije `zavrsen` odbijen; non-lineup odbijen  
- UI smoke: sažetak forma; jedan Vodeći (ukupni km); tri Rekorda (km/max/avg na terminu); lista Trčanje samo km prije Dolaznosti
