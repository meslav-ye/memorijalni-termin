# Memorijalni termin — plan implementacije (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Izgraditi responzivnu web aplikaciju za organizaciju 5v5 nogometnih termina — od kreiranja grupe i prijava, preko slaganja ekipa i unosa golova uživo, do statistike i Elo ratinga.

**Architecture:** Next.js App Router kao jedini sloj sučelja, Supabase Postgres kao baza + prijava + živa sinkronizacija. Sva poslovna logika (lista čekanja, balansiranje ekipa, Elo, štoperica, statistika) je izvučena u **čiste funkcije bez ovisnosti** u `lib/domain/` — one se testiraju jedinično i brzo, a React komponente ih samo pozivaju. Sva prava pristupa provode se u bazi kroz Row Level Security, ne u sučelju.

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + Realtime + RLS) · Vitest · Playwright · Vercel

**Izvor:** [`docs/superpowers/specs/2026-09-05-memorijalni-termin-design.md`](../specs/2026-09-05-memorijalni-termin-design.md)

---

## Pravila rada na ovom projektu

Ova pravila nadjačavaju uobičajene navike i vrijede za svaki zadatak u planu.

1. **Nikad ne izvršavaj `git commit` sam.** Zadaci koji završavaju commitom navode `git add` i **predloženi tekst commita**. Commit izvršava Mislav ručno. Nikad ne dodavaj `Co-Authored-By` ni "Generated with" potpise.
2. **Nikad ne stvaraj `claude/*` grane.** Radi na `main`, ili na grani imenovanoj po međukoraku (`m4-termini`, `m6-uzivo`).
3. **Verzije se dohvaćaju uživo, ne po sjećanju.** Zadatak M0-1 to eksplicitno traži. Nikad `latest`, `^`, `~` ni prazan raspon u datotekama koje idu u repo.
4. **Svi tekstovi prema korisniku su na hrvatskom.** Nazivi u kodu, tablicama i stupcima su na engleskom.
5. **TDD za `lib/domain/`.** Test prvo, gledaj kako pada, pa minimalna implementacija. Za React komponente i ekrane test je Playwright smoke test na kraju međukoraka.

---

## Preduvjeti — mora se obaviti ručno prije M0

Ovo Claude ne može odraditi umjesto tebe:

- [ ] Instaliran **Docker Desktop** (traži ga lokalni Supabase).
- [ ] Instaliran **Node.js** (aktualni LTS) i **pnpm**.
- [ ] GitHub repo `meslav-ye/memorijalni-termin` postoji i prazan je.
- [ ] SSH ključ za `meslav-ye` postavljen prema poglavlju 12.3 specifikacije.
- [ ] Otvoren **Supabase** račun i projekt u regiji **EU (Frankfurt)**.
- [ ] Otvoren **Vercel** račun, prijavom preko GitHub računa `meslav-ye`.
- [ ] U Supabase panelu uključen **Google OAuth** (traži Google Cloud OAuth client ID i secret).
  - Google aplikacija ostaje u stanju `Testing` sve do **M9-5** — dotad se Googleom mogu prijaviti samo ručno upisani test korisnici. To je dovoljno za razvoj. Objava traži živ homepage i stranicu o privatnosti, koje prije prvog deploya ne postoje.

---

## Struktura datoteka

```
memorijalni-termin/
├── app/
│   ├── layout.tsx                       # root layout, hrvatski lang, fontovi
│   ├── page.tsx                         # preusmjeravanje: prijava ili moje grupe
│   ├── prijava/page.tsx                 # tri metode prijave
│   ├── profil/page.tsx                  # nadimak, oznaka golmana
│   ├── grupe/
│   │   ├── page.tsx                     # lista mojih grupa
│   │   ├── nova/page.tsx                # kreiranje grupe
│   │   ├── pridruzi/[kod]/page.tsx      # zahtjev za članstvo preko pozivnice
│   │   └── [grupaId]/
│   │       ├── layout.tsx               # tabovi grupe
│   │       ├── page.tsx                 # tab: termini
│   │       ├── ljestvica/page.tsx       # tab: statistika
│   │       ├── clanovi/page.tsx         # tab: članovi + zahtjevi
│   │       ├── postavke/page.tsx        # tab: postavke (admin)
│   │       └── termin/
│   │           ├── novi/page.tsx
│   │           └── [terminId]/
│   │               ├── page.tsx         # detalji + prijave
│   │               ├── ekipe/page.tsx   # slaganje ekipa
│   │               ├── uzivo/page.tsx   # GLAVNI EKRAN
│   │               └── sazetak/page.tsx
│   └── api/                             # server actions umjesto REST rutа gdje ide
├── components/
│   ├── ui/                              # shadcn/ui, generirano
│   ├── termin/
│   │   ├── PrijavaGumb.tsx
│   │   ├── ListaPrijava.tsx
│   │   ├── EkipeKolone.tsx
│   │   ├── IgracGumb.tsx                # veliki gumb na ekranu uživo
│   │   ├── AsistencijaTraka.tsx         # donja traka nakon gola
│   │   ├── Stoperica.tsx
│   │   └── Kronologija.tsx
│   └── grupa/
│       ├── LjestvicaTablica.tsx
│       └── ClanRedak.tsx
├── lib/
│   ├── domain/                          # ČISTE FUNKCIJE — srce aplikacije
│   │   ├── types.ts
│   │   ├── waitlist.ts                  # tko je unutra, tko na listi čekanja
│   │   ├── timer.ts                     # izračun proteklog vremena
│   │   ├── teams.ts                     # prijedlog ekipa + golmani
│   │   ├── elo.ts                       # rating
│   │   ├── duplicates.ts                # zaštita od duplog unosa
│   │   └── stats.ts                     # agregacija statistike
│   ├── supabase/
│   │   ├── client.ts                    # browser klijent
│   │   ├── server.ts                    # server komponente / actions
│   │   └── middleware.ts                # osvježavanje sesije
│   ├── database.types.ts                # generirano iz sheme
│   └── format.ts                        # hrvatski datumi, Europe/Zagreb
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
├── tests/
│   ├── unit/                            # Vitest, uz lib/domain
│   └── e2e/                             # Playwright
├── public/
│   ├── manifest.json
│   └── icons/
└── docs/superpowers/{specs,plans}/
```

**Zašto ovako:** `lib/domain/` ne zna ništa o Reactu ni o Supabaseu. Prima obične objekte, vraća obične objekte. To znači da se najteži dio aplikacije (balansiranje, Elo, lista čekanja) testira u milisekundama, bez baze i bez preglednika — i da se može mijenjati bez straha.

---

## Testna strategija

| Sloj | Alat | Što se testira |
|---|---|---|
| `lib/domain/*` | **Vitest** | Sve. Svaka funkcija, svaki rubni slučaj. TDD. |
| RLS pravila | **SQL testovi** protiv lokalnog Supabasea | Da član ne može ono što ne smije |
| Ekrani | **Playwright** | Jedan smoke test po međukoraku, kroz pravu bazu |

Ne pišemo jedinične testove za React komponente — ne isplati se. Logika je izvučena van, a ostatak pokriva Playwright.

---

# M0 — Kostur i deploy

**Cilj međukoraka:** Prazna, ali živa aplikacija na javnom URL-u. Nakon M0 svaki push na `main` završi na internetu.

### Task M0-1: Dohvati aktualne verzije alata

**Files:**
- Create: `docs/verzije.md`

- [ ] **Step 1: Dohvati stvarne verzije — ne pretpostavljaj iz sjećanja**

```bash
npm view next version && npm view react version && npm view tailwindcss version && npm view vitest version && npm view @playwright/test version && npm view @supabase/supabase-js version && npm view @supabase/ssr version
```

- [ ] **Step 2: Zapiši ih**

Upiši u `docs/verzije.md` tablicu `alat | verzija | datum provjere`, s današnjim datumom. Ovo je referenca za sve kasnije zadatke — kad plan kaže "instaliraj Next.js", misli se na verziju iz ove datoteke.

- [ ] **Step 3: Staging**

```bash
git add docs/verzije.md
```

Predloženi commit: `docs: zabiljezene verzije alata na dan postavljanja`

---

### Task M0-2: Next.js projekt

**Files:**
- Create: cijeli kostur projekta

- [ ] **Step 1: Kreiraj projekt**

```bash
pnpm create next-app@<verzija-iz-docs/verzije.md> . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

- [ ] **Step 2: Postavi hrvatski jezik i vremensku zonu u root layoutu**

`app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memorijalni termin',
  description: 'Organizacija nogometnih 5v5 termina',
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Provjeri da se pokreće**

```bash
pnpm dev
```

Očekivano: server sluša na `http://localhost:3000` i stranica se otvara bez greške u konzoli.

- [ ] **Step 4: Staging**

```bash
git add -A
```

Predloženi commit: `feat: kostur Next.js aplikacije`

---

### Task M0-3: Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instaliraj**

```bash
pnpm add -D vitest@<verzija> @vitest/coverage-v8
```

- [ ] **Step 2: Konfiguriraj**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 3: Dodaj skripte u `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Provjeri da alat radi**

```bash
pnpm test
```

Očekivano: `No test files found` — to je uredu, alat je živ.

- [ ] **Step 5: Staging**

```bash
git add -A
```

Predloženi commit: `chore: postavljen Vitest`

---

### Task M0-4: Lokalni Supabase

**Files:**
- Create: `supabase/config.toml`, `.env.local`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Inicijaliziraj i pokreni**

```bash
pnpm add -D supabase@<verzija> && pnpm supabase init && pnpm supabase start
```

Očekivano: ispis s `API URL`, `anon key` i `service_role key`. Ako padne — Docker Desktop nije pokrenut.

- [ ] **Step 2: Upiši ključeve u `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key iz ispisa>
SUPABASE_SERVICE_ROLE_KEY=<service_role key iz ispisa>
```

- [ ] **Step 3: Kreiraj `.env.example` s istim ključevima, ali praznim vrijednostima**

- [ ] **Step 4: Provjeri da je `.env.local` u `.gitignore`**

```bash
grep -n "env" .gitignore
```

Očekivano: `.env*` je naveden. Ako nije — dodaj `.env*.local`.

- [ ] **Step 5: Staging**

```bash
git add supabase/config.toml .env.example .gitignore package.json pnpm-lock.yaml
```

Predloženi commit: `chore: lokalni Supabase i varijable okoline`

---

### Task M0-5: Prvi deploy na Vercel

**Files:**
- nema izmjena u kodu

- [ ] **Step 1: Poveži repo**

Ručno u Vercel sučelju: *Add New → Project → Import* repo `meslav-ye/memorijalni-termin`.

- [ ] **Step 2: Upiši varijable okoline**

U *Settings → Environment Variables* upiši `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` i `SUPABASE_SERVICE_ROLE_KEY` — **s vrijednostima produkcijskog Supabase projekta**, ne lokalnog.

- [ ] **Step 3: Provjeri**

Otvori `https://memorijalni-termin.vercel.app`. Očekivano: prazna Next.js stranica, HTTPS, bez greške.

**Ovo je kraj M0. Aplikacija je javno dostupna.**

---

# M1 — Baza i sigurnosna pravila

**Cilj:** Cijela shema iz specifikacije, s RLS pravilima koja se stvarno provode.

### Task M1-1: Tipovi i tablice — profili i grupe

**Files:**
- Create: `supabase/migrations/0001_enums_profiles.sql`
- Create: `supabase/migrations/0002_groups.sql`

- [ ] **Step 1: Enumi i profili**

`supabase/migrations/0001_enums_profiles.sql`:

```sql
create type member_role   as enum ('admin', 'member');
create type member_status as enum ('pending', 'active', 'removed');
create type match_status  as enum ('najavljen', 'zakljucan', 'u_tijeku', 'zavrsen', 'otkazan');
create type team_side     as enum ('A', 'B');
create type event_type    as enum ('goal', 'own_goal', 'keeper_change', 'pause', 'resume');

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  full_name     text        not null default '',
  nickname      text        not null default '',
  avatar_url    text,
  is_goalkeeper boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- Profil se stvara automatski pri registraciji korisnika.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Grupe, članstvo, lokacije, sezone**

`supabase/migrations/0002_groups.sql`:

```sql
create table groups (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null,
  description      text,
  invite_code      text        not null unique default encode(gen_random_bytes(6), 'hex'),
  default_capacity int         not null default 10,
  created_by       uuid        not null references profiles on delete restrict,
  created_at       timestamptz not null default now()
);

create table group_members (
  group_id  uuid          not null references groups on delete cascade,
  user_id   uuid          not null references profiles on delete cascade,
  role      member_role   not null default 'member',
  status    member_status not null default 'pending',
  joined_at timestamptz,
  primary key (group_id, user_id)
);

create index on group_members (user_id);

create table locations (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  name     text not null,
  address  text,
  maps_url text
);

create table seasons (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups on delete cascade,
  name      text not null,
  starts_on date not null,
  ends_on   date not null,
  unique (group_id, name)
);
```

- [ ] **Step 3: Primijeni i provjeri**

```bash
pnpm supabase db reset
```

Očekivano: `Applying migration 0001...`, `0002...`, bez greške.

- [ ] **Step 4: Staging**

```bash
git add supabase/migrations
```

Predloženi commit: `feat(db): profili, grupe, clanstvo, lokacije, sezone`

---

### Task M1-2: Termini, prijave, postava

**Files:**
- Create: `supabase/migrations/0003_matches.sql`

- [ ] **Step 1: Napiši migraciju**

```sql
create table matches (
  id                   uuid primary key default gen_random_uuid(),
  group_id             uuid         not null references groups on delete cascade,
  season_id            uuid         not null references seasons on delete restrict,
  location_id          uuid         references locations on delete set null,
  location_text        text,
  starts_at            timestamptz  not null,
  capacity             int          not null default 10,
  notes                text,
  status               match_status not null default 'najavljen',
  started_at           timestamptz,
  paused_at            timestamptz,
  total_paused_seconds int          not null default 0,
  ended_at             timestamptz,
  score_a              int          not null default 0,
  score_b              int          not null default 0,
  created_by           uuid         not null references profiles on delete restrict,
  created_at           timestamptz  not null default now()
);

