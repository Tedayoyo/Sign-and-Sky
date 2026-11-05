import { test } from "node:test";
import assert from "node:assert/strict";
import { consonants, findSign, foldAmharic, isAsking, keywordMatches, normalize } from "../src/lib/match";

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

test("Amharic heard with a different vowel form still finds the sign", () => {
  assert.equal(consonants("ጉንዳን"), consonants("ጎንደን"));
  const items = [
    { id: 15, keywords: ["እንቁራሪ"] },
    { id: 17, keywords: ["ደመና", "ጥቁር ደመና"] },
  ];
  const r = findSign("እንቆረሪቶች ይጮሃሉ", items);
  assert.equal(r?.item.id, 15);
  assert.equal(r?.kind, "close");
  assert.equal(findSign("ጥቁር ደመና መጣ", items)?.kind, "exact");
});

test("English heard slightly wrong still finds the sign, ordinary words do not", () => {
  const items = [
    { id: 1, keywords: ["ant", "ants", "uphill"] },
    { id: 6, keywords: ["mist", "fog"] },
    { id: 15, keywords: ["frog", "croak"] },
    { id: 16, keywords: ["bird", "migrat"] },
    { id: 9, keywords: ["squirrel", "digging"] },
    { id: 3, keywords: ["wind"] },
  ];
  assert.equal(findSign("the aunts are carrying eggs", items)?.item.id, 1);
  assert.equal(findSign("squirel is diging", items)?.item.id, 9);
  assert.equal(findSign("frogz are croking", items)?.item.id, 15);
  assert.equal(findSign("birdz are migrateing", items)?.item.id, 16);
  assert.equal(findSign("I must sow from tomorrow", items), null);
  assert.equal(findSign("what kind of storm is it", items), null);
});
