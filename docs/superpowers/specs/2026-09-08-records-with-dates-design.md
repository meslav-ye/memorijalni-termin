# Rekordi s datumima

## Goal

Enrich group **Rekordi** with match dates on single-game feats, add G+A and fewest goals conceded in one match.

## Records

| Title | Metric | `who` |
|-------|--------|-------|
| Najviše golova na utakmici | goals by one player in one finished game | `Nadimak · {formatShortDate}` |
| Najviše G+A | goals + assists by one player in one game | same |
| Najmanje primljenih na utakmici | goals/own_goals conceded while that player was in goal for that game (any lineup/keeper_change keeper, not only profile) | same |
| Najviše termina ukupno | `sessionsAttended` | nickname only |
| Najveća pobjeda | unchanged (score + date already) | — |

Removed: Najviše termina zaredom (streak stays on player profile only).


## Rules

- Date from `MatchForStats.startsAt` (termin start). Missing → `—`.
- Ties: keep first best (strict `>` / `<`), same as today’s goals record.
- G+A: each `goal` +1 for scorer, each assist +1 for `assistId`; own goals do not add to G.
- Fewest conceded: reuse `keeperAt` polarity (conceding team = opposite of event team); include `own_goal`.
- Empty: omit record if no qualifying game (no goals / no G+A / no one ever in goal).

## Implementation

- Pure helpers in `lib/domain/records.ts` + unit tests.
- `computeRecords` in `lib/data/leaderboard.ts` maps helpers → `StatRecord`.
- Statistika empty slots list includes the two new titles.
- Bump leaderboard cache key so cards refresh.

## Non-goals

- Separate `when` field on `StatRecord`.
- Contribution / Elo “bodovi”.
- Profile-only filter for the single-match conceded record.