create index on matches (group_id, starts_at desc);

create table match_signups (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid        not null references matches on delete cascade,
  user_id       uuid        not null references profiles on delete cascade,
  signed_up_at  timestamptz not null default now(),
  manual_order  int,
  cancelled_at  timestamptz,
  unique (match_id, user_id)
);

create index on match_signups (match_id);

create table match_lineup (
  match_id      uuid      not null references matches on delete cascade,
  user_id       uuid      not null references profiles on delete cascade,
  team          team_side not null,
  is_goalkeeper boolean   not null default false,
  primary key (match_id, user_id)
);
```

- [ ] **Step 2: Primijeni**

```bash
pnpm supabase db reset
```

Očekivano: sve tri migracije prolaze.

- [ ] **Step 3: Staging**

```bash
git add supabase/migrations/0003_matches.sql
```

Predloženi commit: `feat(db): termini, prijave, postava`

---

### Task M1-3: Događaji i rating

**Files:**
- Create: `supabase/migrations/0004_events_ratings.sql`

- [ ] **Step 1: Napiši migraciju**

```sql
create table match_events (
  id              uuid       primary key default gen_random_uuid(),
  match_id        uuid       not null references matches on delete cascade,
  type            event_type not null,
  team            team_side,
  scorer_id       uuid       references profiles on delete set null,
  assist_id       uuid       references profiles on delete set null,
  elapsed_seconds int        not null default 0,
  created_by      uuid       not null references profiles on delete restrict,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid       references profiles on delete set null
);

create index on match_events (match_id, created_at desc);

create table player_ratings (
  group_id       uuid        not null references groups on delete cascade,
  user_id        uuid        not null references profiles on delete cascade,
  rating         int         not null default 1000,
  matches_played int         not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table rating_history (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches on delete cascade,
  user_id       uuid not null references profiles on delete cascade,
  rating_before int  not null,
  rating_after  int  not null,
  unique (match_id, user_id)
);
```

- [ ] **Step 2: Primijeni i staging**

```bash
pnpm supabase db reset && git add supabase/migrations/0004_events_ratings.sql
```

Predloženi commit: `feat(db): dogadjaji termina i rating`

---

### Task M1-4: RLS pravila

**Files:**
- Create: `supabase/migrations/0005_rls.sql`

- [ ] **Step 1: Pomoćne funkcije**

**Važno:** ove funkcije **moraju** biti `security definer`. Bez toga RLS pravilo na `group_members` koje čita `group_members` ulazi u beskonačnu rekurziju i Postgres vrati grešku.

```sql
create or replace function public.is_group_member(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_group_admin(g uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = g and user_id = auth.uid()
      and status = 'active' and role = 'admin'
  );
$$;

create or replace function public.is_in_lineup(m uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from match_lineup where match_id = m and user_id = auth.uid()
  );
$$;

create or replace function public.match_group(m uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select group_id from matches where id = m;
$$;
```

- [ ] **Step 2: Uključi RLS i napiši pravila**

```sql
alter table profiles       enable row level security;
alter table groups         enable row level security;
alter table group_members  enable row level security;
alter table locations      enable row level security;
alter table seasons        enable row level security;
alter table matches        enable row level security;
alter table match_signups  enable row level security;
alter table match_lineup   enable row level security;
alter table match_events   enable row level security;
alter table player_ratings enable row level security;
alter table rating_history enable row level security;

-- PROFILI
create policy "profil: citaj svoj" on profiles
  for select using (id = auth.uid());
create policy "profil: citaj suigrace" on profiles
  for select using (
    exists (
      select 1 from group_members mine
      join group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and mine.status = 'active'
        and theirs.user_id = profiles.id and theirs.status = 'active'
    )
  );
create policy "profil: uredi samo svoj" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- GRUPE
create policy "grupa: citaj ako si clan" on groups
  for select using (is_group_member(id));
create policy "grupa: svatko smije kreirati" on groups
  for insert with check (created_by = auth.uid());
create policy "grupa: uredjuje admin" on groups
  for update using (is_group_admin(id));

-- CLANSTVO
create policy "clanstvo: citaj clanove svoje grupe" on group_members
  for select using (is_group_member(group_id) or user_id = auth.uid());
create policy "clanstvo: posalji zahtjev za sebe" on group_members
  for insert with check (user_id = auth.uid() and status = 'pending' and role = 'member');
create policy "clanstvo: admin mijenja" on group_members
  for update using (is_group_admin(group_id));
create policy "clanstvo: admin brise" on group_members
  for delete using (is_group_admin(group_id));

-- LOKACIJE I SEZONE
create policy "lokacije: citaj" on locations
  for select using (is_group_member(group_id));
create policy "lokacije: admin pise" on locations
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "sezone: citaj" on seasons
  for select using (is_group_member(group_id));
create policy "sezone: admin pise" on seasons
  for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- TERMINI
create policy "termin: citaj" on matches
  for select using (is_group_member(group_id));
create policy "termin: admin kreira" on matches
  for insert with check (is_group_admin(group_id));
create policy "termin: admin uredjuje" on matches
  for update using (is_group_admin(group_id));
create policy "termin: clan pokrece i zaustavlja" on matches
  for update using (is_group_member(group_id) and is_in_lineup(id));
create policy "termin: admin brise" on matches
  for delete using (is_group_admin(group_id));

-- PRIJAVE
create policy "prijave: citaj" on match_signups
  for select using (is_group_member(match_group(match_id)));
create policy "prijave: prijavi samo sebe" on match_signups
  for insert with check (user_id = auth.uid() and is_group_member(match_group(match_id)));
create policy "prijave: mijenjaj svoju ili kao admin" on match_signups
  for update using (user_id = auth.uid() or is_group_admin(match_group(match_id)));
create policy "prijave: brisi svoju ili kao admin" on match_signups
  for delete using (user_id = auth.uid() or is_group_admin(match_group(match_id)));

-- POSTAVA
create policy "postava: citaj" on match_lineup
  for select using (is_group_member(match_group(match_id)));
create policy "postava: svaki clan slaze" on match_lineup
  for all using (is_group_member(match_group(match_id)))
  with check (is_group_member(match_group(match_id)));

-- DOGADJAJI
create policy "dogadjaji: citaj" on match_events
  for select using (is_group_member(match_group(match_id)));
create policy "dogadjaji: unosi tko je u postavi dok termin traje" on match_events
  for insert with check (
    created_by = auth.uid()
    and is_in_lineup(match_id)
    and exists (select 1 from matches m where m.id = match_id and m.status = 'u_tijeku')
  );
create policy "dogadjaji: ispravi dok traje ili admin 24h" on match_events
  for update using (
    (is_in_lineup(match_id)
      and exists (select 1 from matches m where m.id = match_id and m.status = 'u_tijeku'))
    or
    (is_group_admin(match_group(match_id))
      and exists (
        select 1 from matches m
        where m.id = match_id and m.ended_at is not null
          and m.ended_at > now() - interval '24 hours'
      ))
  );

-- RATING
create policy "rating: citaj" on player_ratings
  for select using (is_group_member(group_id));
create policy "rating: povijest citaj" on rating_history
  for select using (is_group_member(match_group(match_id)));
```

Rating se upisuje isključivo iz server actiona sa `service_role` ključem, pa `insert`/`update` pravila za `player_ratings` namjerno **ne postoje** — nitko iz preglednika ne smije dirati svoj rating.

- [ ] **Step 3: Primijeni**

```bash
pnpm supabase db reset
```

Očekivano: prolazi bez greške. Ako vidiš `infinite recursion detected in policy` — funkcije iz koraka 1 nisu `security definer`.

- [ ] **Step 4: Staging**

```bash
git add supabase/migrations/0005_rls.sql
```

Predloženi commit: `feat(db): RLS pravila za sve tablice`

---

### Task M1-5: Test podaci i generirani tipovi

**Files:**
- Create: `supabase/seed.sql`
- Create: `lib/database.types.ts` (generirano)
- Modify: `package.json`

- [ ] **Step 1: Napiši seed s dva korisnika i jednom grupom**

`supabase/seed.sql`:

```sql
-- Test korisnici za lokalni razvoj i Playwright.
-- Lozinka za oba: test1234
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@test.hr', crypt('test1234', gen_salt('bf')), now(), '{"full_name":"Admin Adminović"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'igrac@test.hr', crypt('test1234', gen_salt('bf')), now(), '{"full_name":"Igrač Igračević"}');

update profiles set nickname = 'ADMIN'  where id = '11111111-1111-1111-1111-111111111111';
update profiles set nickname = 'IGRAC', is_goalkeeper = true where id = '22222222-2222-2222-2222-222222222222';

insert into groups (id, name, invite_code, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utorak 20h', 'testkod1',
        '11111111-1111-1111-1111-111111111111');

insert into group_members (group_id, user_id, role, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin',  'active', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', 'active', now());

insert into seasons (group_id, name, starts_on, ends_on)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026', '2026-01-01', '2026-12-31');
```

- [ ] **Step 2: Dodaj skriptu za generiranje tipova**

U `package.json`:

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/database.types.ts",
    "db:reset": "supabase db reset && pnpm db:types"
  }
}
```

- [ ] **Step 3: Pokreni**

```bash
pnpm db:reset
```

Očekivano: migracije prođu, seed se izvrši, `lib/database.types.ts` postoji i sadrži `match_events`.

- [ ] **Step 4: Staging**

```bash
git add supabase/seed.sql lib/database.types.ts package.json
```

Predloženi commit: `feat(db): test podaci i generirani TypeScript tipovi`

---

# M2 — Prijava i profil

**Cilj:** Korisnik se prijavi na tri načina, postavi nadimak i oznaku golmana.

### Task M2-1: Supabase klijenti

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`

- [ ] **Step 1: Instaliraj**

```bash
pnpm add @supabase/supabase-js@<verzija> @supabase/ssr@<verzija>
```

- [ ] **Step 2: Browser klijent**

`lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 3: Server klijent**

`lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server komponenta ne smije pisati kolačiće — middleware to preuzima.
          }
        },
      },
    },
  )
}
```

- [ ] **Step 4: Middleware za osvježavanje sesije**

`middleware.ts` u korijenu:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
```

- [ ] **Step 5: Staging**

```bash
git add lib/supabase middleware.ts package.json pnpm-lock.yaml
```

Predloženi commit: `feat(auth): Supabase klijenti i middleware sesije`

---

### Task M2-2: Ekran prijave

**Files:**
- Create: `app/prijava/page.tsx`, `app/prijava/akcije.ts`, `app/auth/callback/route.ts`

- [ ] **Step 1: Server akcije za sve tri metode**

`app/prijava/akcije.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function prijavaGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')!
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })
  if (error) return { greska: 'Prijava Googleom trenutno ne radi. Pokušaj ponovno.' }
  redirect(data.url)
}

export async function posaljiMagicLink(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { greska: 'Upiši email adresu.' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin')!
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { greska: 'Slanje linka nije uspjelo. Pokušaj ponovno.' }
  return { poruka: `Poslali smo ti link na ${email}. Otvori ga na ovom uređaju.` }
}

export async function prijavaLozinkom(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const lozinka = String(formData.get('lozinka') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: lozinka })
  if (error) return { greska: 'Pogrešan email ili lozinka.' }
  redirect('/')
}

