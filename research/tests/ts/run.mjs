// Reads {series: {id: Day[]}, cases: [...]} and runs the original TypeScript scoreSign on each case.
import { readFileSync, writeFileSync } from "node:fs";
import { scoreSign } from "./scoring.mjs";
const { series, cases } = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = cases.map((c) => {
  try { return { ok: true, r: scoreSign({ ...c, days: series[c.series] }) }; }
  catch (e) { return { ok: false, err: String(e.message) }; }
});
writeFileSync(process.argv[3], JSON.stringify(out));
