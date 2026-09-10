# Soft brand gumbovi (nav + sekundarne akcije)

**Date:** 2026-09-10  
**Status:** approved — implement immediately

## Goal

Replace grey underline word-links (← Moje grupe, Profil, Natrag…, Izdaj novi link, Odjava, etc.) with a shared **soft brand** control so secondary chrome is clearly tappable on mobile without competing with primary green CTAs.

## Decisions

- **Scope:** navigation + secondary actions (not player-name links, not primary CTAs, not red destructive, not inline body links like mailto / “tab Ljestvica” in prose).
- **Look:** soft brand — `border-marka/20`, `bg-marka/5`, `text-marka`, `rounded-lg`, ~36px height, `text-sm font-semibold`, focus ring on marka.
- **API:** one `SoftLink` (Next `Link` / `<a>`) and `SoftButton` (native `<button>`) sharing the same class string.

## Out of scope

- Leaderboard / clanovi / stats name links  
- Full-width primary green buttons  
- Red cancel/remove submit styles  
- Privacy mailto and other in-paragraph links  

## Implementation note

Centralize classes in `components/ui/softControl.ts` (+ thin wrappers) and swap call sites that match scope.