export async function registracijaLozinkom(_prev: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const lozinka = String(formData.get('lozinka') ?? '')
  if (lozinka.length < 8) return { greska: 'Lozinka mora imati barem 8 znakova.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password: lozinka })
  if (error) return { greska: 'Registracija nije uspjela. Možda već imaš račun?' }
  redirect('/profil')
}
```

- [ ] **Step 2: Callback ruta**

`app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/`)
  }
  return NextResponse.redirect(`${origin}/prijava?greska=1`)
}
```

- [ ] **Step 3: Ekran**

`app/prijava/page.tsx` — tri odvojena bloka, svaki pun širine, razmaknuti, gumbi visine 56 px (`h-14`):

1. Gumb **Prijavi se Googleom** (poziva `prijavaGoogle`)
2. Forma s poljem *Email* i gumbom **Pošalji mi link** (poziva `posaljiMagicLink`, prikazuje `poruka`)
3. Sklopivi blok **Email i lozinka** s poljima i dva gumba: **Prijavi se** i **Registriraj se**

Sve greške se prikazuju kao crveni tekst ispod pripadajućeg bloka. Nikad se ne prikazuje sirova greška iz Supabasea.

- [ ] **Step 4: Ručna provjera**

```bash
pnpm dev
```

Otvori `/prijava`, prijavi se s `igrac@test.hr` / `test1234`. Očekivano: preusmjeravanje na `/`.

- [ ] **Step 5: Staging**

```bash
git add app/prijava app/auth
```

Predloženi commit: `feat(auth): ekran prijave s tri metode`

---

### Task M2-3: Profil — nadimak i oznaka golmana

**Files:**
- Create: `app/profil/page.tsx`, `app/profil/akcije.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Akcija za spremanje**

`app/profil/akcije.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function spremiProfil(_prev: unknown, formData: FormData) {
  const nickname = String(formData.get('nickname') ?? '').trim().toUpperCase()
  const isGoalkeeper = formData.get('golman') === 'on'

  if (nickname.length < 2) return { greska: 'Nadimak mora imati barem 2 znaka.' }
  if (nickname.length > 12) return { greska: 'Nadimak smije imati najviše 12 znakova.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { error } = await supabase
    .from('profiles')
    .update({ nickname, is_goalkeeper: isGoalkeeper })
    .eq('id', user.id)

  if (error) return { greska: 'Spremanje nije uspjelo. Pokušaj ponovno.' }

  revalidatePath('/profil')
  return { poruka: 'Spremljeno.' }
}
```

- [ ] **Step 2: Ekran**

`app/profil/page.tsx`: polje *Nadimak* (max 12 znakova, uz napomenu "prikazuje se na ekranu uživo — neka bude kratak"), prekidač **Igram golmana**, gumb **Spremi**.

- [ ] **Step 3: Vratar na ulazu**

`app/page.tsx`: server komponenta koja provjerava korisnika i:
- nema korisnika → `redirect('/prijava')`
- ima korisnika, ali `nickname` je prazan → `redirect('/profil')`
- inače → `redirect('/grupe')`

- [ ] **Step 4: Ručna provjera**

Prijavi se novim emailom, očekivano: automatski te odvede na `/profil` jer nadimak nije postavljen.

- [ ] **Step 5: Staging**

```bash
git add app/profil app/page.tsx
```

Predloženi commit: `feat(auth): profil s nadimkom i oznakom golmana`

---

# M3 — Grupe, članstvo, pozivnice

**Cilj:** Admin otvori grupu, podijeli link, odobri ljude.

### Task M3-1: Lista grupa i kreiranje

**Files:**
- Create: `app/grupe/page.tsx`, `app/grupe/nova/page.tsx`, `app/grupe/akcije.ts`

- [ ] **Step 1: Akcija za kreiranje grupe**

`app/grupe/akcije.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function kreirajGrupu(_prev: unknown, formData: FormData) {
  const name = String(formData.get('naziv') ?? '').trim()
  if (name.length < 2) return { greska: 'Naziv grupe mora imati barem 2 znaka.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { data: grupa, error } = await supabase
    .from('groups')
    .insert({ name, created_by: user.id })
    .select('id')
    .single()

  if (error || !grupa) return { greska: 'Grupa nije kreirana. Pokušaj ponovno.' }

  // Osnivač je odmah aktivni admin.
  await supabase.from('group_members').insert({
    group_id: grupa.id, user_id: user.id, role: 'admin', status: 'active', joined_at: new Date().toISOString(),
  })

  const godina = new Date().getFullYear()
  await supabase.from('seasons').insert({
    group_id: grupa.id, name: String(godina),
    starts_on: `${godina}-01-01`, ends_on: `${godina}-12-31`,
  })

  redirect(`/grupe/${grupa.id}`)
}
```

**Pažnja:** `group_members` RLS pravilo za `insert` traži `status = 'pending'`. Ovaj upis ima `status = 'active'`, pa ga treba izvesti kroz `service_role` klijent u server actionu, ili dodati posebno pravilo koje dopušta `active/admin` upis kad je `auth.uid() = groups.created_by`. Odaberi drugu opciju i dodaj u migraciju `0006_founder_policy.sql`:

```sql
create policy "clanstvo: osnivac se upisuje kao admin" on group_members
  for insert with check (
    user_id = auth.uid()
    and role = 'admin'
    and status = 'active'
    and exists (select 1 from groups g where g.id = group_id and g.created_by = auth.uid())
  );
```

- [ ] **Step 2: Ekran liste**

`app/grupe/page.tsx`: dohvati grupe gdje je korisnik `active` član. Ako ih je **točno jedna** → `redirect` ravno u nju. Ako ih nema → prazan ekran s tekstom "Još nisi ni u jednoj grupi" i dva gumba: **Kreiraj grupu**, **Pridruži se preko koda**. Ako postoji `pending` članstvo → kartica "Čeka se odobrenje admina".

- [ ] **Step 3: Primijeni migraciju i provjeri**

```bash
pnpm db:reset && pnpm dev
```

Kreiraj grupu kroz sučelje. Očekivano: preusmjeravanje u novu grupu, ti si admin.

- [ ] **Step 4: Staging**

```bash
git add app/grupe supabase/migrations/0006_founder_policy.sql
```

Predloženi commit: `feat(grupe): lista grupa i kreiranje`

---

### Task M3-2: Pozivnica i odobravanje

**Files:**
- Create: `app/grupe/pridruzi/[kod]/page.tsx`
- Create: `app/grupe/[grupaId]/clanovi/page.tsx`, `app/grupe/[grupaId]/clanovi/akcije.ts`

- [ ] **Step 1: Ekran pridruživanja**

`app/grupe/pridruzi/[kod]/page.tsx`: pronađi grupu po `invite_code`. Ako ne postoji → "Pozivnica nije važeća." Ako korisnik nije prijavljen → prvo `/prijava?povratak=...`. Inače prikaži naziv grupe i gumb **Pošalji zahtjev za članstvo**, koji upisuje `group_members` sa `status = 'pending'`.

- [ ] **Step 2: Akcije za admina**

`app/grupe/[grupaId]/clanovi/akcije.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function odobriClana(grupaId: string, korisnikId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('group_members')
    .update({ status: 'active', joined_at: new Date().toISOString() })
    .eq('group_id', grupaId)
    .eq('user_id', korisnikId)

  if (error) return { greska: 'Odobravanje nije uspjelo.' }

  await supabase.from('player_ratings')
    .upsert({ group_id: grupaId, user_id: korisnikId }, { onConflict: 'group_id,user_id' })

  revalidatePath(`/grupe/${grupaId}/clanovi`)
  return { poruka: 'Član je odobren.' }
}

export async function odbijClana(grupaId: string, korisnikId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('group_members').delete()
    .eq('group_id', grupaId).eq('user_id', korisnikId)

  if (error) return { greska: 'Odbijanje nije uspjelo.' }
  revalidatePath(`/grupe/${grupaId}/clanovi`)
  return { poruka: 'Zahtjev je odbijen.' }
}
```

`player_ratings` upis ide kroz `service_role` klijent, jer obični korisnik nema `insert` pravo na tu tablicu.

- [ ] **Step 3: Ekran članova**

Gornji dio (samo admin, samo ako ih ima): **Zahtjevi za članstvo** — ime, gumbi *Odobri* / *Odbij*.
Donji dio: **Članovi** — nadimak, 🧤 ako je golman, rating, broj termina. Admin ima *Izbaci* i *Napravi adminom*.

- [ ] **Step 4: Postavke grupe s linkom za pozivnicu**

`app/grupe/[grupaId]/postavke/page.tsx` (samo admin): naziv, default kvota, lokacije, i blok **Pozivnica** s punim linkom `https://<domena>/grupe/pridruzi/<invite_code>`, gumbom *Kopiraj* i gumbom *Podijeli* koji koristi `navigator.share` (a ako ga preglednik nema, samo kopira).

- [ ] **Step 5: Ručna provjera**

Kao admin kopiraj link, otvori ga u anonimnom prozoru, prijavi se kao `igrac@test.hr`, pošalji zahtjev. Kao admin odobri ga. Očekivano: igrač se pojavi u listi članova.

- [ ] **Step 6: Staging**

```bash
git add app/grupe
```

Predloženi commit: `feat(grupe): pozivnice i odobravanje clanstva`

---

# M4 — Termini i lista čekanja

**Cilj:** Admin otvara termin, ljudi se prijavljuju, lista čekanja radi sama.

### Task M4-1: Zajednički tipovi domene

**Files:**
- Create: `lib/domain/types.ts`

- [ ] **Step 1: Napiši tipove**

```ts
export type Team = 'A' | 'B'

export type SignupRow = {
  userId: string
  signedUpAt: string          // ISO 8601
  manualOrder: number | null
  cancelledAt: string | null
}

export type SignupBuckets = {
  confirmed: string[]         // userId, redom
  waitlist: string[]
}

export type PlayerForBalancing = {
  userId: string
  rating: number
  isGoalkeeper: boolean
}

export type SuggestedTeams = {
  teamA: PlayerForBalancing[]
  teamB: PlayerForBalancing[]
  warnings: string[]
}

export type MatchTimerState = {
  startedAt: string | null
  pausedAt: string | null
  totalPausedSeconds: number
}

export type GoalEventLite = {
  id: string
  type: 'goal' | 'own_goal'
  scorerId: string | null
  createdAt: string
  deletedAt: string | null
}

export type MatchForStats = {
  matchId: string
  scoreA: number
  scoreB: number
  lineup: { userId: string; team: Team }[]
  events: {
    type: 'goal' | 'own_goal'
    scorerId: string | null
    assistId: string | null
    deletedAt: string | null
  }[]
}

export type PlayerStats = {
  userId: string
  goals: number
  assists: number
  ownGoals: number
  matches: number
  wins: number
  draws: number
  losses: number
  goalsPerMatch: number
  winRate: number
}
```

- [ ] **Step 2: Staging**

```bash
git add lib/domain/types.ts
```

Predloženi commit: `feat(domain): zajednicki tipovi`

---

### Task M4-2: Lista čekanja (TDD)

**Files:**
- Create: `lib/domain/waitlist.ts`
- Test: `tests/unit/waitlist.test.ts`

- [ ] **Step 1: Napiši testove koji padaju**

`tests/unit/waitlist.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { splitSignups } from '@/lib/domain/waitlist'
import type { SignupRow } from '@/lib/domain/types'

const prijava = (userId: string, minuta: number, manualOrder: number | null = null,
                 cancelledAt: string | null = null): SignupRow => ({
  userId,
  signedUpAt: `2026-09-01T10:${String(minuta).padStart(2, '0')}:00.000Z`,
  manualOrder,
  cancelledAt,
})

describe('splitSignups', () => {
  it('vraca prazno kad nema prijava', () => {
    expect(splitSignups([], 10)).toEqual({ confirmed: [], waitlist: [] })
  })

  it('svi su unutra kad ih je manje od kvote', () => {
    const r = splitSignups([prijava('a', 1), prijava('b', 2)], 10)
    expect(r.confirmed).toEqual(['a', 'b'])
    expect(r.waitlist).toEqual([])
  })

  it('visak ide na listu cekanja, redom po vremenu prijave', () => {
    const r = splitSignups([prijava('c', 3), prijava('a', 1), prijava('b', 2)], 2)
    expect(r.confirmed).toEqual(['a', 'b'])
    expect(r.waitlist).toEqual(['c'])
  })

  it('otkazane prijave se ne broje', () => {
    const r = splitSignups(
      [prijava('a', 1), prijava('b', 2, null, '2026-09-01T11:00:00.000Z'), prijava('c', 3)], 2)
    expect(r.confirmed).toEqual(['a', 'c'])
    expect(r.waitlist).toEqual([])
  })

  it('kad se prvi odjavi, prvi s liste cekanja automatski ulazi', () => {
    const prije = splitSignups([prijava('a', 1), prijava('b', 2), prijava('c', 3)], 2)
    expect(prije.waitlist).toEqual(['c'])

    const poslije = splitSignups(
      [prijava('a', 1, null, '2026-09-01T12:00:00.000Z'), prijava('b', 2), prijava('c', 3)], 2)
    expect(poslije.confirmed).toEqual(['b', 'c'])
    expect(poslije.waitlist).toEqual([])
  })

  it('rucni redoslijed ima prednost pred vremenom prijave', () => {
    const r = splitSignups([prijava('a', 1), prijava('b', 2), prijava('c', 3, 1)], 1)
    expect(r.confirmed).toEqual(['c'])
    expect(r.waitlist).toEqual(['a', 'b'])
  })

  it('kvota nula stavlja sve na listu cekanja', () => {
    const r = splitSignups([prijava('a', 1)], 0)
    expect(r.confirmed).toEqual([])
    expect(r.waitlist).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Pokreni i vidi da padaju**

```bash
pnpm test tests/unit/waitlist.test.ts
```

Očekivano: FAIL — `Failed to resolve import "@/lib/domain/waitlist"`.

- [ ] **Step 3: Implementiraj**

`lib/domain/waitlist.ts`:

```ts
import type { SignupRow, SignupBuckets } from './types'

/**
 * Dijeli prijave na potvrđene i listu čekanja.
 * Redoslijed: ručni redoslijed (ako postoji) ima prednost, zatim vrijeme prijave.
 * Otkazane prijave se preskaču — zato se lista čekanja "sama" popunjava.
 */
export function splitSignups(signups: SignupRow[], capacity: number): SignupBuckets {
  const ordered = signups
    .filter((s) => s.cancelledAt === null)
    .sort((a, b) => {
      if (a.manualOrder !== null && b.manualOrder !== null && a.manualOrder !== b.manualOrder) {
        return a.manualOrder - b.manualOrder
      }
      if (a.manualOrder !== null && b.manualOrder === null) return -1
      if (a.manualOrder === null && b.manualOrder !== null) return 1
      return a.signedUpAt.localeCompare(b.signedUpAt)
    })

  const limit = Math.max(0, capacity)
  return {
    confirmed: ordered.slice(0, limit).map((s) => s.userId),
    waitlist: ordered.slice(limit).map((s) => s.userId),
  }
}
```

- [ ] **Step 4: Pokreni testove**

```bash
pnpm test tests/unit/waitlist.test.ts
```

Očekivano: PASS, 7 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/waitlist.ts tests/unit/waitlist.test.ts
```

Predloženi commit: `feat(domain): lista cekanja s automatskim popunjavanjem`

---

### Task M4-3: Hrvatsko formatiranje datuma (TDD)

**Files:**
- Create: `lib/format.ts`
- Test: `tests/unit/format.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { formatirajTermin, formatirajKratko } from '@/lib/format'

describe('formatirajTermin', () => {
  it('ispisuje dan, datum i vrijeme u zagrebackoj zoni', () => {
    // 2026-09-08 je utorak; 18:00 UTC = 20:00 po zagrebackom ljetnom vremenu
    expect(formatirajTermin('2026-09-08T18:00:00.000Z')).toBe('uto 08.09.2026. u 20:00')
  })

  it('ispravno racuna zimsko vrijeme', () => {
    // 2026-12-08 je utorak; 19:00 UTC = 20:00 po zagrebackom zimskom vremenu
    expect(formatirajTermin('2026-12-08T19:00:00.000Z')).toBe('uto 08.12.2026. u 20:00')
  })
})

describe('formatirajKratko', () => {
  it('daje samo datum', () => {
    expect(formatirajKratko('2026-09-08T18:00:00.000Z')).toBe('08.09.2026.')
  })
})
```

- [ ] **Step 2: Pokreni, vidi da pada**

```bash
pnpm test tests/unit/format.test.ts
```

Očekivano: FAIL — modul ne postoji.

- [ ] **Step 3: Implementiraj**

```ts
const ZONA = 'Europe/Zagreb'
const DANI = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub']
const ENG_DANI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatirajTermin(iso: string): string {
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, weekday: 'short', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]))
  const indeks = ENG_DANI.indexOf(p.weekday)
  return `${DANI[indeks]} ${p.day}.${p.month}.${p.year}. u ${p.hour}:${p.minute}`
}

export function formatirajKratko(iso: string): string {
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day}.${p.month}.${p.year}.`
}
```

Formatiranje ide preko `en-GB` locale-a, a hrvatski nazivi dana se mapiraju ručno — `hr-HR` u Node okruženju ne daje pouzdano isti oblik kratkog naziva dana na svim verzijama.

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/format.test.ts
```

Očekivano: PASS, 3 testa.

- [ ] **Step 5: Staging**

```bash
git add lib/format.ts tests/unit/format.test.ts
```

Predloženi commit: `feat: hrvatsko formatiranje datuma u zagrebackoj zoni`

---

### Task M4-4: Kreiranje termina

**Files:**
- Create: `app/grupe/[grupaId]/termin/novi/page.tsx`, `app/grupe/[grupaId]/termin/akcije.ts`
- Modify: `app/grupe/[grupaId]/page.tsx`

- [ ] **Step 1: Akcija**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function kreirajTermin(grupaId: string, _prev: unknown, formData: FormData) {
  const datum = String(formData.get('datum') ?? '')          // 2026-09-08
  const vrijeme = String(formData.get('vrijeme') ?? '')      // 20:00
  const capacity = Number(formData.get('kvota') ?? 10)
  const locationId = String(formData.get('lokacija') ?? '') || null
  const locationText = String(formData.get('lokacijaTekst') ?? '').trim() || null
  const notes = String(formData.get('napomena') ?? '').trim() || null

  if (!datum || !vrijeme) return { greska: 'Upiši datum i vrijeme.' }
  if (capacity < 2 || capacity > 30) return { greska: 'Kvota mora biti između 2 i 30.' }
  if (!locationId && !locationText) return { greska: 'Odaberi ili upiši lokaciju.' }

  // Lokalno zagrebačko vrijeme -> ISO. Postgres stupac je timestamptz.
  const startsAt = new Date(`${datum}T${vrijeme}:00`).toISOString()
  const godina = new Date(startsAt).getFullYear()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { data: sezona } = await supabase
    .from('seasons').select('id')
    .eq('group_id', grupaId).eq('name', String(godina)).single()

  let seasonId = sezona?.id
  if (!seasonId) {
    const { data: nova } = await supabase.from('seasons').insert({
      group_id: grupaId, name: String(godina),
      starts_on: `${godina}-01-01`, ends_on: `${godina}-12-31`,
    }).select('id').single()
    seasonId = nova?.id
  }
  if (!seasonId) return { greska: 'Sezona nije pripremljena. Pokušaj ponovno.' }

  const { data: termin, error } = await supabase.from('matches').insert({
    group_id: grupaId, season_id: seasonId, location_id: locationId,
    location_text: locationText, starts_at: startsAt, capacity, notes,
    created_by: user.id,
  }).select('id').single()

  if (error || !termin) return { greska: 'Termin nije kreiran. Pokušaj ponovno.' }
  redirect(`/grupe/${grupaId}/termin/${termin.id}`)
}
```

- [ ] **Step 2: Ekran za kreiranje**

Polja: *Datum*, *Vrijeme*, *Lokacija* (padajući izbornik spremljenih + opcija "Druga lokacija" koja otkriva tekstualno polje), *Kvota* (default iz grupe), *Napomena*. Vidljiv samo adminu.

- [ ] **Step 3: Lista termina u grupi**

`app/grupe/[grupaId]/page.tsx`: dvije sekcije — **Nadolazeći** (`starts_at >= now()`, uzlazno) i **Odigrani** (silazno, prvih 20). Svaka kartica: `formatirajTermin(starts_at)`, lokacija, `N/kvota prijavljenih`, i tvoj status. Admin vidi gumb **Novi termin**.

- [ ] **Step 4: Ručna provjera**

Kreiraj termin. Očekivano: pojavi se u sekciji "Nadolazeći" s ispravnim hrvatskim datumom.

- [ ] **Step 5: Staging**

```bash
git add app/grupe/\[grupaId\]
```

Predloženi commit: `feat(termini): kreiranje i pregled termina`

---

### Task M4-5: Prijava, odjava i lista čekanja u sučelju

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/page.tsx`
- Create: `components/termin/PrijavaGumb.tsx`, `components/termin/ListaPrijava.tsx`
- Modify: `app/grupe/[grupaId]/termin/akcije.ts`

- [ ] **Step 1: Akcije prijave i odjave**

```ts
export async function prijaviSe(grupaId: string, terminId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { data: termin } = await supabase
    .from('matches').select('status').eq('id', terminId).single()

  if (termin?.status !== 'najavljen') {
    return { greska: 'Prijave za ovaj termin su zatvorene.' }
  }

  // Ponovna prijava nakon odjave: poništi otkazivanje i pomakni se na kraj reda.
  const { error } = await supabase.from('match_signups').upsert(
    { match_id: terminId, user_id: user.id, cancelled_at: null, signed_up_at: new Date().toISOString() },
    { onConflict: 'match_id,user_id' },
  )

  if (error) return { greska: 'Prijava nije uspjela. Pokušaj ponovno.' }
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`)
  return { poruka: 'Prijavljen si.' }
}

