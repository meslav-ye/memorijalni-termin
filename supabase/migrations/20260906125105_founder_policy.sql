-- Iznimka za osnivaca grupe.
--
-- Opce pravilo "clanstvo: posalji zahtjev za sebe" dopusta upis samo sa
-- status='pending' i role='member'. To je ispravno za ljude koji dolaze preko
-- pozivnice, ali blokira onoga tko je grupu upravo stvorio — on mora odmah
-- postati aktivni admin, inace nema tko odobriti prvi zahtjev.
--
-- Uvjet `groups.created_by = auth.uid()` osigurava da se ovim putem nitko drugi
-- ne moze ubaciti kao admin u tudju grupu.

create policy "clanstvo: osnivac se upisuje kao admin" on group_members
  for insert with check (
    user_id = auth.uid()
    and role = 'admin'
    and status = 'active'
    and exists (
      select 1 from groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );
