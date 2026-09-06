-- Test podaci za LOKALNI razvoj i Playwright.
-- NE izvrsava se na produkciji — `supabase db push` salje samo migracije.
--
-- Lozinka za SVE korisnike: test1234
-- Prijava: admin@test.hr (admin), igrac@test.hr (obican clan),
--          igrac03@test.hr ... igrac14@test.hr
--
-- Ukupno 14 clanova: dovoljno da se prepuni termin od 12 mjesta i da se
-- testira lista cekanja i slaganje ekipa.

-- VAZNO: confirmation_token, recovery_token, email_change_token_new i email_change
-- moraju biti '' a NE NULL. Ta cetiri stupca nemaju default, a GoTrue ih cita kao
-- obican Go string — NULL ga srusi i prijava vrati 500 "Database error querying schema".

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
)
select
  ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  case n when 1 then 'admin@test.hr'
         when 2 then 'igrac@test.hr'
         else 'igrac' || lpad(n::text, 2, '0') || '@test.hr' end,
  extensions.crypt('test1234', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name',
    case n when 1 then 'Admin Adminovic'
           when 2 then 'Igrac Igracevic'
           else 'Igrac Broj ' || n end),
  '', '', '', '',
  now(), now()
from generate_series(1, 14) as n;

-- Noviji GoTrue trazi redak u auth.identities da bi prijava lozinkom prosla.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
from auth.users u;

-- Profili su vec stvoreni okidacem handle_new_user; dopunjavamo nadimke.
-- Golmani su IGRAC (2), IGRAC05 i IGRAC09 — tri, da se testira i visak golmana.
update profiles p
set nickname = case
      when p.id = '00000000-0000-0000-0000-000000000001' then 'ADMIN'
      when p.id = '00000000-0000-0000-0000-000000000002' then 'IGRAC'
      else 'IGRAC' || lpad(right(p.id::text, 2), 2, '0')
    end,
    is_goalkeeper = right(p.id::text, 2) in ('02', '05', '09');

insert into groups (id, name, invite_code, created_by, default_capacity, default_min_players)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utorak 20h', 'testkod12345',
        '00000000-0000-0000-0000-000000000001', 12, 10);

-- Svi su aktivni clanovi; prvi je admin.
insert into group_members (group_id, user_id, role, status, joined_at)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  id,
  case when id = '00000000-0000-0000-0000-000000000001' then 'admin' else 'member' end::member_role,
  'active',
  now()
from auth.users;

-- Rating svima na pocetnih 1000.
insert into player_ratings (group_id, user_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id from auth.users;

insert into locations (group_id, name, address, maps_url) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dvorana Trnje', 'Trnjanska cesta 1, Zagreb',
   'https://maps.google.com/?q=Trnjanska+cesta+1+Zagreb'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Igralište Jarun', 'Jarunska 5, Zagreb', null);

insert into seasons (group_id, name, starts_on, ends_on) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026', '2026-01-01', '2026-12-31');
