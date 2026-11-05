import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startDb, stopDb } from "./helpers";
import { pool, query, one } from "../src/lib/db";
import { publishedSigns, allRecords } from "../src/lib/records";
import { analyzeWith } from "../src/lib/analyze";
import { runWeatherTest } from "../src/lib/weather";
import { createSubmission } from "../src/lib/submissions";
import { addDays } from "../src/lib/scoring";

before(async () => {
  await startDb();
});
after(async () => {
  await stopDb();
});

test("the library matches the 2025 Wolaita field record", async () => {
  const pub = await publishedSigns();
  const all = await allRecords();
  assert.equal(pub.length, 17);
  assert.equal(all.length - pub.length, 6);
  const expected = [9, 6, 8, 7.5, 6, 8, 7.5, 8, 6, 7, 8, 7, 6, 7.5, 8, 8.5, 8];
  assert.deepEqual(pub.map((s) => s.evaluations[0].score), expected);
  assert.equal(pub.filter((s) => s.evaluations[0].score >= 8).length, 8);
  assert.equal(pub.filter((s) => s.evaluations[0].score < 8).length, 9);
  for (const s of pub) {
    assert.equal(s.verification_status, "tested");
    assert.equal(s.evaluations[0].location_slug, "wol");
    assert.equal(s.evaluations[0].method_version, "field-ai-2025");
    for (const l of ["en", "am"]) {
      const t = s.tr[l];
      assert.ok(t.name && t.expected_weather && t.expected_timing_text && t.voice_advice && t.keywords.length, `${s.record_number} ${l}`);
    }
    assert.equal(s.tr.am.translation_status, "needs_review");
  }
  const locs = await query<{ slug: string }>("select slug from locations where slug is not null order by slug");
  assert.deepEqual(locs.map((l) => l.slug), ["wol"]);
});

test("re-running seed 0002 is safe", async () => {
  await pool().query(fs.readFileSync(path.join(__dirname, "..", "supabase", "seed", "0002_voice_and_locations.sql"), "utf8"));
  const n = await one<{ n: number }>("select count(*)::int as n from locations");
  assert.equal(n!.n, 1);
});

test("simulator example sentences match the right sign in English and Amharic", async () => {
  const signs = await publishedSigns();
  const cases: [string, string, number][] = [
    ["en", "The mango tree flowered early this year", 14],
    ["en", "Ants are carrying their eggs uphill", 1],
    ["en", "Frogs are croaking loudly every night", 15],
    ["en", "Birds arrived early from far away", 16],
    ["en", "I saw a ring around the moon", 5],
    ["en", "Dark clouds are moving toward the farm", 17],
    ["en", "The ants are marching in a straight line", 7],
    ["en", "Ants are scattered, searching for food", 10],
    ["en", "A strong wind is blowing from east to west", 12],
    ["en", "The birds have glossy blue feathers", 2],
    ["en", "The stars and the moon are aligned", 8],
    ["am", "የማንጎ ዛፍ ዘንድሮ ቀድሞ አበበ", 14],
    ["am", "ጉንዳኖች እንቁላላቸውን ወደ ከፍታ እያጓጓዙ ነው", 1],
    ["am", "እንቁራሪቶች በየሌሊቱ ጮክ ብለው ይጮሃሉ", 15],
    ["am", "ወፎች ከሩቅ ቀድመው መጡ", 16],
    ["am", "በጨረቃ ዙሪያ ቀለበት አየሁ", 5],
    ["am", "ጥቁር ደመና ወደ ማሳው እየመጣ ነው", 17],
    ["am", "ፀሐይ ስትወጣ ቀልታ ነበር", 13],
    ["am", "ጸሀይ ስትወጣ ቀልታ ነበር", 13],
  ];
  for (const [lang, text, n] of cases) {
    const a = analyzeWith(signs, { text, lang, loc: "wol" });
    assert.equal(a.kind, "sign", text);
    assert.equal(a.record?.number, n, text);
  }
  // Each of the 17 example sentences on the Ask page finds its own sign, in both languages.
  for (const lang of ["en", "am"]) {
    const ask = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "dictionaries", `${lang}.json`), "utf8")).ask;
    assert.equal(ask.examples.length, 17, lang);
    ask.examples.forEach((text: string, i: number) => {
      const a = analyzeWith(signs, { text, lang, loc: "wol" });
      assert.equal(a.kind, "sign", `${lang}: ${text}`);
      assert.equal(a.record?.number, i + 1, `${lang}: ${text}`);
    });
    const fu = analyzeWith(signs, { text: ask.question, lang, loc: "wol", last: 16 });
    assert.equal(fu.kind, "followup", ask.question);
  }
});

