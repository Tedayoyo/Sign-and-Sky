-- Sign and Sky — additions for the website (voice assistant + traceable weather tests)
-- Safe to run on a database that already has 0001_schema.sql and the 0001 seed.

-- Voice assistant: words a farmer may use for each sign, per language.
alter table translations add column if not exists keywords text[] not null default '{}';
-- Short spoken advice for the farmer. When empty, the site builds advice from the expected outcome.
alter table translations add column if not exists voice_advice text check (voice_advice is null or length(voice_advice) <= 400);

-- Locations used by the voice assistant and by weather tests.
alter table locations add column if not exists slug text;
alter table locations add column if not exists coordinates_note text;
create unique index if not exists locations_slug_idx on locations (slug) where slug is not null;

-- Every score must be traceable to the place, the window and the data used.
alter table sign_evaluations add column if not exists location_id uuid references locations(id) on delete set null;
alter table sign_evaluations add column if not exists weather_outcome_id uuid references weather_outcomes(id) on delete set null;
alter table sign_evaluations add column if not exists predicted_outcome text
  check (predicted_outcome is null or predicted_outcome in ('rain','heavy_rain','normal_rain','dry','drought','rain_onset'));
alter table sign_evaluations add column if not exists observation_date date;
alter table sign_evaluations add column if not exists window_start date;
alter table sign_evaluations add column if not exists window_end date;
alter table sign_evaluations add column if not exists method_version text;
create index if not exists sign_evaluations_location_idx on sign_evaluations (location_id);

-- Brute-force protection for researcher sign-in.
create table if not exists login_attempts (
  id          bigint generated always as identity primary key,
  email       text not null,
  ip          text,
  succeeded   boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts (email, created_at desc);
create index if not exists login_attempts_ip_idx on login_attempts (ip, created_at desc);
alter table login_attempts enable row level security;
