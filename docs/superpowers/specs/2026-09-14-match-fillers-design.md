# Popunjači na terminu

**Status:** implemented  
**Date:** 2026-09-14

## Goal

Admin može dodati neregistrirane igrače („popunjači") na termin. Broje se u kapacitet, vide se na ekipama i uživo, ali nemaju statistiku ni rating.

## Model

- **`match_fillers`** — termin razina: `id`, `match_id`, `display_name`, `added_at`
- **`match_lineup`** — proširen: `id` PK, nullable `user_id`, `filler_id`, `display_name`, `is_guest`

## Pravila

| Pravilo | Ponašanje |
|---------|-----------|
| Tko dodaje | Samo admin grupe |
| Kada | Dok je termin `najavljen` |
| Kapacitet | `prijavljeni + popunjači` vs `capacity`; prijave koriste `capacity − popunjači` |
| Ekipe | Premještaj, golman (bez provjere profila) |
| Predloži ekipe | Popunjači se zadržavaju |
| Sljedeća utakmica | `copyLineup` kopira popunjače |
| Golovi / rating | Samo registrirani igrači |

## UI

- Termin: lista popunjača + „Dodaj popunjača"
- Ekipe: oznaka „gost", bez utjecaja na prosjek ratinga
- Uživo: statičan prikaz, bez unosa golova
- Sažetak: ime + „gost", bez delta ratinga
