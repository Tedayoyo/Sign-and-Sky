// The farmer's own notebook of signs seen and what followed (no phone features here, so it can be unit-tested).
// It is a personal record kept on the phone. It is never mixed into the published scores.
export type Outcome = "yes" | "no" | null;
export type DiaryEntry = { id: string; n: number; date: string; outcome: Outcome };

/** Adds a sighting; the same sign is noted at most once a day. Newest first. */
export function addEntry(list: DiaryEntry[], n: number, date: string): { list: DiaryEntry[]; added: boolean } {
  if (list.some((e) => e.n === n && e.date === date)) return { list, added: false };
  const entry: DiaryEntry = { id: `${date}-${n}-${Math.random().toString(36).slice(2, 7)}`, n, date, outcome: null };
  return { list: [entry, ...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), added: true };
}

export const setOutcome = (list: DiaryEntry[], id: string, outcome: Outcome) => list.map((e) => (e.id === id ? { ...e, outcome } : e));
export const removeEntry = (list: DiaryEntry[], id: string) => list.filter((e) => e.id !== id);

export type DiarySummary = { n: number; seen: number; checked: number; yes: number };

/** Per sign: how often it was seen, how many sightings were checked, and how many of those came true. */
export function summarize(list: DiaryEntry[]): DiarySummary[] {
  const by = new Map<number, DiarySummary>();
  for (const e of list) {
    const s = by.get(e.n) ?? { n: e.n, seen: 0, checked: 0, yes: 0 };
    s.seen++;
    if (e.outcome) s.checked++;
    if (e.outcome === "yes") s.yes++;
    by.set(e.n, s);
  }
  return [...by.values()].sort((a, b) => b.seen - a.seen || a.n - b.n);
}

export function isDiary(x: unknown): x is DiaryEntry[] {
  return Array.isArray(x) && x.every((e) => e && typeof e.id === "string" && Number.isInteger(e.n) && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (e.outcome === null || e.outcome === "yes" || e.outcome === "no"));
}