export async function odjaviSe(grupaId: string, terminId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { error } = await supabase.from('match_signups')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('match_id', terminId).eq('user_id', user.id)

  if (error) return { greska: 'Odjava nije uspjela. Pokušaj ponovno.' }
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}`)
  return { poruka: 'Odjavljen si.' }
}
```

- [ ] **Step 2: Ekran termina**

Dohvati termin, sve prijave i profile. Pozovi `splitSignups(prijave, termin.capacity)`. Prikaži:

1. Zaglavlje: `formatirajTermin`, lokacija kao poveznica na `maps_url`, napomena
2. `ListaPrijava` — numerirano 1..N, nadimci, 🧤 uz golmane
3. Odvojena **Lista čekanja**, nastavak numeracije, sivkasta
4. `PrijavaGumb` — lijepljen za dno na mobitelu (`sticky bottom-0`), pun širine, `h-14`:
   - nisi prijavljen i ima mjesta → **Dolazim**
   - nisi prijavljen i nema mjesta → **Stavi me na listu čekanja**
   - prijavljen si → **Odustajem** (crveni obrub)
   - status nije `najavljen` → gumb onemogućen, tekst "Prijave su zatvorene"

- [ ] **Step 3: Upozorenje na kasnu odjavu**

Ako je do `starts_at` manje od 3 sata, prije odjave prikaži dijalog: *"Termin je uskoro — javi ekipi u WhatsApp."* s gumbima **Ipak se odjavljujem** / **Odustani**.

- [ ] **Step 4: Ručna provjera**

Postavi kvotu na 1. Prijavi se kao admin, pa u drugom pregledniku kao igrač. Očekivano: igrač je na listi čekanja. Odjavi admina. Očekivano: igrač je sada potvrđen.

- [ ] **Step 5: Staging**

```bash
git add app components
```

Predloženi commit: `feat(termini): prijava, odjava i lista cekanja`

---

### Task M4-6: Playwright smoke test za M4

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/prijava-na-termin.spec.ts`

- [ ] **Step 1: Instaliraj**

```bash
pnpm add -D @playwright/test@<verzija> && pnpm exec playwright install chromium
```

- [ ] **Step 2: Konfiguracija**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'mobitel', use: { ...devices['iPhone 13'] } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true },
})
```

- [ ] **Step 3: Test**

```ts
import { test, expect } from '@playwright/test'

async function prijaviSe(page, email: string) {
  await page.goto('/prijava')
  await page.getByLabel('Email').first().fill(email)
  await page.getByLabel('Lozinka').fill('test1234')
  await page.getByRole('button', { name: 'Prijavi se' }).click()
  await expect(page).not.toHaveURL(/prijava/)
}

test('igrac se moze prijaviti na termin i odjaviti', async ({ page }) => {
  await prijaviSe(page, 'igrac@test.hr')
  await page.getByRole('link', { name: /Utorak 20h/ }).click()
  await page.getByRole('link', { name: /prijavljenih/ }).first().click()

  await page.getByRole('button', { name: 'Dolazim' }).click()
  await expect(page.getByText('IGRAC')).toBeVisible()

  await page.getByRole('button', { name: 'Odustajem' }).click()
  await expect(page.getByRole('button', { name: 'Dolazim' })).toBeVisible()
})
```

- [ ] **Step 4: Pokreni**

```bash
pnpm exec playwright test
```

Očekivano: PASS na oba uređaja.

- [ ] **Step 5: Staging**

```bash
git add playwright.config.ts tests/e2e package.json pnpm-lock.yaml
```

Predloženi commit: `test: Playwright smoke test za prijavu na termin`

---

# M5 — Ekipe i balansiranje

### Task M5-1: Prijedlog ekipa (TDD)

**Files:**
- Create: `lib/domain/teams.ts`
- Test: `tests/unit/teams.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { suggestTeams, MIN_MATCHES_FOR_RATING_BALANCE } from '@/lib/domain/teams'
import type { PlayerForBalancing } from '@/lib/domain/types'

const igrac = (userId: string, rating: number, isGoalkeeper = false): PlayerForBalancing =>
  ({ userId, rating, isGoalkeeper })

// Deterministicni "random" za testove: uvijek vraca 0.
const nulaRandom = () => 0

describe('suggestTeams', () => {
  it('razdvaja dva golmana u razlicite ekipe', () => {
    const r = suggestTeams(
      [igrac('g1', 1000, true), igrac('g2', 1000, true), igrac('a', 1000), igrac('b', 1000)],
      10, nulaRandom,
    )
    const aIma = r.teamA.some((p) => p.isGoalkeeper)
    const bIma = r.teamB.some((p) => p.isGoalkeeper)
    expect(aIma && bIma).toBe(true)
    expect(r.warnings).toEqual([])
  })

  it('upozorava kad je samo jedan golman', () => {
    const r = suggestTeams([igrac('g1', 1000, true), igrac('a', 1000)], 10, nulaRandom)
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatch(/nema golmana/)
  })

  it('upozorava kad nema nijednog golmana', () => {
    const r = suggestTeams([igrac('a', 1000), igrac('b', 1000)], 10, nulaRandom)
    expect(r.warnings).toEqual(['Nijedna ekipa nema golmana.'])
  })

  it('balansira po ratingu kad grupa ima dovoljno odigranih termina', () => {
    const r = suggestTeams(
      [igrac('a', 1200), igrac('b', 1100), igrac('c', 900), igrac('d', 800)],
      MIN_MATCHES_FOR_RATING_BALANCE, nulaRandom,
    )
    const zbroj = (t: PlayerForBalancing[]) => t.reduce((s, p) => s + p.rating, 0)
    expect(Math.abs(zbroj(r.teamA) - zbroj(r.teamB))).toBeLessThanOrEqual(100)
  })

  it('ne gubi nijednog igraca', () => {
    const igraci = Array.from({ length: 11 }, (_, i) => igrac(`p${i}`, 1000 + i * 10))
    const r = suggestTeams(igraci, 10, nulaRandom)
    expect(r.teamA.length + r.teamB.length).toBe(11)
    const svi = [...r.teamA, ...r.teamB].map((p) => p.userId).sort()
    expect(svi).toEqual(igraci.map((p) => p.userId).sort())
  })

  it('kod neparnog broja razlika u velicini ekipa je najvise jedan', () => {
    const igraci = Array.from({ length: 9 }, (_, i) => igrac(`p${i}`, 1000))
    const r = suggestTeams(igraci, 10, nulaRandom)
    expect(Math.abs(r.teamA.length - r.teamB.length)).toBe(1)
  })

  it('visak golmana se tretira kao obicni igraci', () => {
    const r = suggestTeams(
      [igrac('g1', 1000, true), igrac('g2', 1000, true), igrac('g3', 1000, true), igrac('a', 1000)],
      10, nulaRandom,
    )
    expect(r.teamA.length + r.teamB.length).toBe(4)
    expect(r.warnings).toEqual([])
  })

  it('prazan popis vraca prazne ekipe i upozorenje', () => {
    const r = suggestTeams([], 10, nulaRandom)
    expect(r.teamA).toEqual([])
    expect(r.teamB).toEqual([])
    expect(r.warnings).toEqual(['Nijedna ekipa nema golmana.'])
  })
})
```

- [ ] **Step 2: Pokreni, vidi da padaju**

```bash
pnpm test tests/unit/teams.test.ts
```

Očekivano: FAIL — modul ne postoji.

- [ ] **Step 3: Implementiraj**