test("reply pattern: thanks + test sentence + advice, and 'score X out of 10'", async () => {
  const signs = await publishedSigns();
  const a = analyzeWith(signs, { text: "Ants are carrying their eggs uphill", lang: "en", loc: "wol", month: 6 });
  assert.equal(
    a.reply,
    "Thank you for sharing. The sign and the recorded weather agree very strongly (score 9 out of 10). Heavy rain is close. Protect harvested grain and open drainage in your field.",
  );
  assert.equal(a.season, "Kiremt / Meher (main rains, June–September)");
  assert.equal(a.place.name, "Wolaita, South Ethiopia");
  assert.equal(a.test?.trust, "very_strong");
  assert.ok(!/years/.test(a.reply));

  const fair = analyzeWith(signs, { text: "I saw a ring around the moon", lang: "en", loc: "wol" });
  assert.match(fair.reply, /Be careful: this sign scored only 6 out of 10\./);

  const am = analyzeWith(signs, { text: "ወፎች ከሩቅ መጡ", lang: "am", loc: "wol" });
  assert.equal(am.reply, "ስላካፈሉን እናመሰግናለን። ምልክቱና የተመዘገበው የአየር ሁኔታ ይስማማሉ (ከ10 ነጥብ 8.5)። ዝናብ እየመጣ ነው። መሬትዎን አሁን ማዘጋጀት ይጀምሩ።");
  assert.deepEqual(am.segments.map((s) => s.clips), [["thanks"], undefined, ["adv-16"]]);
});

test("'When should I sow?' follows up on the last sign; unknown signs ask to be saved", async () => {
  const signs = await publishedSigns();
  const first = analyzeWith(signs, { text: "Ants are carrying their eggs uphill", lang: "en", loc: "wol" });
  const fu = analyzeWith(signs, { text: "When should I sow my maize?", lang: "en", loc: "wol", last: first.last });
  assert.equal(fu.kind, "followup");
  assert.equal(
    fu.reply,
    "Based on the last sign you told me, ants carrying eggs uphill, heavy rain is close. Protect harvested grain and open drainage in your field. Your Belg and Kiremt rains and enset and maize depend on good timing, so check again in three days.",
  );
  const amFu = analyzeWith(signs, { text: "በቆሎዬን መቼ ልዝራ?", lang: "am", loc: "wol", last: 1 });
  assert.equal(amFu.kind, "followup");
  assert.deepEqual(amFu.segments[0].clips, ["fu-pre", "name-1", "adv-1", "fu-wol"]);
  const noLast = analyzeWith(signs, { text: "When should I sow?", lang: "en", loc: "wol" });
  assert.equal(noLast.kind, "unknown");
  const unk = analyzeWith(signs, { text: "The cows are lying down", lang: "en", loc: "wol" });
  assert.equal(unk.kind, "unknown");
  assert.match(unk.reply, /I have not heard that sign before/);
});

test("unpublished records are not used by the assistant", async () => {
  const signs = await publishedSigns();
  const a = analyzeWith(signs, { text: "the sheep day has come", lang: "en", loc: "wol" });
  assert.equal(a.kind, "unknown");
});

test("a farmer submission is stored privately with its reference code", async () => {
  const code = await createSubmission({
    location_text: "Sodo",
    region: "South Ethiopia",
    observation_date: "2026-10-01",
    indicator: "Cows lie down early",
    description: "The cows lie down in the afternoon.",
    original_language: "en",
    submitted_locale: "en",
    photo: { type: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]), name: "p.png" },
  });
  assert.match(code, /^SNS-\d{6}-[A-Z2-9]{5}$/);
  const row = await one<{ status: string; photos: number }>(
    "select status, (select count(*) from uploaded_media m where m.submission_id = s.id and not m.is_public)::int as photos from farmer_submissions s where reference_code = $1",
    [code],
  );
  assert.deepEqual(row, { status: "pending", photos: 1 });
});

