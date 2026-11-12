import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startDb, stopDb } from "./helpers";
import { query } from "../src/lib/db";
import { sniffAudio } from "../src/lib/submissions";
import { handleShare } from "../src/lib/share-handler";
import { groupFor } from "../src/lib/explorer";

before(async () => {
  await startDb();
});
after(async () => {
  await stopDb();
});

const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200, 1)]);
const m4a = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypM4A "), Buffer.alloc(200, 1)]);

test("voice notes are recognised from their first bytes", () => {
  assert.equal(sniffAudio(webm), "audio/webm");
  assert.equal(sniffAudio(m4a), "audio/mp4");
  assert.equal(sniffAudio(Buffer.concat([Buffer.from("OggS"), Buffer.alloc(20)])), "audio/ogg");
  assert.equal(sniffAudio(Buffer.from("<html>not audio</html>")), null);
});

function form(extra: Record<string, string | Blob> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    lang: "am",
    indicator: "ጉንዳኖች እንቁላላቸውን ወደ ከፍታ ያጓጉዛሉ",
    description: "ዛሬ ጠዋት በማሳዬ ዳር አየሁ።",
    observation_date: "2026-11-10",
    region: "South Ethiopia",
    location_text: "Offa Woreda",
    original_language: "wal",
    consent: "on",
  };
  for (const [k, v] of Object.entries({ ...base, ...extra })) f.set(k, v);
  return f;
}

test("a shared sign with a voice note is stored privately for researchers", async () => {
  const r = await handleShare(form({ voice: new Blob([webm], { type: "audio/webm" }) }));
  assert.equal(r.ok, true, r.error);
  const rows = await query<{ mime_type: string; is_public: boolean; original_language: string }>(
    `select m.mime_type, m.is_public, s.original_language from uploaded_media m join farmer_submissions s on s.id = m.submission_id
     where s.reference_code = $1`,
    [r.code],
  );
  assert.deepEqual(rows, [{ mime_type: "audio/webm", is_public: false, original_language: "wal" }]);
});

test("a file that is not audio is refused, and consent stays required", async () => {
  const bad = await handleShare(form({ voice: new Blob(["<script>"], { type: "audio/webm" }) }));
  assert.equal(bad.ok, undefined);
  assert.ok(bad.error);
  const noConsent = form();
  noConsent.delete("consent");
  assert.ok((await handleShare(noConsent)).error);
});

test("every published sign belongs to one explorer group", () => {
  for (let n = 1; n <= 17; n++) assert.ok(["sky", "animals", "insects", "wind", "plants"].includes(groupFor(n, "other")));
  assert.equal(groupFor(1, "animal"), "insects");
  assert.equal(groupFor(17, "cloud_wind"), "sky");
  assert.equal(groupFor(99, "plant"), "plants");
});
