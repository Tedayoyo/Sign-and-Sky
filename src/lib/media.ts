// Photographs supplied by the Sign & Sky team (12 Nov 2026), resized only, in the order the team chose:
// home hero, signs explorer, environmental intelligence, community, seasonal calendar, team, farmer stories.
// Each file exists at 640 px and at its original width, as WebP and JPEG (public/media).

export type MediaKey = "hero" | "signs" | "environment" | "community" | "calendar" | "team" | "stories";

export const MEDIA: Record<MediaKey, { file: string; width: number; height: number; illustrative: boolean }> = {
  hero: { file: "hero-landscape", width: 1106, height: 736, illustrative: false },
  signs: { file: "signs-ant", width: 1012, height: 756, illustrative: false },
  environment: { file: "environment-satellite", width: 762, height: 740, illustrative: true },
  community: { file: "community-farmers", width: 1108, height: 737, illustrative: true },
  calendar: { file: "calendar-storm", width: 1306, height: 741, illustrative: false },
  team: { file: "team-particles", width: 1107, height: 737, illustrative: false },
  stories: { file: "stories-farmer", width: 1632, height: 671, illustrative: true },
};

export function srcSet(key: MediaKey, ext: "webp" | "jpg") {
  const m = MEDIA[key];
  const sizes = Array.from(new Set([Math.min(640, m.width), m.width]));
  return sizes.map((w) => `/media/${m.file}-${w}.${ext} ${w}w`).join(", ");
}

export function fallbackSrc(key: MediaKey) {
  const m = MEDIA[key];
  return `/media/${m.file}-${m.width}.jpg`;
}
