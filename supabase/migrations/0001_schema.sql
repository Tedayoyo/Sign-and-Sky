-- Sign and Sky — core schema
-- Runs on Supabase PostgreSQL (or any PostgreSQL 14+). UTF-8 throughout.
-- Design principle: original knowledge, translations, expected weather, actual
-- weather, research evaluation and farmer personal data are kept separate.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. profiles — researcher / admin accounts (no farmer accounts needed)
-- ---------------------------------------------------------------------------
create table profiles (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email = lower(email) and position('@' in email) > 1),
  full_name       text not null check (length(full_name) between 1 and 120),
  role            text not null default 'researcher' check (role in ('admin','researcher')),
  password_hash   text not null,
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. locations
-- ---------------------------------------------------------------------------
create table locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 160),
  region      text,
  zone        text,
  woreda      text,
  village     text,
  country     text not null default 'Ethiopia',
  latitude    numeric(9,6) check (latitude between -90 and 90),
  longitude   numeric(9,6) check (longitude between -180 and 180),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (name, country)
);

-- ---------------------------------------------------------------------------
-- 3. farmer_submissions — private until a researcher reviews them
-- ---------------------------------------------------------------------------
create table farmer_submissions (
  id                    uuid primary key default gen_random_uuid(),
  reference_code        text not null unique,
  -- personal / location information (never shown publicly)
  farmer_name           text check (length(farmer_name) <= 120),
  location_text         text not null check (length(location_text) between 1 and 160),
  region                text not null check (length(region) between 1 and 120),
  village               text check (length(village) <= 120),
  -- the observation
  observation_date      date not null,
  indicator             text not null check (length(indicator) between 1 and 200),
  description           text not null check (length(description) between 1 and 4000),
  original_language     text not null check (original_language in ('am','en','wal','om','ti','other')),
  interpretation        text check (length(interpretation) <= 2000),
  expected_event        text check (length(expected_event) <= 500),
  expected_timing       text not null default 'other_unknown'
                          check (expected_timing in ('within_1_week','within_3_weeks','within_1_month','other_unknown')),
  agricultural_activity text not null default 'other'
                          check (agricultural_activity in ('land_preparation','sowing','crop_protection','irrigation','harvesting','drying','other')),
  crop_type             text check (length(crop_type) <= 120),
  notes                 text check (length(notes) <= 4000),
  submitted_locale      text not null default 'en',
  consent_given         boolean not null check (consent_given = true),
  consent_at            timestamptz not null default now(),
  -- review workflow
  status                text not null default 'pending'
                          check (status in ('pending','approved','rejected','needs_info')),
  review_message        text,
  reviewed_by           uuid references profiles(id) on delete set null,
  reviewed_at           timestamptz,
  converted_record_id   uuid,   -- FK added after knowledge_records exists
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. knowledge_records — language-neutral facts + the ORIGINAL observation
-- ---------------------------------------------------------------------------
create table knowledge_records (
  id                    uuid primary key default gen_random_uuid(),
  record_number         integer generated always as identity unique,
  category              text not null check (category in
                          ('animal','plant','cloud_wind','atmospheric','celestial','soil_temperature','other')),
  indicator_types       text[] not null default '{}'
                          check (indicator_types <@ array['rainfall','dry','seasonal']::text[]),
  -- original knowledge, never overwritten by translation
  original_language     text not null check (original_language in ('am','en','wal','om','ti','other')),
  original_text         text,
  location_id           uuid references locations(id) on delete set null,
  observation_date      date,           -- exact date only when genuinely known
  observation_date_precision text check (observation_date_precision in ('day','month','year')),
  observation_period    text,           -- e.g. "June 2025 (historical period to investigate)"
  investigation_start   date,           -- historical window to compare against weather data
  investigation_end     date,           --   (NOT a verified observation date)
  -- expected weather (structured; free text lives in translations)
  expected_outcome      text not null default 'unknown' check (expected_outcome in
                          ('rain','heavy_rain','normal_rain','dry','drought','rain_onset','seasonal_change','other','unknown')),
  expected_timing       text not null default 'other_unknown'
                          check (expected_timing in ('within_1_week','within_3_weeks','within_1_month','season','other_unknown')),
  expected_window_start date,
  expected_window_end   date,
  farmer_confidence     text check (farmer_confidence in ('low','medium','high')),
  -- research evaluation
  verification_status   text not null default 'needs_field_validation' check (verification_status in
                          ('needs_field_validation','needs_farmer_confirmation','awaiting_documentation','tested',
                           'awaiting_outcome','outcome_recorded','partially_matched','matched',
                           'not_matched','inconclusive','requires_further_research')),
  is_published          boolean not null default false,
  source_reference      text,
  source_submission_id  uuid references farmer_submissions(id) on delete set null,
  cover_media_id        uuid,           -- FK added after uploaded_media exists
  created_by            uuid references profiles(id) on delete set null,
  updated_by            uuid references profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (expected_window_end is null or expected_window_start is null or expected_window_end >= expected_window_start),
  check (investigation_end is null or investigation_start is null or investigation_end >= investigation_start)
);

alter table farmer_submissions
  add constraint farmer_submissions_converted_fk
  foreign key (converted_record_id) references knowledge_records(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. translations — one row per record per language
-- ---------------------------------------------------------------------------
create table translations (
  id                      uuid primary key default gen_random_uuid(),
  record_id               uuid not null references knowledge_records(id) on delete cascade,
  locale                  text not null check (locale ~ '^[a-z]{2,3}$'),
  name                    text not null check (length(name) between 1 and 200),
  description             text,
  observation_text        text,   -- translation of the original observation
  interpretation          text,
  expected_weather        text,
  expected_timing_text    text,
  agricultural_relevance  text,
  translation_status      text not null default 'needs_review'
                            check (translation_status in ('original','reviewed','needs_review')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (record_id, locale)
);

-- ---------------------------------------------------------------------------
-- 6. weather_outcomes — what ACTUALLY happened (many per record)
-- ---------------------------------------------------------------------------
create table weather_outcomes (
  id               uuid primary key default gen_random_uuid(),
  record_id        uuid not null references knowledge_records(id) on delete cascade,
  source_type      text not null check (source_type in ('farmer_reported','researcher_observed','external_dataset')),
  actual_outcome   text not null check (actual_outcome in ('rain','heavy_rain','light_rain','dry','mixed','unknown')),
  conditions_text  text,
  rainfall_mm      numeric(8,2) check (rainfall_mm >= 0),
  period_start     date,
  period_end       date,
  checked_date     date not null default current_date,
  data_source      text not null check (length(data_source) between 1 and 300),
  dataset_payload  jsonb,   -- raw summary of externally retrieved data, kept verbatim
  latitude         numeric(9,6),
  longitude        numeric(9,6),
  notes            text,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);

-- ---------------------------------------------------------------------------
-- 7. research_notes
-- ---------------------------------------------------------------------------
create table research_notes (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid references knowledge_records(id) on delete cascade,
  submission_id  uuid references farmer_submissions(id) on delete cascade,
  author_id      uuid references profiles(id) on delete set null,
  body           text not null check (length(body) between 1 and 8000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (record_id is not null or submission_id is not null)
);

-- ---------------------------------------------------------------------------
-- 8. uploaded_media — images stored in the database (size-limited)
-- ---------------------------------------------------------------------------
create table uploaded_media (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid references knowledge_records(id) on delete cascade,
  submission_id  uuid references farmer_submissions(id) on delete cascade,
  mime_type      text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size      integer not null check (byte_size between 1 and 3145728),
  data           bytea not null,
  original_name  text,
  alt_text       text,
  is_public      boolean not null default false,
  uploaded_by    uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (record_id is not null or submission_id is not null)
);

alter table knowledge_records
  add constraint knowledge_records_cover_fk
  foreign key (cover_media_id) references uploaded_media(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 9. sign_evaluations — test results for a sign (the simulator's "Test" step)
--    score is on a 0–10 scale; trust level: Strong >= 8, Fair 6–7.9, Weak < 6
-- ---------------------------------------------------------------------------
create table sign_evaluations (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid not null references knowledge_records(id) on delete cascade,
  score           numeric(4,1) not null check (score between 0 and 10),
  score_scale     numeric(4,1) not null default 10 check (score_scale = 10),
  tested_with     text not null default 'Sign & Sky platform',
  method          text,          -- how the score was produced (must be documented for publication)
  evaluated_on    date,
  source          text not null check (length(source) between 1 and 400),
  notes           text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index knowledge_records_published_idx on knowledge_records (is_published, record_number);
create index knowledge_records_category_idx  on knowledge_records (category);
create index knowledge_records_status_idx    on knowledge_records (verification_status);
create index knowledge_records_location_idx  on knowledge_records (location_id);
create index knowledge_records_types_idx     on knowledge_records using gin (indicator_types);
create index translations_record_idx         on translations (record_id);
create index weather_outcomes_record_idx     on weather_outcomes (record_id, checked_date desc);
create index research_notes_record_idx       on research_notes (record_id);
create index research_notes_submission_idx   on research_notes (submission_id);
create index farmer_submissions_status_idx   on farmer_submissions (status, created_at desc);
create index uploaded_media_record_idx       on uploaded_media (record_id);
create index uploaded_media_submission_idx   on uploaded_media (submission_id);
create index sign_evaluations_record_idx     on sign_evaluations (record_id, evaluated_on desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','locations','farmer_submissions','knowledge_records',
                           'translations','weather_outcomes','research_notes','uploaded_media','sign_evaluations']
  loop
    execute format('create trigger %I_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- All application access goes through the Sign and Sky server, which checks
-- roles itself. RLS is enabled with NO policies for the public "anon" and
-- "authenticated" Supabase roles, so the auto-generated Supabase REST API
-- cannot read or write any table even if the public anon key leaks.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','locations','farmer_submissions','knowledge_records',
                           'translations','weather_outcomes','research_notes','uploaded_media','sign_evaluations']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
