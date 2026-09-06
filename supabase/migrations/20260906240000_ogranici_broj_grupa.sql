-- Ogranicenje koliko grupa jedan racun smije otvoriti.
--
-- Registracija je (bar zasad) otvorena, pa se u principu bilo tko moze
-- prijaviti i poceti otvarati grupe. Potvrda emaila to vec dobrano koci —
-- nepotvrdjen racun se ne moze prijaviti — ali oslanjati se samo na to znaci
-- da jedan potvrdjeni racun i dalje moze napuniti bazu.
--
-- Provjera je u BAZI, ne u sucelju. Javni kljuc ide u svaki preglednik, pa
-- svatko moze zvati REST izravno i zaobici nasu stranicu; jedino RLS to hvata.
--
-- 5 je namjerno velikodusno: pravi covjek ce imati jednu, mozda dvije grupe
-- (npr. utorak i cetvrtak). Tko treba vise, javi se pa se podigne.

create or replace function public.broj_mojih_grupa()
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from groups where created_by = auth.uid();
$$;

-- security definer funkcija ne smije biti javno pozivljiva vise nego sto treba.
revoke execute on function public.broj_mojih_grupa() from public;
grant  execute on function public.broj_mojih_grupa() to authenticated;

drop policy if exists "grupa: svatko smije kreirati" on groups;

create policy "grupa: kreiranje uz ogranicenje broja" on groups
  for insert
  with check (
    created_by = auth.uid()
    and public.broj_mojih_grupa() < 5
  );
