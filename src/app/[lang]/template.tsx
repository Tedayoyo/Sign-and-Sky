// Re-mounts on every page change, so each new page eases in (disabled for people who prefer reduced motion).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
