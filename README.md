# Memorijalni termin

Web aplikacija za organizaciju rekreativnih nogometnih **5v5 termina**: otvaranje termina,
prijave s listom čekanja, slaganje ekipa, mjerenje vremena i unos golova uživo, te statistika grupe.

Radi na laptopu i na mobitelu, s time da je **mobitel primarni uređaj** — ekran "Termin uživo"
je pravljen za korištenje stojeći pored terena, jednom rukom.

## Dokumentacija

| Dokument | Što sadrži |
|---|---|
| [Specifikacija](docs/superpowers/specs/2026-09-05-memorijalni-termin-design.md) | Što aplikacija radi i kako izgleda izvana |
| [Plan implementacije](docs/superpowers/plans/2026-09-05-memorijalni-termin-mvp.md) | Koraci izrade, od kostura do statistike |
| [Verzije alata](docs/verzije.md) | Zakucane verzije i zašto dvije nisu najnovije |
| [To do](docs/todo.md) | Što još treba napraviti |
| [Optimizacija](docs/optimizacija.md) | Izmjerena potrošnja i što raditi kad naraste |

### Kako se vodi `docs/todo.md`

Stavka se briše iz popisa tek kad je **odrađena, istestirana i na produkciji** —
tim redoslijedom, sva tri uvjeta.

Dok nije na produkciji, ostaje zapisana. Ne briše se kad je kod napisan, ni kad je
commitan, ni kad prolaze provjere. Razlog je jednostavan: dok nije živo, nije
gotovo, a popis koji laže gori je od nikakvog popisa.

Ako je stavka djelomično odrađena, ostaje — uz kratku bilješku što je od nje već
napravljeno, da se ne radi dvaput.

## Pokretanje

Preduvjeti: Node 26, pnpm, Docker Desktop.

```bash
pnpm install
```

Lokalna baza (traži pokrenut Docker):

```bash
pnpm supabase start
```

Razvojni server:

```bash
pnpm dev
```

## Provjere

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Tehnologija

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Realtime, RLS) · Vercel

## Napomena za AI agente

`AGENTS.md` u korijenu generira i održava sam `next dev` — ne uređuj ga ručno.
Sadrži uputu da se prije pisanja Next-specifičnog koda pročita dokumentacija u
`node_modules/next/dist/docs/`, jer se Next 16 razlikuje od starijih verzija.
Ta je uputa točna i vrijedi je poslušati.
