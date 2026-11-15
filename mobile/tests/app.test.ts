// Checks for the parts of the app that decide what a farmer is told. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { differences } from "../scripts/sync-shared.mjs";
import { APP_STRINGS } from "../src/lib/app-strings";
import { analyzeTapped, analyzeText, clipKeyFor } from "../src/lib/ask";
import { addEntry, isDiary, removeEntry, setOutcome, summarize } from "../src/lib/diary-rules";
import { dict } from "../src/lib/i18n";
import { validateShare } from "../src/lib/outbox-rules";
import { BUILTIN, evaluationFor, fromOpenLibrary, tr } from "../src/lib/records";
import { trustLevel } from "../src/lib/scoring";
import { parseClimate } from "../src/lib/climate-parse";
import { clipFor, clipKey } from "../src/lib/voice-keys";

test("shared logic and data are identical to the website's files", () => {
  assert.deepEqual(differences(), []);
});

test("the built-in library holds the 17 published Wolaita signs in both languages", () => {
  assert.equal(BUILTIN.length, 17);
  for (const r of BUILTIN) {
    assert.ok(r.tr.en?.name && r.tr.am?.name, `sign ${r.record_number} has both languages`);
    assert.equal(r.location_slug, "wol");
  }
});

for (const lang of ["en", "am"] as const) {
  test(`tapping each sign answers about that sign, offline (${lang})`, () => {
    const d = dict(lang);
    for (const r of BUILTIN) {
      const a = analyzeTapped(BUILTIN, r.record_number, lang, d);
      assert.ok(a, `sign ${r.record_number}`);
      assert.equal(a.kind, "sign");
      assert.equal(a.record?.number, r.record_number);
      const ev = evaluationFor(r, "wol")!;
      assert.equal(a.test?.score, ev.score);
      assert.equal(a.test?.trust, trustLevel(ev.score));
      assert.ok(a.reply.includes(tr(r, lang).voice_advice!), "the reply carries the recorded advice");
    }
  });

  test(`each example sentence is recognised as its own sign (${lang})`, () => {
    const d = dict(lang);
    d.ask.examples.forEach((sentence, i) => {
      const a = analyzeText(BUILTIN, sentence, lang, null);
      assert.equal(a.record?.number, i + 1, sentence);
    });
  });
}

test("an unknown sentence is not matched to a sign, and a follow-up question uses the last sign", () => {
  assert.equal(analyzeText(BUILTIN, "my radio is broken", "en", null).kind, "unknown");
  const f = analyzeText(BUILTIN, "When should I sow my maize?", "en", 15);
  assert.equal(f.kind, "followup");
  assert.equal(f.record?.number, 15);
});

test("trust bands: very strong ≥ 9, strong 8–8.9, fair 7–7.9, weak < 7", () => {
  assert.deepEqual([9, 8.9, 8, 7.9, 7, 6.9].map(trustLevel), ["very_strong", "strong", "strong", "fair", "fair", "weak"]);
});

test("an Amharic clip is played only when its text is exactly the answer shown", () => {
  const a = analyzeTapped(BUILTIN, 1, "am", dict("am"))!;
  const key = clipKeyFor(a)!;
  assert.equal(key, clipKey("sign", 1));
  const m = { [key]: { text: a.reply, uri: "file:///x.mp3" } };
  assert.ok(clipFor(m, key, a.reply));
  assert.equal(clipFor(m, key, a.reply + " "), null);
  assert.equal(clipKeyFor(analyzeTapped(BUILTIN, 1, "en", dict("en"))!), null);
});

test("the website's open library becomes the same records the app ships with", () => {
  // Rebuild the API's shape from the built-in records, then read it back.
  const body = {
    signs: BUILTIN.map((s) => ({
      number: s.record_number, category: s.category, indicator_types: s.indicator_types, expected_outcome: s.expected_outcome,
      expected_timing: s.expected_timing, observation_date: s.observation_date, observation_period: s.observation_period,
      verification_status: s.verification_status, location: s.location_name, source: s.source_reference,
      text: Object.fromEntries(Object.entries(s.tr).map(([loc, t]) => [loc, {
        name: t.name, description: t.description, behaviour: t.observation_text, interpretation: t.interpretation, prediction: t.expected_weather,
        usual_delay: t.expected_timing_text, farm_decisions: t.agricultural_relevance, voice_advice: t.voice_advice, keywords: t.keywords, translation_status: t.translation_status,
      }])),
      tests: s.evaluations.map((e) => ({ score: e.score, method: e.method, method_version: e.method_version, evaluated_on: e.evaluated_on, location: e.location_slug, predicted_outcome: e.predicted_outcome, window: null, data_url: null })),
    })),
  };
  const back = fromOpenLibrary(body)!;
  assert.equal(back.length, 17);
  for (const lang of ["en", "am"] as const) {
    for (const r of BUILTIN) {
      const a = analyzeTapped(BUILTIN, r.record_number, lang, dict(lang))!;
      const b = analyzeTapped(back, r.record_number, lang, dict(lang))!;
      assert.equal(b.reply, a.reply);
      assert.deepEqual(b.test, a.test);
    }
  }
});

