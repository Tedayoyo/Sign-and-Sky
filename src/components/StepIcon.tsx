// Icons for the five stages: observe, document, join data, test, return.
const PATHS: string[][] = [
  ["M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 12h7M9 16h7M9 8h3"],
  ["M12 3l8 4.5-8 4.5-8-4.5z", "M4 12l8 4.5 8-4.5", "M4 16.5L12 21l8-4.5"],
  ["M4 20V10M10 20V4M16 20v-7M22 20H2", "M14 8l2 2 4-4"],
  ["M4 5h16v11H9l-5 4z", "M8 9h8M8 12.5h5"],
];

export function StepIcon({ step }: { step: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {(PATHS[step] ?? PATHS[0]).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
