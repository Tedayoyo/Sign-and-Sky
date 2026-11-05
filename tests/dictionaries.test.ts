import { test } from "node:test";
import assert from "node:assert/strict";
import en from "../src/dictionaries/en.json";
import am from "../src/dictionaries/am.json";

type J = string | number | boolean | null | J[] | { [k: string]: J };
function flat(o: J, p = "", out: Record<string, string> = {}) {
  if (Array.isArray(o)) out[p] = `array:${o.length}`;
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out);
  else out[p] = String(o);
  return out;
}
const vars = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(",");

test("English and Amharic have the same keys", () => {
  const a = flat(en as J), b = flat(am as J);
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
});

test("placeholders and list lengths match", () => {
  const a = flat(en as J), b = flat(am as J);
  for (const k of Object.keys(a)) {
    if (a[k].startsWith("array:")) assert.equal(a[k], b[k], k);
    else assert.equal(vars(a[k]), vars(b[k]), k);
  }
});

test("Amharic strings are not left in English", () => {
  const a = flat(en as J), b = flat(am as J);
  const same = Object.keys(a).filter((k) => !a[k].startsWith("array:") && a[k] === b[k] && /[a-z]{4,}/.test(a[k]) && !/^(meta\.title|langName|results\.formula|about\.source\.doc)/.test(k));
  assert.deepEqual(same, []);
});
