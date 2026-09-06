-- Termini, prijave i postava.

create table matches (
  id                   uuid primary key default gen_random_uuid(),
  group_id             uuid         not null references groups on delete cascade,
  season_id            uuid         not null references seasons on delete restrict,
  location_id          uuid         references locations on delete set null,
  -- Ako lokacija nije spremljena u grupi, upisuje se slobodnim tekstom.
  location_text        text,
  starts_at            timestamptz  not null,
  capacity             int          not null default 10,
  notes                text,
  status               match_status not null default 'najavljen',

  -- Stoperica. Izvor istine su OVA tri stupca, ne dogadjaji tipa pause/resume —
  -- oni postoje samo kao trag u kronologiji. Proteklo vrijeme se racuna u
  -- pregledniku iz vremena servera, pa svi uredjaji pokazuju isto.
  started_at           timestamptz,
  paused_at            timestamptz,
  total_paused_seconds int          not null default 0,
  ended_at             timestamptz,

  -- Denormalizirani rezultat radi brzine ispisa liste termina.
  -- Izvor istine su match_events; ovo se preracunava pri svakoj promjeni.
  score_a              int          not null default 0,
  score_b              int          not null default 0,

  created_by           uuid         not null references profiles on delete restrict,
  created_at           timestamptz  not null default now(),

  constraint kvota_raspon      check (capacity between 2 and 30),
  constraint pauza_nenegativna check (total_paused_seconds >= 0),
  constraint rezultat_nenegativan check (score_a >= 0 and score_b >= 0),
  -- Termin ne moze zavrsiti prije nego je poceo.
  constraint kraj_iza_pocetka  check (ended_at is null or started_at is null or ended_at >= started_at),
  -- Mora postojati barem jedan oblik lokacije.
  constraint lokacija_postoji  check (location_id is not null or location_text is not null)
);

create index matches_group_starts_idx on matches (group_id, starts_at desc);
create index matches_group_status_idx on matches (group_id, status);

create table match_signups (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid        not null references matches on delete cascade,
  user_id      uuid        not null references profiles on delete cascade,
  -- Odredjuje mjesto u redu: prvih `capacity` je unutra, ostali na listi cekanja.
  signed_up_at timestamptz not null default now(),
  -- Admin moze rucno preurediti red; NULL znaci "idi po vremenu prijave".
  manual_order int,
  -- Meko otkazivanje: redak ostaje, ali se ne broji. Zato se lista cekanja
  -- popunjava sama, bez ikakve dodatne logike.
  cancelled_at timestamptz,
  unique (match_id, user_id)
);

create index match_signups_match_idx on match_signups (match_id);

create table match_lineup (
  match_id      uuid      not null references matches on delete cascade,
  user_id       uuid      not null references profiles on delete cascade,
  team          team_side not null,
  -- Predpopunjeno iz profiles.is_goalkeeper, ali prepravljivo za ovaj termin.
  is_goalkeeper boolean   not null default false,
  primary key (match_id, user_id)
);

create index match_lineup_match_idx on match_lineup (match_id);
