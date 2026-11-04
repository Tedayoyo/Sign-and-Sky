// Small line icons for the kinds of signs.
const PATHS: Record<string, React.ReactNode> = {
  animal: (
    <>
      <ellipse cx="12" cy="15" rx="4.5" ry="3.5" />
      <circle cx="6" cy="9" r="1.8" />
      <circle cx="10" cy="5.8" r="1.8" />
      <circle cx="14" cy="5.8" r="1.8" />
      <circle cx="18" cy="9" r="1.8" />
    </>
  ),
  plant: (
    <>
      <path d="M12 21V10" />
      <path d="M12 13c-4 0-7-3-7-8 4 0 7 3 7 8Z" />
      <path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7Z" />
    </>
  ),
  cloud_wind: (
    <>
      <path d="M7 15h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 15Z" />
      <path d="M4 19h10M8 22h8" />
    </>
  ),
  atmospheric: <path d="M3 8h18M5 12h14M3 16h18M7 20h10" />,
  celestial: (
    <>
      <path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4Z" />
      <path d="M6 4v3M4.5 5.5h3" />
    </>
  ),
  soil_temperature: <path d="M3 17h18M5 21h14M12 3v9M9 9l3 3 3-3" />,
  other: <circle cx="12" cy="12" r="7" />,
};

export function CategoryIcon({ category }: { category: string }) {
  return (
    <svg className="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[category] ?? PATHS.other}
    </svg>
  );
}
