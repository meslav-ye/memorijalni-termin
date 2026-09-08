# Rating contribution (golovi / asistencije / golman)

**Status:** approved  
**Date:** 2026-09-08

## Goal

Keep team Elo as the base rating move, then add a small **additive** individual layer from goals, assists, own goals, and goals conceded while in goal — same numbers for **group** and **global** rating.

## Formula (per finished game / utakmica)

1. Compute team Elo as today (`computeElo` / `computeDualElo`).
2. Compute raw individual contribution for each player in that game’s lineup:

| Event | Points |
|---|---|
| Goal (`goal`, scorer) | +2 |
| Assist | +1 |
| Own goal (`own_goal`, scorer) | −1 |
| Goals conceded while active keeper | band below |
| Team goals conceded (every player on that side) | **−⌊n / 4⌋**, max **−3** |

3. Clamp the **sum** of a player’s contribution to **[−6, +6]**.

### Team conceded ladder (defence stake)

| Team conceded | Points (each player on that team) |
|---|---|
| 0–3 | 0 |
| 4–7 | −1 |
| 8–11 | −2 |
| 12+ | −3 |

Replaces a one-shot blowout threshold — gradual so “only attack” leaks matter before 14.
4. `ratingAfter = ratingBefore + eloDelta + contrib` (same contrib for group and global).

### Keeper band (goals conceded while active)

Active keeper = lineup `is_goalkeeper` at kickoff, updated by `keeper_change` at `elapsed_seconds` (same polarity as keeper stats: conceding team = `opposite(event.team)` for both `goal` and `own_goal`).

Any player who was in goal counts (not limited to profile “Igram golmana”).

| Conceded | Keeper points |
|---|---|
| 0–2 | +2 |
| 3–4 | +1 |
| 5–6 | 0 |
| 7–9 | −1 |
| 10–12 | −2 |
| 13+ | −3 |

If the player never stood in goal that game → 0 from the keeper component.

## Settlement

- Runs in `settleRatings` after Elo, before writing `rating_history` / `apply_*`.
- One history row per `(game_id, user_id, scope)` with final before/after (no new DB columns in v1).
- Group and global settle independently (existing idempotency); contribution applies whenever that scope is written.

## UI

On game summary (`sazetak`), show total delta; optionally break down as Elo vs contribution by recomputing contribution from events (no stored split).

## Out of scope (v1)

- No backfill / replay of historical ratings.
- No zero-sum redistribution of contribution.
- No margin-of-victory change to Elo K.

## Testing

Domain unit tests for contribution (goals, assists, OG, keeper bands, clamp, multi-keeper shifts). Existing Elo tests unchanged.
