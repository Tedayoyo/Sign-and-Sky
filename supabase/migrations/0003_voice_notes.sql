-- 0003 — Voice notes on shared signs (12 Nov 2026).
-- Farmers can attach a short voice recording to a shared sign, stored next to photos in uploaded_media.
-- Additive only: existing rows and photos are untouched. Safe to run more than once.

do $$
declare c record;
begin
  -- Drop the old "images only" check on mime_type, whatever name Postgres gave it.
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'uploaded_media' and con.contype = 'c' and pg_get_constraintdef(con.oid) ilike '%mime_type%'
  loop
    execute format('alter table uploaded_media drop constraint %I', c.conname);
  end loop;
end $$;

alter table uploaded_media
  add constraint uploaded_media_mime_type_check
  check (mime_type in ('image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mp4','audio/mpeg'));

comment on column uploaded_media.mime_type is 'Photos (jpeg, png, webp) and voice notes (webm, ogg, mp4, mpeg), checked from the file''s first bytes.';
