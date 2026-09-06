-- POPRAVAK: nije se moglo otvoriti novu grupu.
--
-- Politika citanja je bila `using (is_group_member(id))`. Aplikacija grupu
-- stvara ovako:
--     insert into groups (...) ... returning id
--
-- Postgres za INSERT ... RETURNING trazi I pravo upisa I pravo CITANJA novog
-- retka. U trenutku upisa osnivac jos nije clan — clanstvo se dodaje tek
-- sljedecim upitom — pa je citanje palo i cijeli upis je odbijen s
-- "new row violates row-level security policy for table groups".
--
-- Zbunjujuce je sto Postgres i za neuspjelo citanje javlja poruku koja
-- zvuci kao da je problem u upisu.
--
-- Ispravno je da osnivac smije vidjeti grupu koju je otvorio, neovisno o
-- clanstvu. To nije prosirenje prava koje nekome nesto otkriva: rijec je o
-- retku koji je taj isti korisnik upravo stvorio.

drop policy if exists "grupa: citaj ako si clan" on groups;

create policy "grupa: citaj ako si clan ili osnivac" on groups
  for select
  using (is_group_member(id) or created_by = auth.uid());
