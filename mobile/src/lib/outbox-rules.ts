// The checks made before a shared sign is saved on the phone (no phone features here, so it can be unit-tested).
export type ShareFields = Record<string, string>;

/** The same checks the website makes, so a sign saved offline is not refused later. */
export function validateShare(fields: ShareFields, consent: boolean, today = new Date().toISOString().slice(0, 10)): { missing: string[]; badDate: boolean; noConsent: boolean } {
  const missing = ["region", "location_text", "indicator", "description", "observation_date"].filter((k) => !(fields[k] ?? "").trim());
  const d = (fields.observation_date ?? "").trim();
  const badDate = !!d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today || d < "1950-01-01" || Number.isNaN(Date.parse(d)));
  return { missing, badDate, noConsent: !consent };
}
