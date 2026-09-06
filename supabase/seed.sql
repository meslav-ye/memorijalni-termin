-- Test podaci za LOKALNI razvoj i Playwright.
-- NE izvrsava se na produkciji — `supabase db push` salje samo migracije.
--
-- Lozinka za oba korisnika: test1234

-- VAZNO: confirmation_token, recovery_token, email_change_token_new i email_change
-- moraju biti '' a NE NULL. Ta cetiri stupca nemaju default, a GoTrue ih cita kao
-- obican Go string — NULL ga srusi i prijava vrati 500 "Database error querying schema".
-- Ostali token stupci vec imaju default ''.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.hr',
   extensions.crypt('test1234', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Admin Adminovic"}',
   '', '', '', '',
   now(), now()),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'igrac@test.hr',
   extensions.crypt('test1234', extensions.gen_salt('bf')),
   now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Igrac Igracevic"}',
   '', '', '', '',
   now(), now());

-- Noviji GoTrue trazi redak u auth.identities da bi prijava lozinkom prosla.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@test.hr","email_verified":true}',
   'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"igrac@test.hr","email_verified":true}',
   'email', now(), now(), now());

-- Profili su vec stvoreni okidacem handle_new_user; dopunjavamo ih.
update profiles set nickname = 'ADMIN'
  where id = '11111111-1111-1111-1111-111111111111';
update profiles set nickname = 'IGRAC', is_goalkeeper = true
  where id = '22222222-2222-2222-2222-222222222222';

insert into groups (id, name, invite_code, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Utorak 20h', 'testkod12345',
        '11111111-1111-1111-1111-111111111111');

insert into group_members (group_id, user_id, role, status, joined_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin',  'active', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', 'active', now());

insert into player_ratings (group_id, user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222');

insert into locations (group_id, name, address) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dvorana Trnje', 'Trnjanska cesta 1, Zagreb');

insert into seasons (group_id, name, starts_on, ends_on) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026', '2026-01-01', '2026-12-31');