```ts
import type { PlayerForBalancing, SuggestedTeams } from './types'

export const MIN_MATCHES_FOR_RATING_BALANCE = 5

function promijesaj<T>(niz: T[], random: () => number): T[] {
  const kopija = [...niz]
  for (let i = kopija.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[kopija[i], kopija[j]] = [kopija[j], kopija[i]]
  }
  return kopija
}

/** Dva golmana s najmanjom razlikom u ratingu — njih razdvajamo. */
function odaberiParGolmana(golmani: PlayerForBalancing[]): [PlayerForBalancing, PlayerForBalancing] {
  const sortirani = [...golmani].sort((a, b) => b.rating - a.rating)
  let najbolji: [PlayerForBalancing, PlayerForBalancing] = [sortirani[0], sortirani[1]]
  let najmanjaRazlika = Infinity
  for (let i = 0; i < sortirani.length - 1; i++) {
    const razlika = sortirani[i].rating - sortirani[i + 1].rating
    if (razlika < najmanjaRazlika) {
      najmanjaRazlika = razlika
      najbolji = [sortirani[i], sortirani[i + 1]]
    }
  }
  return najbolji
}

export function suggestTeams(
  players: PlayerForBalancing[],
  completedMatchesInGroup: number,
  random: () => number = Math.random,
): SuggestedTeams {
  const teamA: PlayerForBalancing[] = []
  const teamB: PlayerForBalancing[] = []
  const warnings: string[] = []

  const golmani = players.filter((p) => p.isGoalkeeper)
  let ostali = players.filter((p) => !p.isGoalkeeper)

  if (golmani.length >= 2) {
    const [prvi, drugi] = odaberiParGolmana(golmani)
    teamA.push(prvi)
    teamB.push(drugi)
    ostali = [...ostali, ...golmani.filter((g) => g !== prvi && g !== drugi)]
  } else if (golmani.length === 1) {
    const uA = random() < 0.5
    ;(uA ? teamA : teamB).push(golmani[0])
    warnings.push(`Ekipa ${uA ? 'B' : 'A'} nema golmana.`)
  } else {
    warnings.push('Nijedna ekipa nema golmana.')
  }

  const koristiRating = completedMatchesInGroup >= MIN_MATCHES_FOR_RATING_BALANCE
  const redoslijed = koristiRating
    ? [...ostali].sort((a, b) => b.rating - a.rating)
    : promijesaj(ostali, random)

  const zbroj = (t: PlayerForBalancing[]) => t.reduce((s, p) => s + p.rating, 0)

  // Greedy: uvijek dopuni manju ekipu; kod jednakog broja bira ona sa slabijim zbrojem.
  // Kod sortiranog popisa to daje upravo "zmijski" raspored A, B, B, A, A, ...
  for (const igrac of redoslijed) {
    if (teamA.length < teamB.length) teamA.push(igrac)
    else if (teamB.length < teamA.length) teamB.push(igrac)
    else if (zbroj(teamA) <= zbroj(teamB)) teamA.push(igrac)
    else teamB.push(igrac)
  }

  return { teamA, teamB, warnings }
}
```

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/teams.test.ts
```

Očekivano: PASS, 8 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/teams.ts tests/unit/teams.test.ts
```

Predloženi commit: `feat(domain): prijedlog ekipa s razdvajanjem golmana`

---

### Task M5-2: Ekran slaganja ekipa

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/ekipe/page.tsx`
- Create: `components/termin/EkipeKolone.tsx`
- Modify: `app/grupe/[grupaId]/termin/akcije.ts`

- [ ] **Step 1: Akcije**

```ts
export async function predloziEkipe(grupaId: string, terminId: string) {
  const supabase = await createClient()

  const { data: termin } = await supabase
    .from('matches').select('capacity').eq('id', terminId).single()
  if (!termin) return { greska: 'Termin nije pronađen.' }

  const { data: prijave } = await supabase
    .from('match_signups')
    .select('user_id, signed_up_at, manual_order, cancelled_at')
    .eq('match_id', terminId)

  const { confirmed } = splitSignups(
    (prijave ?? []).map((p) => ({
      userId: p.user_id, signedUpAt: p.signed_up_at,
      manualOrder: p.manual_order, cancelledAt: p.cancelled_at,
    })),
    termin.capacity,
  )

  const { data: profili } = await supabase
    .from('profiles').select('id, is_goalkeeper').in('id', confirmed)
  const { data: ratinzi } = await supabase
    .from('player_ratings').select('user_id, rating').eq('group_id', grupaId).in('user_id', confirmed)

  const igraci = confirmed.map((userId) => ({
    userId,
    rating: ratinzi?.find((r) => r.user_id === userId)?.rating ?? 1000,
    isGoalkeeper: profili?.find((p) => p.id === userId)?.is_goalkeeper ?? false,
  }))

  const { count } = await supabase
    .from('matches').select('id', { count: 'exact', head: true })
    .eq('group_id', grupaId).eq('status', 'zavrsen')

  const { teamA, teamB, warnings } = suggestTeams(igraci, count ?? 0)

  await supabase.from('match_lineup').delete().eq('match_id', terminId)
  await supabase.from('match_lineup').insert([
    ...teamA.map((p) => ({ match_id: terminId, user_id: p.userId, team: 'A' as const, is_goalkeeper: p.isGoalkeeper })),
    ...teamB.map((p) => ({ match_id: terminId, user_id: p.userId, team: 'B' as const, is_goalkeeper: p.isGoalkeeper })),
  ])

  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`)
  return { warnings }
}

export async function premjestiIgraca(grupaId: string, terminId: string, korisnikId: string, ekipa: 'A' | 'B') {
  const supabase = await createClient()
  const { error } = await supabase.from('match_lineup')
    .update({ team: ekipa }).eq('match_id', terminId).eq('user_id', korisnikId)
  if (error) return { greska: 'Premještanje nije uspjelo.' }
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`)
  return {}
}

export async function postaviGolmana(grupaId: string, terminId: string, korisnikId: string, ekipa: 'A' | 'B') {
  const supabase = await createClient()
  // U svakoj ekipi je najviše jedan označeni golman.
  await supabase.from('match_lineup')
    .update({ is_goalkeeper: false }).eq('match_id', terminId).eq('team', ekipa)
  await supabase.from('match_lineup')
    .update({ is_goalkeeper: true }).eq('match_id', terminId).eq('user_id', korisnikId)
  revalidatePath(`/grupe/${grupaId}/termin/${terminId}/ekipe`)
  return {}
}
```

Ne zaboravi uvoze `splitSignups` i `suggestTeams` na vrhu datoteke.

- [ ] **Step 2: Ekran**

Dvije kolone (`grid grid-cols-2 gap-3`). Iznad svake: naziv ekipe, broj igrača, zbroj i prosjek ratinga. Ispod obje: razlika u zbroju i žuta upozorenja iz `warnings`.

Premještanje: tap na igrača ga označi (obrub), tap na naslov druge ekipe ga premjesti. Na laptopu radi i povlačenje mišem.

Gumbi ispod: **Predloži ekipe** i **Promiješaj ponovno** (isti poziv), vidljivi svakom članu grupe.

- [ ] **Step 3: Ručna provjera**

Prijavi 4 igrača, klikni *Predloži ekipe*. Očekivano: 2+2, golman razdvojen, upozorenje ako ga fali.

- [ ] **Step 4: Staging**

```bash
git add app components
```

Predloženi commit: `feat(ekipe): prijedlog i rucna korekcija ekipa`

---

# M6 — Termin uživo

**Cilj:** Glavni ekran. Štoperica, gol u dva dodira, autogol, poništi, promjena golmana, živa sinkronizacija.

### Task M6-1: Štoperica (TDD)

**Files:**
- Create: `lib/domain/timer.ts`
- Test: `tests/unit/timer.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { elapsedSeconds, formatClock } from '@/lib/domain/timer'

const T0 = '2026-09-08T18:00:00.000Z'

describe('elapsedSeconds', () => {
  it('vraca nulu prije pokretanja', () => {
    expect(elapsedSeconds({ startedAt: null, pausedAt: null, totalPausedSeconds: 0 }, new Date(T0)))
      .toBe(0)
  })

  it('racuna proteklo vrijeme dok termin traje', () => {
    expect(elapsedSeconds(
      { startedAt: T0, pausedAt: null, totalPausedSeconds: 0 },
      new Date('2026-09-08T18:23:14.000Z'),
    )).toBe(1394)
  })

  it('oduzima ukupno pauzirano vrijeme', () => {
    expect(elapsedSeconds(
      { startedAt: T0, pausedAt: null, totalPausedSeconds: 60 },
      new Date('2026-09-08T18:10:00.000Z'),
    )).toBe(540)
  })

  it('stoji dok je pauzirano, bez obzira koliko je proslo', () => {
    const stanje = { startedAt: T0, pausedAt: '2026-09-08T18:05:00.000Z', totalPausedSeconds: 0 }
    expect(elapsedSeconds(stanje, new Date('2026-09-08T18:05:30.000Z'))).toBe(300)
    expect(elapsedSeconds(stanje, new Date('2026-09-08T18:30:00.000Z'))).toBe(300)
  })

  it('nikad ne vraca negativan broj', () => {
    expect(elapsedSeconds(
      { startedAt: T0, pausedAt: null, totalPausedSeconds: 9999 },
      new Date('2026-09-08T18:00:10.000Z'),
    )).toBe(0)
  })
})

describe('formatClock', () => {
  it('formatira minute i sekunde s vodecom nulom', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(1394)).toBe('23:14')
    expect(formatClock(65)).toBe('01:05')
  })

  it('nastavlja brojati preko 99 minuta', () => {
    expect(formatClock(6000)).toBe('100:00')
  })
})
```

- [ ] **Step 2: Pokreni, vidi da padaju**

```bash
pnpm test tests/unit/timer.test.ts
```

Očekivano: FAIL.

- [ ] **Step 3: Implementiraj**

```ts
import type { MatchTimerState } from './types'

/**
 * Proteklo vrijeme utakmice u sekundama.
 * Sve se izvodi iz vremena servera, pa svi uređaji pokazuju isto.
 */
export function elapsedSeconds(state: MatchTimerState, now: Date): number {
  if (!state.startedAt) return 0

  const pocetak = new Date(state.startedAt).getTime()
  const kraj = state.pausedAt ? new Date(state.pausedAt).getTime() : now.getTime()
  const sirovo = Math.floor((kraj - pocetak) / 1000) - state.totalPausedSeconds

  return Math.max(0, sirovo)
}

export function formatClock(totalSeconds: number): string {
  const minute = Math.floor(totalSeconds / 60)
  const sekunde = totalSeconds % 60
  return `${String(minute).padStart(2, '0')}:${String(sekunde).padStart(2, '0')}`
}
```

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/timer.test.ts
```

Očekivano: PASS, 7 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/timer.ts tests/unit/timer.test.ts
```

Predloženi commit: `feat(domain): stoperica koja se izvodi iz vremena servera`

---

### Task M6-2: Zaštita od duplog unosa (TDD)

**Files:**
- Create: `lib/domain/duplicates.ts`
- Test: `tests/unit/duplicates.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { findRecentDuplicate, secondsAgo, DUPLICATE_WINDOW_SECONDS } from '@/lib/domain/duplicates'
import type { GoalEventLite } from '@/lib/domain/types'

const SADA = new Date('2026-09-08T18:23:14.000Z')

const gol = (id: string, scorerId: string, prijeSekundi: number,
             deletedAt: string | null = null): GoalEventLite => ({
  id, type: 'goal', scorerId,
  createdAt: new Date(SADA.getTime() - prijeSekundi * 1000).toISOString(),
  deletedAt,
})

describe('findRecentDuplicate', () => {
  it('nema duplikata kad nema dogadjaja', () => {
    expect(findRecentDuplicate([], 'marko', SADA)).toBeNull()
  })

  it('prepoznaje gol istog igraca unutar prozora', () => {
    expect(findRecentDuplicate([gol('e1', 'marko', 4)], 'marko', SADA)?.id).toBe('e1')
  })

  it('ignorira gol stariji od prozora', () => {
    expect(findRecentDuplicate([gol('e1', 'marko', DUPLICATE_WINDOW_SECONDS + 1)], 'marko', SADA))
      .toBeNull()
  })

  it('ignorira gol drugog igraca', () => {
    expect(findRecentDuplicate([gol('e1', 'luka', 2)], 'marko', SADA)).toBeNull()
  })

  it('ignorira ponisteni gol', () => {
    expect(findRecentDuplicate([gol('e1', 'marko', 2, SADA.toISOString())], 'marko', SADA))
      .toBeNull()
  })

  it('ignorira autogol', () => {
    const ag: GoalEventLite = { ...gol('e1', 'marko', 2), type: 'own_goal' }
    expect(findRecentDuplicate([ag], 'marko', SADA)).toBeNull()
  })
})

describe('secondsAgo', () => {
  it('racuna koliko je sekundi proslo', () => {
    expect(secondsAgo(gol('e1', 'marko', 4), SADA)).toBe(4)
  })
})
```

- [ ] **Step 2: Pokreni, vidi da padaju**

```bash
pnpm test tests/unit/duplicates.test.ts
```

Očekivano: FAIL.

- [ ] **Step 3: Implementiraj**

```ts
import type { GoalEventLite } from './types'

export const DUPLICATE_WINDOW_SECONDS = 10

/**
 * Traži nedavno upisan gol istog strijelca — zaštita kad više ljudi s klupe
 * unosi istovremeno. Vraća nađeni događaj ili null.
 */
