-- Sign and Sky — replace the knowledge library with the current seed.
-- Use ONLY on a database that already holds an older version of the seed
-- (for example the 23-record version from 2 Nov 2026). It deletes every
-- knowledge record and everything attached to it (translations, test scores,
-- weather outcomes, research notes, record photos). Farmer submissions,
-- researcher accounts and locations are kept.
-- After running this file, run supabase/seed/0001_initial_records.sql and then
-- supabase/seed/0002_voice_and_locations.sql.
begin;
update farmer_submissions set converted_record_id = null where converted_record_id is not null;
delete from knowledge_records;
alter table knowledge_records alter column record_number restart with 1;
commit;
