// Farmer submissions: private until a researcher reviews them.
import crypto from "node:crypto";
import { tx } from "./db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function referenceCode(now = new Date()): string {
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const bytes = crypto.randomBytes(5);
  let tail = "";
  for (const b of bytes) tail += ALPHABET[b % ALPHABET.length];
  return `SNS-${ymd}-${tail}`;
}

export const LANGS = ["am", "en", "wal", "om", "ti", "other"] as const;
export const TIMINGS = ["within_1_week", "within_3_weeks", "within_1_month", "other_unknown"] as const;
export const ACTIVITIES = ["land_preparation", "sowing", "crop_protection", "irrigation", "harvesting", "drying", "other"] as const;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE = 3 * 1024 * 1024;
export const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];
export const MAX_AUDIO = 3 * 1024 * 1024;

export type NewSubmission = {
  farmer_name?: string | null;
  location_text: string;
  region: string;
  village?: string | null;
  observation_date: string;
  indicator: string;
  description: string;
  original_language: (typeof LANGS)[number];
  interpretation?: string | null;
  expected_event?: string | null;
  expected_timing?: (typeof TIMINGS)[number];
  agricultural_activity?: (typeof ACTIVITIES)[number];
  crop_type?: string | null;
  notes?: string | null;
  submitted_locale: string;
  photo?: { type: string; bytes: Buffer; name: string } | null;
  audio?: { type: string; bytes: Buffer; name: string } | null;
};

/** Voice-note types, checked from the first bytes: WebM (Chrome, Android), MP4/AAC (Safari, iPhone), Ogg, MP3. */
export function sniffAudio(b: Buffer): string | null {
  if (b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "audio/webm";
  if (b.length > 4 && b.subarray(0, 4).toString("latin1") === "OggS") return "audio/ogg";
  if (b.length > 12 && b.subarray(4, 8).toString("latin1") === "ftyp") return "audio/mp4";
  if (b.length > 3 && (b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0))) return "audio/mpeg";
  return null;
}

const clip = (s: string | null | undefined, n: number) => (s ? s.trim().slice(0, n) || null : null);

/** Image types are checked from the file's first bytes, not only from what the browser says. */
export function sniffImage(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export async function createSubmission(s: NewSubmission): Promise<string> {
  const code = referenceCode();
  await tx(async (c) => {
    const r = await c.query(
      `insert into farmer_submissions (reference_code, farmer_name, location_text, region, village, observation_date, indicator,
         description, original_language, interpretation, expected_event, expected_timing, agricultural_activity, crop_type, notes,
         submitted_locale, consent_given)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true) returning id`,
      [
        code,
        clip(s.farmer_name, 120),
        clip(s.location_text, 160),
        clip(s.region, 120),
        clip(s.village, 120),
        s.observation_date,
        clip(s.indicator, 200),
        clip(s.description, 4000),
        s.original_language,
        clip(s.interpretation, 2000),
        clip(s.expected_event, 500),
        s.expected_timing ?? "other_unknown",
        s.agricultural_activity ?? "other",
        clip(s.crop_type, 120),
        clip(s.notes, 4000),
        s.submitted_locale === "am" ? "am" : "en",
      ],
    );
    if (s.photo) {
      await c.query(
        `insert into uploaded_media (submission_id, mime_type, byte_size, data, original_name, is_public) values ($1,$2,$3,$4,$5,false)`,
        [r.rows[0].id, s.photo.type, s.photo.bytes.length, s.photo.bytes, clip(s.photo.name, 200)],
      );
    }
    if (s.audio) {
      await c.query(
        `insert into uploaded_media (submission_id, mime_type, byte_size, data, original_name, is_public) values ($1,$2,$3,$4,$5,false)`,
        [r.rows[0].id, s.audio.type, s.audio.bytes.length, s.audio.bytes, clip(s.audio.name, 200)],
      );
    }
  });
  return code;
}
