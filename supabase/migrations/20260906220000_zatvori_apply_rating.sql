-- SIGURNOSNI POPRAVAK: apply_rating je bio pozivljiv s javnog API-ja.
--
-- Ranija migracija je radila:
--     revoke execute on function apply_rating(...) from anon, authenticated;
--
-- To NIJE bilo dovoljno. Postgres funkcijama po zadanom daje `execute` roli
-- PUBLIC, a `anon` i `authenticated` su clanovi PUBLIC-a — pa im oduzimanje
-- prava izravno nije promijenilo nista.
--
-- Posljedica je bila da je bilo tko, bez ijedne prijave, samo s javnim
-- kljucem koji se ionako salje svakom pregledniku, mogao pozvati:
--     POST /rest/v1/rpc/apply_rating {"p_group":…, "p_user":…, "p_rating":9999}
-- i postaviti bilo cijem ratingu bilo koju vrijednost. Funkcija je
-- `security definer`, pa RLS tu ne pomaze.
--
-- Ispravno je oduzeti pravo PUBLIC-u i vratiti ga samo service_role,
-- koji se koristi iskljucivo na posluzitelju.

revoke execute on function public.apply_rating(uuid, uuid, int) from public;
revoke execute on function public.apply_rating(uuid, uuid, int) from anon, authenticated;
grant  execute on function public.apply_rating(uuid, uuid, int) to service_role;

-- Okidacka funkcija se nikad ne zove izravno; nema razloga da bude javna.
revoke execute on function public.handle_new_user() from public;