export function findRecentDuplicate(
  events: GoalEventLite[],
  scorerId: string,
  now: Date,
): GoalEventLite | null {
  const granica = now.getTime() - DUPLICATE_WINDOW_SECONDS * 1000

  return (
    events.find(
      (e) =>
        e.type === 'goal' &&
        e.deletedAt === null &&
        e.scorerId === scorerId &&
        new Date(e.createdAt).getTime() >= granica,
    ) ?? null
  )
}

export function secondsAgo(event: GoalEventLite, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(event.createdAt).getTime()) / 1000))
}
```

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/duplicates.test.ts
```

Očekivano: PASS, 7 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/duplicates.ts tests/unit/duplicates.test.ts
```

Predloženi commit: `feat(domain): zastita od duplog unosa gola`

---

### Task M6-3: Pokretanje, pauza i završetak termina

**Files:**
- Modify: `app/grupe/[grupaId]/termin/akcije.ts`

- [ ] **Step 1: Akcije**

```ts
export async function pokreniTermin(grupaId: string, terminId: string) {
  const supabase = await createClient()

  const { data: termin } = await supabase
    .from('matches').select('status, starts_at').eq('id', terminId).single()
  if (!termin) return { greska: 'Termin nije pronađen.' }

  const dvaSataPrije = new Date(termin.starts_at).getTime() - 2 * 60 * 60 * 1000
  if (Date.now() < dvaSataPrije) {
    return { greska: 'Termin se može pokrenuti najranije 2 sata prije početka.' }
  }
  if (termin.status === 'zavrsen') return { greska: 'Termin je već završen.' }

  const { error } = await supabase.from('matches')
    .update({ status: 'u_tijeku', started_at: new Date().toISOString(), paused_at: null, total_paused_seconds: 0 })
    .eq('id', terminId)

  if (error) return { greska: 'Pokretanje nije uspjelo. Pokušaj ponovno.' }
  redirect(`/grupe/${grupaId}/termin/${terminId}/uzivo`)
}

export async function pauzirajTermin(terminId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('matches')
    .update({ paused_at: new Date().toISOString() })
    .eq('id', terminId).is('paused_at', null)
  if (error) return { greska: 'Pauziranje nije uspjelo.' }
  return {}
}

export async function nastaviTermin(terminId: string) {
  const supabase = await createClient()

  const { data: termin } = await supabase
    .from('matches').select('paused_at, total_paused_seconds').eq('id', terminId).single()
  if (!termin?.paused_at) return {}

  const pauza = Math.floor((Date.now() - new Date(termin.paused_at).getTime()) / 1000)

  const { error } = await supabase.from('matches')
    .update({ paused_at: null, total_paused_seconds: termin.total_paused_seconds + pauza })
    .eq('id', terminId)

  if (error) return { greska: 'Nastavak nije uspio.' }
  return {}
}
```

Funkcija `zavrsiTermin` dolazi u M7 — ona uz zatvaranje termina obračunava i rating.

- [ ] **Step 2: Gumb na ekranu termina**

Na `app/grupe/[grupaId]/termin/[terminId]/page.tsx` dodaj **Pokreni termin** — vidljiv samo članovima u postavi, i samo kad je manje od 2 sata do `starts_at`. Inače prikaži sivi tekst "Termin se pokreće na dan igranja".

- [ ] **Step 3: Staging**

```bash
git add app/grupe/\[grupaId\]/termin
```

Predloženi commit: `feat(uzivo): pokretanje, pauza i nastavak termina`

---

### Task M6-4: Unos golova

**Files:**
- Modify: `app/grupe/[grupaId]/termin/akcije.ts`

- [ ] **Step 1: Akcije za događaje**

```ts
export async function upisiGol(
  terminId: string, strijelacId: string, ekipa: 'A' | 'B',
  proteklo: number, potvrdjenDuplikat = false,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  if (!potvrdjenDuplikat) {
    const granica = new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000).toISOString()
    const { data: nedavni } = await supabase
      .from('match_events')
      .select('id, type, scorer_id, created_at, deleted_at')
      .eq('match_id', terminId).eq('type', 'goal').eq('scorer_id', strijelacId)
      .is('deleted_at', null).gte('created_at', granica)

    const duplikat = findRecentDuplicate(
      (nedavni ?? []).map((e) => ({
        id: e.id, type: e.type as 'goal', scorerId: e.scorer_id,
        createdAt: e.created_at, deletedAt: e.deleted_at,
      })),
      strijelacId, new Date(),
    )

    if (duplikat) {
      return { mozdaDuplikat: { sekundiPrije: secondsAgo(duplikat, new Date()) } }
    }
  }

  const { data, error } = await supabase.from('match_events').insert({
    match_id: terminId, type: 'goal', team: ekipa,
    scorer_id: strijelacId, assist_id: null,
    elapsed_seconds: proteklo, created_by: user.id,
  }).select('id').single()

  if (error || !data) return { greska: 'Gol nije upisan. Pokušaj ponovno.' }

  await osvjeziRezultat(terminId)
  return { dogadjajId: data.id }
}

export async function dodajAsistenciju(dogadjajId: string, asistentId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('match_events')
    .update({ assist_id: asistentId }).eq('id', dogadjajId)
  if (error) return { greska: 'Asistencija nije spremljena.' }
  return {}
}

export async function upisiAutogol(terminId: string, igracId: string, njegovaEkipa: 'A' | 'B', proteklo: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { error } = await supabase.from('match_events').insert({
    match_id: terminId, type: 'own_goal',
    team: njegovaEkipa === 'A' ? 'B' : 'A',   // gol ide protivniku
    scorer_id: igracId, elapsed_seconds: proteklo, created_by: user.id,
  })

  if (error) return { greska: 'Autogol nije upisan.' }
  await osvjeziRezultat(terminId)
  return {}
}

export async function ponistiDogadjaj(dogadjajId: string, terminId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  const { error } = await supabase.from('match_events')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', dogadjajId)

  if (error) return { greska: 'Poništavanje nije uspjelo.' }
  await osvjeziRezultat(terminId)
  return {}
}

export async function promijeniGolmana(terminId: string, igracId: string, ekipa: 'A' | 'B', proteklo: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { greska: 'Nisi prijavljen.' }

  await supabase.from('match_lineup')
    .update({ is_goalkeeper: false }).eq('match_id', terminId).eq('team', ekipa)
  await supabase.from('match_lineup')
    .update({ is_goalkeeper: true }).eq('match_id', terminId).eq('user_id', igracId)

  await supabase.from('match_events').insert({
    match_id: terminId, type: 'keeper_change', team: ekipa,
    scorer_id: igracId, elapsed_seconds: proteklo, created_by: user.id,
  })
  return {}
}

/** Rezultat na `matches` je samo brza kopija — izvor istine su događaji. */
async function osvjeziRezultat(terminId: string) {
  const supabase = await createClient()
  const { data: dogadjaji } = await supabase
    .from('match_events').select('type, team')
    .eq('match_id', terminId).is('deleted_at', null)
    .in('type', ['goal', 'own_goal'])

  const a = (dogadjaji ?? []).filter((e) => e.team === 'A').length
  const b = (dogadjaji ?? []).filter((e) => e.team === 'B').length

  await supabase.from('matches').update({ score_a: a, score_b: b }).eq('id', terminId)
}
```

- [ ] **Step 2: Staging**

```bash
git add app/grupe/\[grupaId\]/termin/akcije.ts
```

Predloženi commit: `feat(uzivo): unos gola, asistencije, autogola i ponistavanja`

---

### Task M6-5: Ekran uživo

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/uzivo/page.tsx`
- Create: `components/termin/Stoperica.tsx`, `components/termin/IgracGumb.tsx`, `components/termin/AsistencijaTraka.tsx`, `components/termin/Kronologija.tsx`

- [ ] **Step 1: Štoperica**

`components/termin/Stoperica.tsx` — klijentska komponenta. Prima `MatchTimerState`, drži `useState` za "sada", osvježava ga `setInterval` svakih 250 ms, ispisuje `formatClock(elapsedSeconds(stanje, sada))`. Klasa `font-mono text-5xl tabular-nums`.

- [ ] **Step 2: Gumb igrača**

`components/termin/IgracGumb.tsx` — prima `nadimak`, `golovi`, `jeGolman`, `onGol`, `onAutogol`, `onGolman`.

- Visina `h-14`, puna širina kolone, velika slova, `active:scale-95`
- Običan klik → `onGol()`
- Dugi pritisak (600 ms, `onPointerDown` + `setTimeout`, poništen na `onPointerUp`/`onPointerLeave`) → `onAutogol()`
- Mala ikona 🧤 desno; klik na nju ne okida gol, nego `onGolman()` (`event.stopPropagation()`)
- Desno se ispisuje `⚽N` ako je `golovi > 0`

- [ ] **Step 3: Traka za asistenciju**

`components/termin/AsistencijaTraka.tsx` — prima `dogadjajId`, `strijelacNadimak`, `minuta`, `suigraci`, `onOdabir`, `onPonisti`, `onIstek`.

- `fixed bottom-0 inset-x-0`, tamna pozadina, iznad svega
- Gornji red: `⚽ GOL — MARKO 23'` + gumb **Poništi**
- Donji red: vodoravno klizni popis suigrača + gumb **NITKO**
- `useEffect` s `setTimeout(onIstek, 5000)` — nakon 5 s se sama zatvara i gol ostaje bez asistencije
- Timer se poništava čim korisnik nešto klikne

- [ ] **Step 4: Glavni ekran**

`app/.../uzivo/page.tsx` — klijentska komponenta koja:

1. Dohvati termin, postavu i događaje
2. Pretplati se na Supabase Realtime:

```ts
const kanal = supabase
  .channel(`termin:${terminId}`)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${terminId}` },
      () => osvjeziDogadjaje())
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${terminId}` },
      (payload) => postaviTermin(payload.new))
  .subscribe()

return () => { supabase.removeChannel(kanal) }
```

3. Prikaže rezultat, štopericu, gumbe **Pauza**/**Nastavi** i **Završi**
4. Dvije kolone igrača (`grid grid-cols-2 gap-2`)
5. Kronologiju ispod, najnovije gore, sa `✕` za poništavanje
6. Kad `upisiGol` vrati `mozdaDuplikat` → dijalog: *"Netko je već upisao gol za MARKO prije N s. Je li ovo drugi gol?"* s **Da, upiši** (ponovni poziv s `potvrdjenDuplikat = true`) i **Ne, odustani**
7. Optimističko ažuriranje: rezultat skoči odmah, prije nego server odgovori

- [ ] **Step 5: Ponašanje bez interneta**

Prati `navigator.onLine` i `online`/`offline` događaje. Kad veze nema:
- traka na vrhu: *"Nema veze — unosi se spremaju"*
- neposlani unosi idu u `useRef` red čekanja
- na `online` red se prazni redom

Štoperica i dalje radi, jer se računa lokalno.

- [ ] **Step 6: Ručna provjera na dva uređaja**

Otvori isti termin u dva preglednika. Upiši gol u jednom. Očekivano: rezultat se u drugom promijeni bez osvježavanja stranice, unutar sekunde.

- [ ] **Step 7: Staging**

```bash
git add app components
```

Predloženi commit: `feat(uzivo): glavni ekran s zivom sinkronizacijom`

---

# M7 — Završetak i rating

### Task M7-1: Elo (TDD)

**Files:**
- Create: `lib/domain/elo.ts`
- Test: `tests/unit/elo.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { computeElo, STARTING_RATING, K_FACTOR } from '@/lib/domain/elo'

const ekipa = (ids: string[], rating = STARTING_RATING) =>
  ids.map((userId) => ({ userId, rating }))

describe('computeElo', () => {
  it('kod jednakih ratinga pobjednik dobiva pola K faktora', () => {
    const r = computeElo({ teamA: ekipa(['a1', 'a2']), teamB: ekipa(['b1', 'b2']), scoreA: 6, scoreB: 4 })
    expect(r.deltaA).toBe(K_FACTOR / 2)   // 12
    expect(r.deltaB).toBe(-K_FACTOR / 2)
  })

  it('nerijeseno kod jednakih ratinga ne mijenja nista', () => {
    const r = computeElo({ teamA: ekipa(['a1']), teamB: ekipa(['b1']), scoreA: 3, scoreB: 3 })
    expect(r.deltaA).toBe(0)
    expect(r.deltaB).toBe(0)
  })

  it('jaca ekipa dobiva manje za ocekivanu pobjedu', () => {
    const r = computeElo({
      teamA: ekipa(['a1'], 1300), teamB: ekipa(['b1'], 900), scoreA: 5, scoreB: 2,
    })
    expect(r.deltaA).toBeGreaterThan(0)
    expect(r.deltaA).toBeLessThan(K_FACTOR / 2)
  })

  it('slabija ekipa dobiva vise za iznenadjenje', () => {
    const r = computeElo({
      teamA: ekipa(['a1'], 900), teamB: ekipa(['b1'], 1300), scoreA: 5, scoreB: 2,
    })
    expect(r.deltaA).toBeGreaterThan(K_FACTOR / 2)
  })

  it('promjena je nula-suma', () => {
    const r = computeElo({
      teamA: ekipa(['a1', 'a2'], 1100), teamB: ekipa(['b1', 'b2'], 950), scoreA: 1, scoreB: 4,
    })
    expect(r.deltaA + r.deltaB).toBe(0)
  })

  it('vraca zapis prije i poslije za svakog igraca', () => {
    const r = computeElo({ teamA: ekipa(['a1']), teamB: ekipa(['b1']), scoreA: 2, scoreB: 1 })
    expect(r.updates).toHaveLength(2)
    const a = r.updates.find((u) => u.userId === 'a1')!
    expect(a.ratingBefore).toBe(STARTING_RATING)
    expect(a.ratingAfter).toBe(STARTING_RATING + r.deltaA)
  })

  it('prazna ekipa ne rusi izracun', () => {
    const r = computeElo({ teamA: [], teamB: ekipa(['b1']), scoreA: 0, scoreB: 0 })
    expect(r).toEqual({ deltaA: 0, deltaB: 0, updates: [] })
  })
})
```

- [ ] **Step 2: Pokreni, vidi da padaju**

```bash
pnpm test tests/unit/elo.test.ts
```

Očekivano: FAIL.

- [ ] **Step 3: Implementiraj**

```ts
export const STARTING_RATING = 1000
export const K_FACTOR = 24

export type EloTeam = { userId: string; rating: number }[]

export type EloInput = {
  teamA: EloTeam
  teamB: EloTeam
  scoreA: number
  scoreB: number
}

export type EloResult = {
  deltaA: number
  deltaB: number
  updates: { userId: string; ratingBefore: number; ratingAfter: number }[]
}

/**
 * Elo po ekipama: očekivani rezultat se računa iz prosjeka ratinga,
 * a pomak je jednak za sve igrače iste ekipe. Nula-suma.
 */
