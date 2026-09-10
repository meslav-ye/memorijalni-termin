# Ručni unos trkačkih podataka — design

**Datum:** 2026-09-10  
**Status:** odobreno za plan implementacije  
**Doseg:** unos distance / max / avg brzine po završenom terminu; prikaz u Statistici (Vodeći) i Ljestvici (lista prije Dolaznosti); brand slikice

---

## 1. Cilj

Omogućiti igraču da **sam** unese trkačke brojke s termina (bez Strave), i da grupa vidi usporedbu u statistikama.

Success: igrač koji je igrao završeni termin unese km / max / avg; na Statistici se pojave tri nova vodeća; na Ljestvici nova lista „Trčanje” ispred Dolaznosti.

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
| Statistika | Tri nove **Vodeći** kartice |
| Ljestvica | Jedna lista **Trčanje** **prije** Dolaznosti |
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

## 5. Agregacije (sezona / sve vrijeme)

Isti `SeasonBar` filter kao ostatak Statističke / Ljestvice. Uključeni su samo završeni termini u rasponu; samo redovi iz `match_activity`.

| Metrika | Formula |
|---|---|
| Distanca | `sum(distance_km)` (null se ignorira) |
| Max brzina | `max(max_speed_kmh)` |
| Prosj. brzina | aritmetička sredina `avg_speed_kmh` gdje nije null |

Igrač bez ijedne relevantne vrijednosti **ne ulazi** u rang te metrike / listu Trčanje.

---

## 6. Statistika — Vodeći

U postojeću sekciju **Vodeći** dodati tri `StatsLeaderCard`:

| Title | Value | Art |
|---|---|---|
| Najviše kilometara | sum km | `/brand/stats/stats-distance.png` |
| Najveća max brzina | max km/h | `/brand/stats/stats-max-speed.png` |
| Najveća prosj. brzina | avg km/h | `/brand/stats/stats-avg-speed.png` |

Link na profil igrača kao ostale kartice. Prazno → `—` / bez who.

Proširiti `STATS_ART` u `components/brand/statsArt.ts` s `distance`, `maxSpeed`, `avgSpeed`.

---

## 7. Ljestvica — lista Trčanje

Ispod glavne tablice, **prije** sekcije Dolaznost:

- Naslov: **Trčanje**
- Sort: ukupni km desc, pa nickname
- Red: nickname (+ Ti highlight) · `X.X km · max Y.Y · avg Z.Z` (nedostajuće = `—`)
- Samo igrači s barem jednim non-null poljem u rasponu
- Ako nitko nema unos: kratka poruka tipa „Još nema unesenih trkačkih podataka.”

---

## 8. Brand slikice

Tri PNG u `public/brand/stats/`, isti vizualni jezik kao postojeći badgeovi (soft 3D, forest/sage green, cream bg, lopta kao motiv):

- `stats-distance.png` — staza + pin + lopta  
- `stats-max-speed.png` — gauge, igla desno (visoko)  
- `stats-avg-speed.png` — gauge, igla gore (sredina)

---

## 9. Van scopea

- Strava / Garmin OAuth  
- Puls / GPS ruta  
- Utjecaj na Elo ili slaganje ekipa  
- Admin unos za druge  
- Unos po pojedinoj utakmici (game)  
- Posebne tablice rangiranja na Statistici (samo Vodeći kartice; detaljna lista je na Ljestvici)

---

## 10. Testiranje (smjer)

- Domain: agregacije sum/max/mean; avg ≤ max validacija; prazan submit briše  
- RLS / action: tuđi upsert odbijen; unos prije `zavrsen` odbijen; non-lineup odbijen  
- UI smoke: sažetak forma, Vodeći kartice, lista Trčanje prije Dolaznosti
