-- Ziva sinkronizacija ekrana uzivo.
--
-- Supabase Realtime salje promjene samo za tablice koje su izricito dodane u
-- publikaciju `supabase_realtime`. Bez ovoga se pretplata uredno spoji, ali
-- nikad ne stigne nijedan dogadjaj — i to tiho, bez ijedne greske.

alter publication supabase_realtime add table match_events;
alter publication supabase_realtime add table match_lineup;
alter publication supabase_realtime add table matches;

-- REPLICA IDENTITY FULL salje cijeli stari redak uz svaku promjenu.
--
-- Nuzno je jer se pretplata filtrira po `match_id`, a to nije primarni kljuc.
-- Uz zadani identitet (samo PK) filtar kod UPDATE i DELETE ne bi imao po cemu
-- odluciti, pa bi ekran propustao upravo ponistavanje golova — koje je UPDATE
-- (meko brisanje), a ne INSERT.
alter table match_events replica identity full;
alter table match_lineup replica identity full;
alter table matches      replica identity full;
