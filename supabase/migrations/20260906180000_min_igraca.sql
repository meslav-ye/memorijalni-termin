-- Termin ima DVA praga, ne jedan.
--
--   min_players (10) = dovoljno da se sigurno igra, 5v5 bez zamjena
--   capacity    (12) = najvise mjesta, 5v5 s po jednom zamjenom
--
-- Dosad je postojao samo `capacity`, postavljen na 10 — sto je zapravo bio
-- donji prag. Zbog toga bi 11. i 12. covjek zavrsili na listi cekanja iako
-- za njih ima mjesta.
--
-- Donji prag treba za: oznaku stanja termina ("Fali jos 3" / "Igra se!") i
-- za gumb "Dodaj u kalendar", koji se pojavljuje tek kad je sigurno da se igra.

alter table groups
  add column default_min_players int not null default 10;

alter table matches
  add column min_players int not null default 10;

alter table groups
  alter column default_capacity set default 12;

alter table matches
  alter column capacity set default 12;

alter table groups
  add constraint min_ispod_kvote check (default_min_players <= default_capacity),
  add constraint min_raspon      check (default_min_players between 2 and 30);

alter table matches
  add constraint min_ispod_kvote check (min_players <= capacity),
  add constraint min_raspon      check (min_players between 2 and 30);

-- Postojece grupe i termini imaju capacity = 10, sto je bio donji prag.
-- Podizemo ih na 12 da odgovaraju stvarnosti, a min ostaje 10.
update groups  set default_capacity = 12 where default_capacity = 10;
update matches set capacity = 12         where capacity = 10;