test("weather test: fetches ERA5, scores with sns-score-v1 and keeps the full data trail", async () => {
  const rec = await one<{ id: string }>("select k.id from knowledge_records k where record_number = 17");
  const loc = await one<{ id: string; name: string; latitude: number; longitude: number }>(
    "select id, name, latitude, longitude from locations where slug = 'wol'",
  );
  let requested = "";
  const fakeFetch = async (url: string) => {
    requested = url;
    const u = new URL(url);
    const time: string[] = [];
    const precipitation_sum: number[] = [];
    for (let d = u.searchParams.get("start_date")!; d <= u.searchParams.get("end_date")!; d = addDays(d, 1)) {
      time.push(d);
      precipitation_sum.push(d >= "2025-07-09" && d <= "2025-07-15" ? 9 : 1.5);
    }
    return { ok: true, status: 200, json: async () => ({ daily: { time, precipitation_sum } }) };
  };
  const out = await runWeatherTest(
    { recordId: rec!.id, location: loc!, observationDate: "2025-07-08", predicted: "rain", windowDays: 7, referenceYears: 10, source: "era5", userId: null, today: "2026-11-03" },
    fakeFetch,
  );
  assert.match(requested, /archive-api\.open-meteo\.com\/v1\/archive\?.*start_date=2015-07-09.*end_date=2025-07-15.*models=era5/);
  assert.equal(out.result.score, 10);
  const ev = await one<{ score: number; method_version: string; weather_outcome_id: string; window_start: string; predicted_outcome: string }>(
    "select score, method_version, weather_outcome_id, window_start, predicted_outcome from sign_evaluations where id = $1",
    [out.evaluationId],
  );
  assert.equal(ev!.method_version, "sns-score-v1");
  assert.equal(ev!.window_start, "2025-07-09");
  const wo = await one<{ dataset_payload: { request_url: string; daily: unknown[]; calculation: string; reference: unknown[] }; actual_outcome: string }>(
    "select dataset_payload, actual_outcome from weather_outcomes where id = $1",
    [ev!.weather_outcome_id],
  );
  assert.equal(wo!.dataset_payload.daily.length, 77); // 11 windows × 7 days
  assert.equal(wo!.dataset_payload.reference.length, 10);
  assert.match(wo!.dataset_payload.calculation, /Score = 10 ×/);
  assert.equal(wo!.actual_outcome, "rain");
});

test("weather test refuses windows newer than the data", async () => {
  const rec = await one<{ id: string }>("select id from knowledge_records where record_number = 16");
  const loc = await one<{ id: string; name: string; latitude: number; longitude: number }>(
    "select id, name, latitude, longitude from locations where slug = 'wol'",
  );
  await assert.rejects(
    runWeatherTest({ recordId: rec!.id, location: loc!, observationDate: "2026-11-01", predicted: "rain", windowDays: 30, referenceYears: 10, source: "era5", userId: null, today: "2026-11-03" }),
    /only available up to/,
  );
});

test("row-level security is on for every table", async () => {
  const rows = await query<{ relname: string; relrowsecurity: boolean }>(
    "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
  );
  for (const r of rows) assert.ok(r.relrowsecurity, r.relname);
});

test("the built-in library is identical to the database and answers the same way", async () => {
  const { BUILTIN } = await import("../src/lib/records");
  const db = await publishedSigns();
  const strip = (r: (typeof db)[number]) => ({
    ...r,
    id: "",
    evaluations: r.evaluations.filter((e) => e.method_version === "field-ai-2025").map((e) => ({ ...e, id: "", created_at: "" })),
  });
  assert.deepEqual(BUILTIN.map(strip), db.filter((r) => r.record_number <= 17).map(strip));
  for (const lang of ["en", "am"]) {
    const ex = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "dictionaries", `${lang}.json`), "utf8")).ask.examples as string[];
    ex.forEach((text, i) => assert.equal(analyzeWith(BUILTIN, { text, lang, loc: "wol" }).record?.number, i + 1, text));
  }
});

test("no page text mentions India", () => {
  for (const lang of ["en", "am"]) {
    const raw = fs.readFileSync(path.join(__dirname, "..", "src", "dictionaries", `${lang}.json`), "utf8");
    assert.doesNotMatch(raw, /India|Telangana|Haryana|ሕንድ|ተላንጋና|ሃርያና|monsoon|ሞንሱን/);
  }
});