test("a broken or partial library download is refused", () => {
  assert.equal(fromOpenLibrary(null), null);
  assert.equal(fromOpenLibrary({ signs: [] }), null);
  assert.equal(fromOpenLibrary({ error: "Library not available right now." }), null);
  assert.equal(fromOpenLibrary({ signs: [{ number: 1, text: { en: {} } }] }), null);
  assert.equal(fromOpenLibrary({ signs: [{ number: 1, text: { en: { name: "x" } }, tests: [{ score: 42 }] }] }), null);
});

test("rainfall is stored only as the website reported it; gaps stay gaps", () => {
  assert.equal(parseClimate({ error: "x" }), null);
  assert.equal(parseClimate({ source: "ERA5", normal: [1, 2, 3] }), null);
  const c = parseClimate({ source: "ERA5", credit: "c", normal_period: "1991–2020", normal: [10, null, "x", 4, 5, 6, 7, 8, 9, 10, 11, 12] })!;
  assert.deepEqual(c.normal.slice(0, 4), [10, null, null, 4]);
});

test("a shared sign is checked like on the website", () => {
  const ok = { region: "South Ethiopia", location_text: "Offa", indicator: "Ants", description: "Ants moved uphill", observation_date: "2026-11-01" };
  assert.deepEqual(validateShare(ok, true, "2026-11-14"), { missing: [], badDate: false, noConsent: false });
  assert.deepEqual(validateShare({ ...ok, region: " " }, true, "2026-11-14").missing, ["region"]);
  assert.equal(validateShare({ ...ok, observation_date: "2026-11-15" }, true, "2026-11-14").badDate, true);
  assert.equal(validateShare({ ...ok, observation_date: "14/11/2026" }, true, "2026-11-14").badDate, true);
  assert.equal(validateShare(ok, false, "2026-11-14").noConsent, true);
});

test("app-only words exist in both languages with the same keys", () => {
  const keys = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
  assert.deepEqual(keys(APP_STRINGS.am), keys(APP_STRINGS.en));
  const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const flat = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "object" ? flat(v) : [v as string]));
  flat(APP_STRINGS.en).forEach((s, i) => assert.equal(holes(flat(APP_STRINGS.am)[i]), holes(s), s));
});

test("the yearly rainfall the website sends is kept as sent, and older saved copies still load", () => {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, null];
  const c = parseClimate({ source: "ERA5", normal: months, years: { "2024": months, bad: months, "2025": [1, 2] }, seasons: [{ year: 2024, belg: 12, kiremt: 30, bega: null }], season_normal: { belg: 10, kiremt: 28, bega: 40 } })!;
  assert.deepEqual(Object.keys(c.years!), ["2024"]);
  assert.equal(c.years!["2024"][11], null);
  assert.deepEqual(c.seasons, [{ year: 2024, belg: 12, kiremt: 30, bega: null }]);
  assert.equal(parseClimate({ source: "ERA5", normal: months })!.years, undefined);
});

test("my observations: one note per sign per day, outcomes counted only when checked", () => {
  let list = addEntry([], 15, "2026-11-10").list;
  const again = addEntry(list, 15, "2026-11-10");
  assert.equal(again.added, false);
  list = addEntry(list, 15, "2026-11-12").list;
  list = addEntry(list, 1, "2026-11-11").list;
  assert.deepEqual(list.map((e) => e.date), ["2026-11-12", "2026-11-11", "2026-11-10"]);
  list = setOutcome(list, list[0].id, "yes");
  list = setOutcome(list, list[2].id, "no");
  assert.deepEqual(summarize(list), [{ n: 15, seen: 2, checked: 2, yes: 1 }, { n: 1, seen: 1, checked: 0, yes: 0 }]);
  assert.equal(removeEntry(list, list[1].id).length, 2);
  assert.ok(isDiary(list));
  assert.equal(isDiary([{ id: "x", n: 1, date: "yesterday", outcome: null }]), false);
});