export function computeElo({ teamA, teamB, scoreA, scoreB }: EloInput): EloResult {
  if (teamA.length === 0 || teamB.length === 0) {
    return { deltaA: 0, deltaB: 0, updates: [] }
  }

  const prosjek = (t: EloTeam) => t.reduce((s, p) => s + p.rating, 0) / t.length
  const rA = prosjek(teamA)
  const rB = prosjek(teamB)

  const ocekivanoA = 1 / (1 + Math.pow(10, (rB - rA) / 400))
  const stvarnoA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0

  const deltaA = Math.round(K_FACTOR * (stvarnoA - ocekivanoA))
  const deltaB = -deltaA

  return {
    deltaA,
    deltaB,
    updates: [
      ...teamA.map((p) => ({ userId: p.userId, ratingBefore: p.rating, ratingAfter: p.rating + deltaA })),
      ...teamB.map((p) => ({ userId: p.userId, ratingBefore: p.rating, ratingAfter: p.rating + deltaB })),
    ],
  }
}
```

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/elo.test.ts
```

Očekivano: PASS, 7 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/elo.ts tests/unit/elo.test.ts
```

Predloženi commit: `feat(domain): Elo rating po ekipama`

---

### Task M7-2: Završetak termina i obračun ratinga

**Files:**
- Create: `lib/supabase/admin.ts`
- Modify: `app/grupe/[grupaId]/termin/akcije.ts`

- [ ] **Step 1: Klijent sa service_role ključem**

`lib/supabase/admin.ts`:

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/** Zaobilazi RLS. Koristi SAMO u server actionima, nikad u komponenti klijenta. */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
```

- [ ] **Step 2: SQL funkcija koja upisuje rating i uvećava brojač termina**

Ovo mora biti SQL funkcija, a ne `upsert` iz JavaScripta — `matches_played` se **uvećava** za jedan, a to `upsert` ne zna napraviti bez prethodnog čitanja.

`supabase/migrations/0007_rating_upsert.sql`:

```sql
create or replace function public.apply_rating(
  p_group uuid, p_user uuid, p_rating int
) returns void language sql security definer set search_path = public as $$
  insert into player_ratings (group_id, user_id, rating, matches_played, updated_at)
  values (p_group, p_user, p_rating, 1, now())
  on conflict (group_id, user_id) do update
    set rating         = excluded.rating,
        matches_played = player_ratings.matches_played + 1,
        updated_at     = now();
$$;
```

Primijeni i regeneriraj tipove:

```bash
pnpm db:reset
```

Očekivano: migracija prolazi, a `lib/database.types.ts` sada sadrži `apply_rating` u `Functions`.

- [ ] **Step 3: Akcija završetka**

```ts
export async function zavrsiTermin(grupaId: string, terminId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: termin } = await supabase
    .from('matches').select('status, score_a, score_b').eq('id', terminId).single()
  if (!termin) return { greska: 'Termin nije pronađen.' }
  if (termin.status === 'zavrsen') return { greska: 'Termin je već završen.' }

  const { data: postava } = await supabase
    .from('match_lineup').select('user_id, team').eq('match_id', terminId)
  if (!postava?.length) return { greska: 'Termin nema složene ekipe.' }

  const { data: ratinzi } = await admin
    .from('player_ratings').select('user_id, rating')
    .eq('group_id', grupaId).in('user_id', postava.map((p) => p.user_id))

  const sRatingom = (team: 'A' | 'B') =>
    postava.filter((p) => p.team === team).map((p) => ({
      userId: p.user_id,
      rating: ratinzi?.find((r) => r.user_id === p.user_id)?.rating ?? STARTING_RATING,
    }))

  const rezultat = computeElo({
    teamA: sRatingom('A'), teamB: sRatingom('B'),
    scoreA: termin.score_a, scoreB: termin.score_b,
  })

  await admin.from('matches')
    .update({ status: 'zavrsen', ended_at: new Date().toISOString(), paused_at: null })
    .eq('id', terminId)

  await admin.from('rating_history').upsert(
    rezultat.updates.map((u) => ({
      match_id: terminId, user_id: u.userId,
      rating_before: u.ratingBefore, rating_after: u.ratingAfter,
    })),
    { onConflict: 'match_id,user_id' },
  )

  for (const u of rezultat.updates) {
    await admin.rpc('apply_rating', {
      p_group: grupaId, p_user: u.userId, p_rating: u.ratingAfter,
    })
  }

  redirect(`/grupe/${grupaId}/termin/${terminId}/sazetak`)
}
```

Uvozi na vrhu datoteke: `computeElo` i `STARTING_RATING` iz `@/lib/domain/elo`, te `createAdminClient` iz `@/lib/supabase/admin`.

- [ ] **Step 4: Primijeni i provjeri**

```bash
pnpm db:reset && pnpm test
```

Očekivano: migracije prođu, svi jedinični testovi prolaze.

- [ ] **Step 5: Staging**

```bash
git add app lib supabase/migrations/0007_rating_upsert.sql
```

Predloženi commit: `feat(uzivo): zavrsetak termina s obracunom ratinga`

---

### Task M7-3: Ekran sažetka

**Files:**
- Create: `app/grupe/[grupaId]/termin/[terminId]/sazetak/page.tsx`

- [ ] **Step 1: Ekran**

Prikaži:
1. Konačni rezultat i trajanje (`formatClock` od `started_at` do `ended_at` minus pauze)
2. Kronologiju golova
3. Tablicu po igraču: nadimak, ekipa, golovi, asistencije, autogolovi, ishod, promjena ratinga iz `rating_history` (`+12` zeleno, `-9` crveno)
4. Gumb **Podijeli sažetak**

- [ ] **Step 2: Tekst za dijeljenje**

```ts
function tekstZaDijeljenje(termin, strijelci): string {
  const redovi = strijelci
    .filter((s) => s.golovi > 0)
    .sort((a, b) => b.golovi - a.golovi)
    .map((s) => `${s.nadimak} ${s.golovi}`)
    .join(', ')

  return [
    `Termin ${formatirajKratko(termin.starts_at)}, ${termin.lokacija}`,
    `Ekipa A ${termin.score_a} : ${termin.score_b} Ekipa B`,
    `⚽ ${redovi}`,
  ].join('\n')
}
```

Gumb koristi `navigator.share({ text })` ako postoji, inače `navigator.clipboard.writeText(text)` i poruku "Kopirano".

- [ ] **Step 3: Ispravak za admina**

Ako je korisnik admin i `ended_at` je unutar 24 h, prikaži **Ispravi statistiku** — vodi na kronologiju gdje se događaji mogu poništiti. Nakon svake ispravke ponovno pozovi obračun ratinga.

- [ ] **Step 4: Staging**

```bash
git add app/grupe/\[grupaId\]/termin/\[terminId\]/sazetak
```

Predloženi commit: `feat(termini): sazetak termina i dijeljenje u WhatsApp`

---

# M8 — Statistika i ljestvica

### Task M8-1: Agregacija statistike (TDD)

**Files:**
- Create: `lib/domain/stats.ts`
- Test: `tests/unit/stats.test.ts`

- [ ] **Step 1: Testovi**

```ts
import { describe, it, expect } from 'vitest'
import { aggregateStats } from '@/lib/domain/stats'
import type { MatchForStats } from '@/lib/domain/types'

const termin = (over: Partial<MatchForStats> = {}): MatchForStats => ({
  matchId: 'm1',
  scoreA: 2,
  scoreB: 1,
  lineup: [
    { userId: 'a1', team: 'A' }, { userId: 'a2', team: 'A' },
    { userId: 'b1', team: 'B' },
  ],
  events: [
    { type: 'goal', scorerId: 'a1', assistId: 'a2', deletedAt: null },
    { type: 'goal', scorerId: 'a1', assistId: null, deletedAt: null },
    { type: 'goal', scorerId: 'b1', assistId: null, deletedAt: null },
  ],
  ...over,
})

describe('aggregateStats', () => {
  it('broji golove i asistencije', () => {
    const s = aggregateStats([termin()])
    expect(s.find((p) => p.userId === 'a1')!.goals).toBe(2)
    expect(s.find((p) => p.userId === 'a2')!.assists).toBe(1)
    expect(s.find((p) => p.userId === 'b1')!.goals).toBe(1)
  })

  it('ne broji ponistene dogadjaje', () => {
    const s = aggregateStats([termin({
      events: [{ type: 'goal', scorerId: 'a1', assistId: null, deletedAt: '2026-09-08T19:00:00.000Z' }],
    })])
    expect(s.find((p) => p.userId === 'a1')!.goals).toBe(0)
  })

  it('autogol se broji odvojeno i ne ulazi u golove', () => {
    const s = aggregateStats([termin({
      events: [{ type: 'own_goal', scorerId: 'a1', assistId: null, deletedAt: null }],
    })])
    const a1 = s.find((p) => p.userId === 'a1')!
    expect(a1.ownGoals).toBe(1)
    expect(a1.goals).toBe(0)
  })

  it('racuna pobjede, poraze i nerijesene', () => {
    const s = aggregateStats([termin()])
    expect(s.find((p) => p.userId === 'a1')!.wins).toBe(1)
    expect(s.find((p) => p.userId === 'b1')!.losses).toBe(1)

    const n = aggregateStats([termin({ scoreA: 2, scoreB: 2 })])
    expect(n.find((p) => p.userId === 'a1')!.draws).toBe(1)
  })

  it('postotak pobjeda racuna nerijeseno kao pola', () => {
    const s = aggregateStats([
      termin({ matchId: 'm1', scoreA: 2, scoreB: 1 }),
      termin({ matchId: 'm2', scoreA: 1, scoreB: 1 }),
    ])
    expect(s.find((p) => p.userId === 'a1')!.winRate).toBeCloseTo(0.75)
  })

  it('golovi po terminu se racunaju na dvije decimale', () => {
    const s = aggregateStats([
      termin({ matchId: 'm1' }),
      termin({ matchId: 'm2', events: [] }),
    ])
    expect(s.find((p) => p.userId === 'a1')!.goalsPerMatch).toBe(1)
  })

  it('igrac koji nije u postavi se ne pojavljuje', () => {
    const s = aggregateStats([termin()])
    expect(s.find((p) => p.userId === 'nitko')).toBeUndefined()
  })

  it('prazan popis termina daje prazan rezultat', () => {
    expect(aggregateStats([])).toEqual([])
  })
})
```

- [ ] **Step 2: Pokreni, vidi da padaju**

```bash
pnpm test tests/unit/stats.test.ts
```

Očekivano: FAIL.

- [ ] **Step 3: Implementiraj**

```ts
import type { MatchForStats, PlayerStats } from './types'

function prazan(userId: string): PlayerStats {
  return {
    userId, goals: 0, assists: 0, ownGoals: 0, matches: 0,
    wins: 0, draws: 0, losses: 0, goalsPerMatch: 0, winRate: 0,
  }
}

/** Agregira statistiku po igraču iz popisa završenih termina. */
export function aggregateStats(matches: MatchForStats[]): PlayerStats[] {
  const po = new Map<string, PlayerStats>()
  const uzmi = (id: string) => {
    if (!po.has(id)) po.set(id, prazan(id))
    return po.get(id)!
  }

  for (const m of matches) {
    for (const { userId, team } of m.lineup) {
      const s = uzmi(userId)
      s.matches += 1
      if (m.scoreA === m.scoreB) s.draws += 1
      else if ((team === 'A') === (m.scoreA > m.scoreB)) s.wins += 1
      else s.losses += 1
    }

    for (const e of m.events) {
      if (e.deletedAt !== null) continue
      if (e.scorerId && po.has(e.scorerId)) {
        if (e.type === 'goal') uzmi(e.scorerId).goals += 1
        else uzmi(e.scorerId).ownGoals += 1
      }
      if (e.type === 'goal' && e.assistId && po.has(e.assistId)) {
        uzmi(e.assistId).assists += 1
      }
    }
  }

  return [...po.values()].map((s) => ({
    ...s,
    goalsPerMatch: s.matches === 0 ? 0 : Math.round((s.goals / s.matches) * 100) / 100,
    winRate: s.matches === 0 ? 0 : (s.wins + s.draws * 0.5) / s.matches,
  }))
}
```

- [ ] **Step 4: Pokreni**

```bash
pnpm test tests/unit/stats.test.ts
```

Očekivano: PASS, 8 testova.

- [ ] **Step 5: Staging**

```bash
git add lib/domain/stats.ts tests/unit/stats.test.ts
```

Predloženi commit: `feat(domain): agregacija statistike po igracu`

---

### Task M8-2: Ekran ljestvice

**Files:**
- Create: `app/grupe/[grupaId]/ljestvica/page.tsx`
- Create: `components/grupa/LjestvicaTablica.tsx`

