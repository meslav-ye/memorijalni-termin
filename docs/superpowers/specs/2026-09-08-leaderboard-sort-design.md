# Ljestvica — client-side column sort

Date: 2026-09-08  
Status: approved

## Goal

Allow sorting the main leaderboard table by column in the browser (no URL persistence).

## Behaviour

- Clickable headers: Igrač, G, A, AG, U, G/U, P-N-P, %, Rating
- First click on a column → descending (best / highest first); second → ascending
- Active column shows ▲ / ▼
- Default order unchanged: goals ↓, assists ↓, rating ↓, then nickname
- P-N-P sorts by wins, then draws, then losses (same direction)
- Nickname uses `localeCompare(..., "hr")`
- Ties break on nickname ascending
- Season switch remounts the page → sort resets to default
- Dolaznost and Rekordi sections unchanged

## Approach

Server page still fetches via `getLeaderboard`. A small client component owns table sort state and reorders rows locally.
