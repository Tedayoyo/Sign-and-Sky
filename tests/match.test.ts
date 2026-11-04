import { test } from "node:test";
import assert from "node:assert/strict";
import { findSign, foldAmharic, isAsking, keywordMatches, normalize } from "../src/lib/match";

test("Amharic spelling variants fold together", () => {
  assert.equal(foldAmharic("ፀሐይ"), foldAmharic("ጸሀይ"));
  assert.equal(foldAmharic("ሠላም"), "ሰላም");
  assert.equal(foldAmharic("ዐይን"), "አይን");
  assert.equal(foldAmharic("ኀይል"), foldAmharic("ሀይል"));
});

test("English keywords match at word starts only", () => {
  const t = normalize("I want rain; the migrating birds came");
  assert.equal(keywordMatches(t, "ant"), false);
  assert.equal(keywordMatches(t, "migrat"), true);
  assert.equal(keywordMatches(normalize("Ants are busy"), "ant"), true);
});

test("the longest keyword wins", () => {
  const items = [
    { id: 1, keywords: ["ant", "ants"] },
    { id: 7, keywords: ["in a line", "marching"] },
  ];
  assert.equal(findSign("The ants are marching in a line", items)?.item.id, 7);
  assert.equal(findSign("Ants everywhere", items)?.item.id, 1);
  assert.equal(findSign("nothing here", items), null);
});

test("questions are recognised in both languages", () => {
  assert.ok(isAsking("When should I sow my maize?"));
  assert.ok(isAsking("በቆሎዬን መቼ ልዝራ?"));
  assert.ok(!isAsking("Frogs are croaking"));
});
