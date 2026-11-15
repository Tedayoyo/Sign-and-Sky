import { notFound } from "next/navigation";

// Any unknown address under /en or /am shows the site's own not-found page.
export default function Rest() {
  notFound();
}
