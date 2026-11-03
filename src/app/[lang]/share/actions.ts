"use server";
import { dict, fmt } from "@/lib/i18n";
import { createSubmission, sniffImage, LANGS, TIMINGS, ACTIVITIES, MAX_IMAGE, type NewSubmission } from "@/lib/submissions";

export type ShareState = { ok?: boolean; code?: string; error?: string; values?: Record<string, string> };

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function shareSign(_prev: ShareState, f: FormData): Promise<ShareState> {
  const lang = s(f, "lang") === "am" ? "am" : "en";
  const d = dict(lang).share;
  const values: Record<string, string> = {};
  for (const k of ["farmer_name", "region", "location_text", "village", "observation_date", "indicator", "description", "original_language", "interpretation", "expected_event", "expected_timing", "agricultural_activity", "crop_type", "notes"])
    values[k] = s(f, k);

  const missing: string[] = [];
  if (!values.region) missing.push(d.region);
  if (!values.location_text) missing.push(d.location);
  if (!values.indicator) missing.push(d.indicator);
  if (!values.description) missing.push(d.description);
  if (!values.observation_date) missing.push(d.date);
  if (missing.length) return { error: fmt(d.errors.required, { fields: missing.join(", ") }), values };

  const date = values.observation_date;
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < "1950-01-01" || Number.isNaN(Date.parse(date)))
    return { error: d.errors.date, values };
  if (f.get("consent") !== "on") return { error: d.errors.consent, values };

  let photo: NewSubmission["photo"] = null;
  const file = f.get("photo");
  if (file && typeof file === "object" && "arrayBuffer" in file && file.size > 0) {
    if (file.size > MAX_IMAGE) return { error: d.errors.photo, values };
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = sniffImage(bytes);
    if (!type) return { error: d.errors.photo, values };
    photo = { type, bytes, name: file.name || "photo" };
  }

  const pick = <T extends readonly string[]>(v: string, list: T, dflt: T[number]): T[number] => ((list as readonly string[]).includes(v) ? v : dflt);
  try {
    const code = await createSubmission({
      farmer_name: values.farmer_name || null,
      location_text: values.location_text,
      region: values.region,
      village: values.village || null,
      observation_date: date,
      indicator: values.indicator,
      description: values.description,
      original_language: pick(values.original_language, LANGS, lang),
      interpretation: values.interpretation || null,
      expected_event: values.expected_event || null,
      expected_timing: pick(values.expected_timing, TIMINGS, "other_unknown"),
      agricultural_activity: pick(values.agricultural_activity, ACTIVITIES, "other"),
      crop_type: values.crop_type || null,
      notes: values.notes || null,
      submitted_locale: lang,
      photo,
    });
    return { ok: true, code };
  } catch (e) {
    console.error("share failed", e);
    return { error: d.errors.server, values };
  }
}
