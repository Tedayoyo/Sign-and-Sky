// The score as a rain gauge filling to X of 10.
export function Gauge({ score, label, small, of }: { score: number; label: string; small?: boolean; of?: string }) {
  const cells = [];
  for (let i = 0; i < 10; i++) {
    const cls = score >= i + 1 ? "f" : score >= i + 0.5 ? "h" : "";
    cells.push(<i key={i} className={cls} />);
  }
  const shown = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return (
    <div className={`gauge${small ? " small" : ""}`} role="img" aria-label={label}>
      <div className="gauge-tube" aria-hidden="true">{cells}</div>
      <div className="gauge-read" aria-hidden="true">
        <span className="num">{shown}</span>
        {of ? <span className="of"> {of}</span> : null}
      </div>
    </div>
  );
}

export function TrustBadge({ level, text }: { level: "strong" | "fair" | "weak" | "untested"; text: string }) {
  return <span className={`badge ${level}`}>{text}</span>;
}
