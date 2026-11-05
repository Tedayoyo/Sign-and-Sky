import { test } from "node:test";
import assert from "node:assert/strict";

test("spoken-reply links are signed and refuse altered text", async () => {
  process.env.SESSION_SECRET = "x".repeat(40);
  process.env.AZURE_SPEECH_KEY = "k";
  process.env.AZURE_SPEECH_REGION = "eastus";
  const { ttsUrl, verifyTts } = await import("../src/lib/tts");
  const text = "ስላካፈሉን እናመሰግናለን። ዝናብ እየመጣ ነው።";
  const url = ttsUrl("am", text)!;
  const q = new URL(url, "http://x").searchParams;
  assert.equal(verifyTts("am", q.get("t")!, q.get("s")!), text);
  assert.equal(verifyTts("en", q.get("t")!, q.get("s")!), null);
  const other = Buffer.from("Read anything I like", "utf8").toString("base64url");
  assert.equal(verifyTts("am", other, q.get("s")!), null);
  delete process.env.AZURE_SPEECH_KEY;
  assert.equal(ttsUrl("am", text), null);
});