- [ ] **Step 1: Dohvat podataka**

Dohvati sve termine grupe sa `status = 'zavrsen'` (filtrirano po sezoni ako je odabrana), njihove postave i događaje. Sastavi `MatchForStats[]` i pozovi `aggregateStats`. Spoji s nadimcima iz `profiles` i ratingom iz `player_ratings`.

- [ ] **Step 2: Tablica**

Kolone: **Igrač · G · A · AG · Termini · G/T · P-N-P · % · Rating**.

- Sortiranje klikom na zaglavlje, default golovi silazno
- Na mobitelu se skriva `AG` i `G/T` (`hidden sm:table-cell`), tablica se ne smije vodoravno razvlačiti van ekrana
- Prekidač na vrhu: **Sezona 2026** / **Sve vrijeme**

- [ ] **Step 3: Dolaznost i rekordi**

Ispod tablice dvije kartice:
- **Dolaznost** — postotak, trenutni i najduži niz (računa se iz kronološkog popisa termina i postave)
- **Rekordi** — najviše golova na terminu, najviše asistencija na terminu, najduži niz pobjeda, najbolji strijelac sezone, najveća pobjeda

- [ ] **Step 4: Ručna provjera**

Odigraj jedan termin do kraja. Očekivano: ljestvica prikazuje strijelce i promijenjeni rating.

- [ ] **Step 5: Staging**

```bash
git add app components
```

Predloženi commit: `feat(statistika): ljestvica, dolaznost i rekordi`

---

### Task M8-3: Profil igrača

**Files:**
- Create: `app/grupe/[grupaId]/igrac/[igracId]/page.tsx`

- [ ] **Step 1: Ekran**

Nadimak, avatar, 🧤 ako je golman, trenutni rating i njegovo kretanje kroz `rating_history`, ukupna statistika iz `aggregateStats` filtrirana na tog igrača, popis zadnjih 10 termina s ishodom i doprinosom.

- [ ] **Step 2: Poveznice**

Nadimak igrača na ljestvici, u postavi i u kronologiji vodi ovamo.

- [ ] **Step 3: Staging**

```bash
git add app/grupe/\[grupaId\]/igrac
```

Predloženi commit: `feat(statistika): profil igraca`

---

# M9 — PWA i dovršetak

### Task M9-1: PWA

**Files:**
- Create: `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Manifest**

```json
{
  "name": "Memorijalni termin",
  "short_name": "Termin",
  "description": "Organizacija nogometnih 5v5 termina",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "orientation": "portrait",
  "lang": "hr",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Poveži u layoutu**

U `app/layout.tsx` dodaj u `metadata`:

```ts
manifest: '/manifest.json',
appleWebApp: { capable: true, title: 'Termin', statusBarStyle: 'black-translucent' },
icons: { apple: '/icons/apple-touch-icon.png' },
```

- [ ] **Step 3: Provjeri**

Otvori aplikaciju na mobitelu → *Dodaj na početni zaslon*. Očekivano: otvara se bez adresne trake, s ikonom.

- [ ] **Step 4: Staging**

```bash
git add public app/layout.tsx
```

Predloženi commit: `feat: PWA manifest i ikone`

---

### Task M9-2: Prazna stanja i obrada grešaka

**Files:**
- Create: `app/error.tsx`, `app/not-found.tsx`, `components/PrazanEkran.tsx`

- [ ] **Step 1: Granica greške**

`app/error.tsx` — klijentska komponenta, tekst *"Nešto je puklo. Pokušaj ponovno."* i gumb **Pokušaj ponovno** koji zove `reset()`. Nikad ne prikazuj `error.message` korisniku.

- [ ] **Step 2: Prazna stanja**

`components/PrazanEkran.tsx` prima `naslov`, `opis`, `akcija`. Ugradi ga na:
- lista grupa → *"Još nisi ni u jednoj grupi"*
- lista termina → *"Još nema termina — otvori prvi"*
- ljestvica → *"Još nema odigranih termina"*
- lista prijavljenih → *"Nitko se još nije prijavio"*

- [ ] **Step 3: Staging**

```bash
git add app components
```

Predloženi commit: `feat: prazna stanja i granica gresaka`

---

### Task M9-3: Završni E2E test punog ciklusa

**Files:**
- Create: `tests/e2e/puni-ciklus.spec.ts`

- [ ] **Step 1: Test**

```ts
import { test, expect } from '@playwright/test'

test('od kreiranja termina do statistike', async ({ page }) => {
  // 1. Admin kreira termin za danas
  await page.goto('/prijava')
  await page.getByLabel('Email').first().fill('admin@test.hr')
  await page.getByLabel('Lozinka').fill('test1234')
  await page.getByRole('button', { name: 'Prijavi se' }).click()

  await page.getByRole('link', { name: /Utorak 20h/ }).click()
  await page.getByRole('link', { name: 'Novi termin' }).click()

  const danas = new Date().toISOString().slice(0, 10)
  await page.getByLabel('Datum').fill(danas)
  await page.getByLabel('Vrijeme').fill('20:00')
  await page.getByLabel('Lokacija').selectOption({ label: 'Druga lokacija' })
  await page.getByLabel('Upiši lokaciju').fill('Dvorana Trnje')
  await page.getByRole('button', { name: 'Kreiraj termin' }).click()

  // 2. Prijava i slaganje ekipa
  await page.getByRole('button', { name: 'Dolazim' }).click()
  await expect(page.getByText('ADMIN')).toBeVisible()

  await page.getByRole('link', { name: 'Ekipe' }).click()
  await page.getByRole('button', { name: 'Predloži ekipe' }).click()

  // 3. Pokretanje i unos gola
  await page.getByRole('link', { name: /Termin/ }).first().click()
  await page.getByRole('button', { name: 'Pokreni termin' }).click()
  await expect(page).toHaveURL(/uzivo/)

  await page.getByRole('button', { name: /ADMIN/ }).click()
  await page.getByRole('button', { name: 'NITKO' }).click()
  await expect(page.getByTestId('rezultat')).toContainText('1')

  // 4. Zavrsetak
  await page.getByRole('button', { name: 'Završi' }).click()
  await page.getByRole('button', { name: 'Da, završi' }).click()
  await expect(page).toHaveURL(/sazetak/)

  // 5. Statistika
  await page.getByRole('link', { name: 'Ljestvica' }).click()
  await expect(page.getByRole('row', { name: /ADMIN/ })).toContainText('1')
})
```

- [ ] **Step 2: Pokreni cijeli paket**

```bash
pnpm db:reset && pnpm test && pnpm exec playwright test
```

Očekivano: prolazi svih **47 jediničnih testova** (waitlist 7, format 3, teams 8, timer 7, duplicates 7, elo 7, stats 8) i oba E2E testa, na mobitelu i na laptopu.

- [ ] **Step 3: Staging**

```bash
git add tests/e2e/puni-ciklus.spec.ts
```

Predloženi commit: `test: E2E test punog ciklusa termina`

---

### Task M9-4: Produkcijske migracije i završni deploy

- [ ] **Step 1: Poveži lokalni projekt s produkcijskim**

```bash
pnpm supabase link --project-ref <ref-iz-supabase-panela>
```

- [ ] **Step 2: Primijeni migracije na produkciju**

```bash
pnpm supabase db push
```

Očekivano: sve migracije od `0001` do `0007` prođu. **Seed se NE izvršava na produkciji** — test korisnici tamo ne smiju postojati.

- [ ] **Step 3: Provjeri Google OAuth**

U Supabase panelu → *Authentication → URL Configuration* upiši `https://memorijalni-termin.vercel.app` kao *Site URL* i dodaj `https://memorijalni-termin.vercel.app/auth/callback` u *Redirect URLs*.

- [ ] **Step 4: Provjeri na produkciji**

Otvori javni URL na mobitelu, registriraj se Googleom, kreiraj grupu i termin. Očekivano: sve radi kao lokalno.

- [ ] **Step 5: Staging**

```bash
git add -A
```

Predloženi commit: `chore: produkcijske migracije i konfiguracija OAuth-a`

---

### Task M9-5: Stranica o privatnosti i objava Google aplikacije

Ovaj zadatak **mora doći nakon M9-4**, jer Google za objavu aplikacije traži da homepage i stranica o privatnosti budu **žive na javnom URL-u**.

**Files:**
- Create: `app/privatnost/page.tsx`
- Modify: `app/layout.tsx` (poveznica u podnožju)

- [ ] **Step 1: Zašto ovo postoji**

Google ne dopušta prebacivanje OAuth aplikacije iz `Testing` u produkciju bez *app name*, *support email*, *homepage url* i *privacy policy url*. Dok je u `Testing` stanju, prijaviti se mogu **samo ručno upisani test korisnici** (do 100). Za grupu od 20+ ljudi to znači ručno upisivanje svakog Gmail računa — neodrživo.

Stranica o privatnosti nam ionako treba: aplikacija sprema ime, nadimak, email i avatar stvarnih ljudi.

- [ ] **Step 2: Napiši stranicu**

`app/privatnost/page.tsx` — statična server komponenta, na hrvatskom, koja pokriva:

1. **Tko obrađuje podatke** — ime i kontakt email vlasnika aplikacije
2. **Koji se podaci spremaju** — ime, nadimak, email, avatar iz Google prijave; podaci o terminima (prijave, ekipe, golovi, asistencije)
3. **Zašto** — isključivo za rad aplikacije: prijava korisnika, organizacija termina, statistika grupe
4. **S kim se dijele** — ni s kim. Nema analitike trećih strana, nema oglašivača. Podaci su na Supabaseu (EU, Frankfurt) i Vercelu kao pružateljima infrastrukture.
5. **Koliko dugo** — dok korisnik ne zatraži brisanje računa
6. **Prava korisnika** — uvid, ispravak i brisanje; kontakt email na koji se zahtjev šalje
7. **Datum zadnje izmjene**

Ne izmišljaj pravne formulacije koje ne odgovaraju stvarnosti aplikacije — piši što stvarno radi.

- [ ] **Step 3: Poveznica u podnožju**

U `app/layout.tsx` dodaj podnožje s poveznicom **Privatnost** na `/privatnost`, vidljivo na svakoj stranici.

- [ ] **Step 4: Provjeri da je živo**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://memorijalni-termin.vercel.app/privatnost
```

Očekivano: `200`.

- [ ] **Step 5: Objavi Google aplikaciju (ručno, u pregledniku)**

U Google Cloud Console → *Google Auth Platform → Branding* upiši:
- *Application home page:* `https://memorijalni-termin.vercel.app`
- *Application privacy policy link:* `https://memorijalni-termin.vercel.app/privatnost`

Pa na *Audience* → **Publish app**. Gumb je do tada siv.

Kako aplikacija traži samo `email`, `profile` i `openid` — opsege koje Google smatra neosjetljivima — objava **ne pokreće Googleovu verifikaciju** i stupa na snagu odmah. Nakon toga se briše popis test korisnika: prijaviti se može bilo tko.

- [ ] **Step 6: Provjeri da je Google prijava aktivna**

```bash
curl -s "https://<ref>.supabase.co/auth/v1/settings" -H "apikey: <publishable-key>" \
  | python3 -c "import sys,json; print('google:', json.load(sys.stdin)['external']['google'])"
```

Očekivano: `google: True`

- [ ] **Step 7: Staging**

```bash
git add app/privatnost app/layout.tsx
```

Predloženi commit: `feat: stranica o privatnosti i objava Google OAuth aplikacije`

---

## Provjera pokrivenosti specifikacije

| Zahtjev iz specifikacije | Gdje se ispunjava |
|---|---|
| §3 Tehnološki stack | M0-2, M0-3, M0-4, M2-1 |
| §4.1–4.11 Model podataka | M1-1, M1-2, M1-3 |
| §5.1 Stanja termina | M4-4, M6-3, M7-2 |
| §5.2 Štoperica iz vremena servera | M6-1, M6-3 |
| §6.1 Prijava — tri metode | M2-2 |
| §6.2 Moje grupe | M3-1 |
| §6.3 Tabovi grupe | M3-2, M4-4, M8-2 |
| §6.4 Detalji termina | M4-5 |
| §6.5 Slaganje ekipa | M5-2 |
| §6.6 Ekran uživo | M6-5 |
| §6.7 Sažetak i dijeljenje | M7-3 |
| §6.8 Profil igrača | M8-3 |
| §7.1 Lista čekanja | M4-2 |
| §7.2 Prijedlog ekipa s golmanima | M5-1 |
| §7.3 Elo rating | M7-1, M7-2 |
| §7.4 Zaštita od duplog unosa | M6-2, M6-4 |
| §8.1 Ljestvica | M8-1, M8-2 |
| §8.2 Dolaznost | M8-2 |
| §8.3 Golmani — prikupljanje podataka | M6-4 (`keeper_change` događaji) |
| §8.4 Rekordi | M8-2 |
| §9.2 Gol u dva dodira | M6-4, M6-5 |
| §9.3 Autogol | M6-4, M6-5 |
| §9.4 Promjena golmana | M6-4, M6-5 |
| §9.5 Živa sinkronizacija i rad bez interneta | M6-5 |
| §10.1–10.2 Prava i RLS | M1-4 |
| §10.3 Privatnost | M1-4, M3-2 |
| §11 Responzivnost, PWA, greške, prazna stanja | M9-1, M9-2, M4-6 |
| §12.1 Objava | M0-5, M9-4 |
| §12.2 Migracije u repou | M1-1…M1-5, M9-4 |
| Google zahtjev: stranica o privatnosti + objava OAuth aplikacije | M9-5 |

**Namjerno nije u planu:** §8.3 prikaz golmanske statistike u sučelju (podaci se skupljaju, prikaz je Faza 2), Apple prijava (traži plaćeno članstvo), push obavijesti.
