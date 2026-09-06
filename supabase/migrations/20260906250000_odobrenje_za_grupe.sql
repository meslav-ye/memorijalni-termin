-- Otvaranje grupe traži izricito odobrenje.
--
-- Dosad je svaki registrirani korisnik mogao otvoriti do 5 grupa. Registracija
-- je otvorena, pa je to znacilo da bilo tko s interneta moze poceti puniti bazu.
--
-- Sada: racun se moze otvoriti i prijaviti, ali dok nema `can_create_groups`
-- ne moze stvoriti nijednu grupu. To NE dira ulazak u tudju grupu — tamo i
-- dalje vrijedi pozivnica + odobrenje admina te grupe.
--
-- Odobrava se rucno, u Supabase panelu: Table Editor -> profiles ->
-- can_create_groups -> true. Namjerno bez ekrana u aplikaciji: rijec je o
-- radnji koja se radi nekoliko puta godisnje, a svaki dodatni admin ekran je
-- nova povrsina za greske.

alter table profiles
  add column can_create_groups boolean not null default false;

comment on column profiles.can_create_groups is
  'Smije li korisnik otvarati NOVE grupe. Ulazak u tudju grupu ovo ne trazi.';

-- Tko je vec otvorio grupu ocito je smio; ne oduzimamo mu to.
update profiles p
   set can_create_groups = true
 where exists (select 1 from groups g where g.created_by = p.id);

/**
 * Smije li prijavljeni korisnik otvarati grupe.
 *
 * security definer jer politika na `groups` mora citati `profiles`, a
 * korisnik u tom trenutku jos nema pravo citanja tudjih profila.
 */
create or replace function public.smijem_otvarati_grupe()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select can_create_groups from profiles where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.smijem_otvarati_grupe() from public;
grant  execute on function public.smijem_otvarati_grupe() to authenticated;

drop policy if exists "grupa: kreiranje uz ogranicenje broja" on groups;

create policy "grupa: kreiranje samo uz odobrenje" on groups
  for insert
  with check (
    created_by = auth.uid()
    and public.smijem_otvarati_grupe()
    -- Gornja granica ostaje i za odobrene: stiti od greske i od ukradenog racuna.
    and public.broj_mojih_grupa() < 5
  );
