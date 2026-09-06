-- Dogadjaji u terminu i rating igraca.

-- IZVOR ISTINE za sve sto se dogodilo u terminu.
-- Nista se ne brise fizicki — ponistavanje je meko (deleted_at), da se uvijek
-- moze rekonstruirati tko je sto unio i sto je poslije povuceno.
create table match_events (
  id              uuid        primary key default gen_random_uuid(),
  match_id        uuid        not null references matches on delete cascade,
  type            event_type  not null,
  -- Ekipa KOJOJ SE PRIPISUJE gol. Kod autogola je to protivnicka ekipa strijelca.
  team            team_side,
  scorer_id       uuid        references profiles on delete set null,
  assist_id       uuid        references profiles on delete set null,
  -- Sekunde od pocetka utakmice, bez pauza. Uzima se iz stoperice u trenutku unosa.
  elapsed_seconds int         not null default 0,
  created_by      uuid        not null references profiles on delete restrict,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid        references profiles on delete set null,

  constraint vrijeme_nenegativno check (elapsed_seconds >= 0),
  -- Asistent ne moze biti i strijelac istog gola.
  constraint asistent_nije_strijelac check (assist_id is null or assist_id <> scorer_id),
  -- Gol i autogol moraju imati strijelca i ekipu; pause/resume nemaju ni jedno.
  constraint gol_ima_strijelca check (
    (type in ('goal', 'own_goal') and scorer_id is not null and team is not null)
    or type not in ('goal', 'own_goal')
  ),
  -- Autogol se ne asistira.
  constraint autogol_bez_asistencije check (type <> 'own_goal' or assist_id is null)
);

create index match_events_match_idx on match_events (match_id, created_at desc);
-- Za statistiku: brzo dohvatiti samo vazece golove.
create index match_events_aktivni_idx on match_events (match_id, type) where deleted_at is null;

create table player_ratings (
  group_id       uuid        not null references groups on delete cascade,
  user_id        uuid        not null references profiles on delete cascade,
  -- Svi krecu od 1000. Rating je PO GRUPI — isti covjek u dvije grupe ima dva ratinga.
  rating         int         not null default 1000,
  matches_played int         not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (group_id, user_id),

  constraint odigrani_nenegativni check (matches_played >= 0)
);

-- Postoji da se rating moze PONISTITI i preracunati ako admin naknadno
-- ispravi rezultat vec zavrsenog termina.
create table rating_history (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches on delete cascade,
  user_id       uuid not null references profiles on delete cascade,
  rating_before int  not null,
  rating_after  int  not null,
  unique (match_id, user_id)
);

create index rating_history_user_idx on rating_history (user_id);
