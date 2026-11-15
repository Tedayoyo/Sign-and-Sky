// Shown instantly while a page that is not yet cached is prepared.
export default function Loading() {
  return (
    <main className="skeleton" aria-busy="true" aria-live="polite">
      <div className="skeleton__hero">
        <div className="wrap">
          <span className="sk sk--eyebrow" />
          <span className="sk sk--title" />
          <span className="sk sk--line" />
          <span className="sk sk--line sk--short" />
        </div>
      </div>
      <div className="wrap skeleton__grid">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="sk sk--card" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </main>
  );
}
