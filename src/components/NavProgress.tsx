"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// A thin bar at the top of the screen that starts the moment a link is touched and finishes when the new page
// is on screen, so every tap gets instant feedback even on a slow connection.
export function NavProgress() {
  const path = usePathname();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    setState((s) => (s === "busy" ? "done" : s));
    const t = setTimeout(() => setState((s) => (s === "done" ? "idle" : s)), 450);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    let safety: ReturnType<typeof setTimeout> | undefined;
    // Starts on the finger or mouse press itself (pointerdown), not on release, so feedback is immediate.
    const start = (e: PointerEvent | MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname) return;
      setState("busy");
      clearTimeout(safety);
      safety = setTimeout(() => setState((s) => (s === "busy" ? "idle" : s)), 8000);
    };
    // A press that turns into a scroll is cancelled when the page does not change (safety timer below is shortened).
    const cancel = () => setState((s) => (s === "busy" ? "idle" : s));
    document.addEventListener("pointerdown", start, true);
    document.addEventListener("pointercancel", cancel, true);
    return () => {
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("pointercancel", cancel, true);
      clearTimeout(safety);
    };
  }, []);

  return <div className={`navprogress navprogress--${state}`} aria-hidden="true" />;
}
