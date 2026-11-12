"use server";
// Research area actions. Every action checks the signed-in researcher on the server.
import { redirect } from "next/navigation";
import { one, query, tx } from "@/lib/db";
import {
  attemptLogin,
  checkPasswordRules,
  clearSession,
  clientIp,
  hashPassword,
  randomPassword,
  requireAdmin,
  requireUser,
  setSessionCookie,
} from "@/lib/auth";
import bcrypt from "bcryptjs";
import { clearLibraryCache } from "@/lib/assistant";
import { runWeatherTest, type Source } from "@/lib/weather";
import { TESTABLE, type Outcome } from "@/lib/scoring";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const L = (f: FormData) => (s(f, "lang") === "am" ? "am" : "en");
const UUID = /^[0-9a-f-]{36}$/i;

const CATEGORIES = ["animal", "plant", "cloud_wind", "atmospheric", "celestial", "soil_temperature", "other"];
const OUTCOMES = ["rain", "heavy_rain", "normal_rain", "dry", "drought", "rain_onset", "seasonal_change", "other", "unknown"];
const TIMINGS = ["within_1_week", "within_3_weeks", "within_1_month", "season", "other_unknown"];
const STATUSES = [
  "needs_field_validation", "needs_farmer_confirmation", "awaiting_documentation", "tested", "awaiting_outcome",
  "outcome_recorded", "partially_matched", "matched", "not_matched", "inconclusive", "requires_further_research",
];
const TYPES = ["rainfall", "dry", "seasonal"];
const TR_STATUS = ["original", "reviewed", "needs_review"];

function back(path: string, params: Record<string, string> = {}): never {
  const q = new URLSearchParams(params).toString();
  redirect(q ? `${path}?${q}` : path);
}

// ---------- sign in / out ----------
export async function login(f: FormData) {
  const lang = L(f);
  let r: Awaited<ReturnType<typeof attemptLogin>>;
  try {
    r = await attemptLogin(s(f, "email"), String(f.get("password") ?? ""), await clientIp());
  } catch (e) {
    console.error("login failed", e);
    back(`/${lang}/research/login`, { e: "db" });
  }
  if (!r.ok) back(`/${lang}/research/login`, { e: r.reason });
  await setSessionCookie(r.token);
  redirect(`/${lang}/research`);
}

export async function logout(f: FormData) {
  await clearSession();
  redirect(`/${L(f)}/research/login`);
}

