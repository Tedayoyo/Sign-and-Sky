// Saves a sign the assistant did not recognise, for researchers to test. Only with the farmer's consent.
import { NextResponse } from "next/server";
import { createSubmission } from "@/lib/submissions";
import { isPlace, PLACES } from "@/lib/places";

export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (limited(ip)) return NextResponse.json({ error: "Too many saves from this connection. Try again later." }, { status: 429 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = String(b?.text ?? "").trim();
  if (!b || b.consent !== true || !text || text.length > 2000)
    return NextResponse.json({ error: "Consent and the sign text are required." }, { status: 400 });
  const lang = b.lang === "am" ? "am" : "en";
  const loc = isPlace(b.loc) ? b.loc : "wol";
  const place = PLACES[loc];
  try {
    const code = await createSubmission({
      location_text: place.dbName,
      region: place.dbName === "Wolaita" ? "South Ethiopia" : place.dbName,
      observation_date: new Date().toISOString().slice(0, 10),
      indicator: text.slice(0, 200),
      description: text,
      original_language: lang,
      notes: "Saved from the voice assistant (sign not recognised).",
      submitted_locale: lang,
    });
    return NextResponse.json({ code });
  } catch (e) {
    console.error("unknown sign save failed", e);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
}
