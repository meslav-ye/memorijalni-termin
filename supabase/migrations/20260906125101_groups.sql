-- Grupe, clanstvo, lokacije i sezone.
-- Grupa je temeljni entitet: svaki termin i svaka statistika pripadaju tocno jednoj grupi.

create table groups (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null,
  description      text,
  -- Kod pozivnice. 12 hex znakova (6 nasumicnih bajtova) — dovoljno da se ne pogodi,
  -- dovoljno kratko da stane u link koji se salje u WhatsApp.
  invite_code      text        not null unique default encode(gen_random_bytes(6), 'hex'),
  default_capacity int         not null default 10,
  created_by       uuid        not null references profiles on delete restrict,
  created_at       timestamptz not null default now(),

  constraint naziv_grupe_duljina check (char_length(name) between 2 and 60),
  constraint kvota_raspon        check (default_capacity between 2 and 30)
);

create table group_members (
  group_id  uuid          not null references groups on delete cascade,
  user_id   uuid          not null references profiles on delete cascade,
  role      member_role   not null default 'member',
  -- 'pending' = poslao zahtjev preko pozivnice, ceka odobrenje admina.
  status    member_status not null default 'pending',
  joined_at timestamptz,
  primary key (group_id, user_id)
);

-- Za upit "u kojim sam grupama", koji se vrti na svakom ucitavanju.
create index group_members_user_idx on group_members (user_id);

create table locations (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups on delete cascade,
  name     text not null,
  address  text,
  maps_url text
);

create index locations_group_idx on locations (group_id);

create table seasons (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups on delete cascade,
  name      text not null,
  starts_on date not null,
  ends_on   date not null,
  unique (group_id, name),

  constraint sezona_ima_smisla check (ends_on >= starts_on)
);