// ---------- submissions ----------
export async function reviewSubmission(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const id = s(f, "id");
  if (!UUID.test(id)) back(`/${lang}/research/submissions`);
  const decision = s(f, "decision");
  const message = s(f, "message").slice(0, 2000) || null;
  const path = `/${lang}/research/submissions/${id}`;

  if (decision === "reject" || decision === "needs_info") {
    await query(
      "update farmer_submissions set status = $2, review_message = $3, reviewed_by = $4, reviewed_at = now() where id = $1",
      [id, decision === "reject" ? "rejected" : "needs_info", message, user.id],
    );
    back(path, { ok: "saved" });
  }
  if (decision !== "approve") back(path);

  const category = CATEGORIES.includes(s(f, "category")) ? s(f, "category") : "other";
  const outcome = OUTCOMES.includes(s(f, "expected_outcome")) ? s(f, "expected_outcome") : "unknown";
  const n = await tx(async (c) => {
    const sub = (await c.query("select * from farmer_submissions where id = $1 for update", [id])).rows[0];
    if (!sub || sub.converted_record_id) return null;
    const timing = TIMINGS.includes(sub.expected_timing) ? sub.expected_timing : "other_unknown";
    const types = outcome === "dry" || outcome === "drought" ? ["dry"] : outcome === "seasonal_change" ? ["seasonal"] : ["rainfall"];
    const rec = (
      await c.query(
        `insert into knowledge_records (category, indicator_types, original_language, original_text, observation_date,
           observation_date_precision, observation_period, expected_outcome, expected_timing, verification_status, is_published,
           source_reference, source_submission_id, created_by, updated_by)
         values ($1,$2,$3,$4,$5,'day',$6,$7,$8,'needs_field_validation',false,$9,$10,$11,$11) returning id, record_number`,
        [
          category,
          types,
          sub.original_language,
          sub.description,
          sub.observation_date,
          `${sub.observation_date} (${sub.region})`,
          outcome,
          timing,
          `Farmer submission ${sub.reference_code}, ${sub.region}.`,
          id,
          user.id,
        ],
      )
    ).rows[0];
    const subLocale = sub.original_language === "am" ? "am" : "en";
    for (const loc of ["en", "am"]) {
      await c.query(
        `insert into translations (record_id, locale, name, description, observation_text, interpretation, expected_weather, translation_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rec.id, loc, sub.indicator, sub.description, sub.description, sub.interpretation, sub.expected_event,
          loc === subLocale && ["am", "en"].includes(sub.original_language) ? "original" : "needs_review"],
      );
    }
    await c.query(
      `update knowledge_records set cover_media_id = (select id from uploaded_media where submission_id = $2 and mime_type like 'image/%' order by created_at limit 1) where id = $1`,
      [rec.id, id],
    );
    await c.query(
      "update farmer_submissions set status = 'approved', review_message = $2, reviewed_by = $3, reviewed_at = now(), converted_record_id = $4 where id = $1",
      [id, message, user.id, rec.id],
    );
    return rec.record_number as number;
  });
  if (!n) back(path);
  back(`/${lang}/research/records/${n}`, { ok: "saved" });
}

export async function addNote(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const body = s(f, "body").slice(0, 8000);
  const recordId = s(f, "record_id");
  const submissionId = s(f, "submission_id");
  const backTo = s(f, "back").startsWith(`/${lang}/research/`) ? s(f, "back") : `/${lang}/research`;
  if (!body || !(UUID.test(recordId) || UUID.test(submissionId))) back(backTo);
  await query("insert into research_notes (record_id, submission_id, author_id, body) values ($1,$2,$3,$4)", [
    UUID.test(recordId) ? recordId : null,
    UUID.test(submissionId) ? submissionId : null,
    user.id,
    body,
  ]);
  back(backTo, { ok: "saved" });
}

// ---------- records ----------
async function recordPath(lang: string, id: string) {
  const r = await one<{ record_number: number }>("select record_number from knowledge_records where id = $1", [id]);
  return r ? `/${lang}/research/records/${r.record_number}` : `/${lang}/research/records`;
}

export async function saveRecord(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const id = s(f, "id");
  if (!UUID.test(id)) back(`/${lang}/research/records`);
  const path = await recordPath(lang, id);
  const pick = (v: string, list: string[], d: string) => (list.includes(v) ? v : d);
  const date = s(f, "observation_date");
  const types = f.getAll("indicator_types").map(String).filter((x) => TYPES.includes(x));
  const loc = s(f, "location_id");
  try {
    await tx(async (c) => {
      await c.query(
        `update knowledge_records set category = $2, indicator_types = $3, expected_outcome = $4, expected_timing = $5,
           observation_date = $6, observation_date_precision = $7, observation_period = $8, verification_status = $9,
           location_id = $10, source_reference = $11, original_text = $12, updated_by = $13 where id = $1`,
        [
          id,
          pick(s(f, "category"), CATEGORIES, "other"),
          types,
          pick(s(f, "expected_outcome"), OUTCOMES, "unknown"),
          pick(s(f, "expected_timing"), TIMINGS, "other_unknown"),
          /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
          ["day", "month", "year"].includes(s(f, "observation_date_precision")) ? s(f, "observation_date_precision") : null,
          s(f, "observation_period").slice(0, 300) || null,
          pick(s(f, "verification_status"), STATUSES, "needs_field_validation"),
          UUID.test(loc) ? loc : null,
          s(f, "source_reference").slice(0, 1000) || null,
          s(f, "original_text").slice(0, 4000) || null,
          user.id,
        ],
      );
      for (const l of ["en", "am"]) {
        const name = s(f, `${l}_name`).slice(0, 200);
        if (!name) continue;
        const keywords = s(f, `${l}_keywords`)
          .split(/[,،፣\n]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 40);
        await c.query(
          `insert into translations (record_id, locale, name, description, observation_text, interpretation, expected_weather,
             expected_timing_text, agricultural_relevance, translation_status, keywords, voice_advice)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           on conflict (record_id, locale) do update set name = excluded.name, description = excluded.description,
             observation_text = excluded.observation_text, interpretation = excluded.interpretation, expected_weather = excluded.expected_weather,
             expected_timing_text = excluded.expected_timing_text, agricultural_relevance = excluded.agricultural_relevance,
             translation_status = excluded.translation_status, keywords = excluded.keywords, voice_advice = excluded.voice_advice`,
          [
            id,
            l,
            name,
            s(f, `${l}_description`) || null,
            s(f, `${l}_observation_text`) || null,
            s(f, `${l}_interpretation`) || null,
            s(f, `${l}_expected_weather`) || null,
            s(f, `${l}_expected_timing_text`) || null,
            s(f, `${l}_agricultural_relevance`) || null,
            pick(s(f, `${l}_translation_status`), TR_STATUS, "needs_review"),
            keywords,
            s(f, `${l}_voice_advice`).slice(0, 400) || null,
          ],
        );
      }
    });
  } catch (e) {
    console.error("saveRecord", e);
    back(path, { e: "invalid" });
  }
  clearLibraryCache();
  back(path, { ok: "saved" });
}

export async function setPublished(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const id = s(f, "id");
  if (!UUID.test(id)) back(`/${lang}/research/records`);
  await query("update knowledge_records set is_published = $2, updated_by = $3 where id = $1", [id, s(f, "publish") === "1", user.id]);
  clearLibraryCache();
  back(await recordPath(lang, id), { ok: "saved" });
}

export async function runTest(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const id = s(f, "id");
  if (!UUID.test(id)) back(`/${lang}/research/records`);
  const path = await recordPath(lang, id);
  const locId = s(f, "location_id");
  const loc = UUID.test(locId)
    ? await one<{ id: string; name: string; latitude: number; longitude: number }>(
        "select id, name, latitude, longitude from locations where id = $1 and latitude is not null and longitude is not null",
        [locId],
      )
    : null;
  const predicted = s(f, "predicted") as Outcome;
  if (!loc || !TESTABLE.includes(predicted)) back(path, { e: "test", r: "Choose a place with coordinates and the predicted outcome." });
  let score: number;
  try {
    const out = await runWeatherTest({
      recordId: id,
      location: loc,
      observationDate: s(f, "observation_date"),
      predicted,
      windowDays: Number(s(f, "window_days")),
      referenceYears: Number(s(f, "reference_years") || 10),
      source: (["chirps", "giai"].includes(s(f, "source")) ? s(f, "source") : "era5") as Source,
      userId: user.id,
      notes: s(f, "notes").slice(0, 2000) || undefined,
    });
    score = out.result.score;
  } catch (e) {
    back(path, { e: "test", r: (e as Error).message.slice(0, 300) });
  }
  clearLibraryCache();
  back(path, { ok: "test", score: String(score) });
}

export async function recordOutcome(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const id = s(f, "id");
  if (!UUID.test(id)) back(`/${lang}/research/records`);
  const path = await recordPath(lang, id);
  const outcomes = ["rain", "heavy_rain", "light_rain", "dry", "mixed", "unknown"];
  const types = ["farmer_reported", "researcher_observed", "external_dataset"];
  const mm = s(f, "rainfall_mm");
  const d1 = s(f, "period_start"),
    d2 = s(f, "period_end");
  const iso = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  try {
    await query(
      `insert into weather_outcomes (record_id, source_type, actual_outcome, conditions_text, rainfall_mm, period_start, period_end, data_source, notes, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        types.includes(s(f, "source_type")) ? s(f, "source_type") : "researcher_observed",
        outcomes.includes(s(f, "actual_outcome")) ? s(f, "actual_outcome") : "unknown",
        s(f, "conditions_text").slice(0, 2000) || null,
        mm && Number(mm) >= 0 ? Number(mm) : null,
        iso(d1),
        iso(d2),
        s(f, "data_source").slice(0, 300) || "Field observation",
        s(f, "notes").slice(0, 2000) || null,
        user.id,
      ],
    );
  } catch {
    back(path, { e: "invalid" });
  }
  back(path, { ok: "saved" });
}

// ---------- team & account ----------
export type MemberState = { ok?: { email: string; password: string }; error?: "invalid" | "exists" };

/** Returns the one-time password to the page (never put it in a URL). */
export async function createMember(_prev: MemberState, f: FormData): Promise<MemberState> {
  const lang = L(f);
  await requireAdmin(lang);
  const email = s(f, "email").toLowerCase();
  const name = s(f, "full_name").slice(0, 120);
  const role = s(f, "role") === "admin" ? "admin" : "researcher";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) return { error: "invalid" };
  if (await one("select 1 from profiles where email = $1", [email])) return { error: "exists" };
  const pw = randomPassword();
  await query("insert into profiles (email, full_name, role, password_hash) values ($1,$2,$3,$4)", [email, name, role, await hashPassword(pw)]);
  return { ok: { email, password: pw } };
}

export async function toggleMember(f: FormData) {
  const lang = L(f);
  const me = await requireAdmin(lang);
  const id = s(f, "id");
  if (UUID.test(id) && id !== me.id) await query("update profiles set is_active = not is_active where id = $1", [id]);
  back(`/${lang}/research/team`);
}

export async function changePassword(f: FormData) {
  const lang = L(f);
  const user = await requireUser(lang);
  const path = `/${lang}/research/account`;
  const next = String(f.get("new_password") ?? "");
  if (!checkPasswordRules(next)) back(path, { e: "rules" });
  const row = await one<{ password_hash: string }>("select password_hash from profiles where id = $1", [user.id]);
  if (!row || !(await bcrypt.compare(String(f.get("current_password") ?? ""), row.password_hash))) back(path, { e: "wrong" });
  await query("update profiles set password_hash = $2 where id = $1", [user.id, await hashPassword(next)]);
  await clearSession();
  back(`/${lang}/research/login`, { ok: "password" });
}
