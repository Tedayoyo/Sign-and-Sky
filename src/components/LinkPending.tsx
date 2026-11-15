"use client";
import { useLinkStatus } from "next/link";

// Placed inside a <Link>: shows a small pulse on the exact item that was tapped while its page loads.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span className={`link-pending${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}
