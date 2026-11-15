// Language routing: every page lives under /en or /am. Paths without a language
// (/, /signs, /research …) are redirected to the farmer's preferred language.
import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "am"];

function preferred(req: NextRequest): string {
  const cookie = req.cookies.get("sns_lang")?.value;
  if (cookie && LOCALES.includes(cookie)) return cookie;
  const accept = req.headers.get("accept-language") || "";
  return /\bam\b/i.test(accept) ? "am" : "en";
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (LOCALES.includes(first)) {
    // Research pages without a session go straight to sign-in here, saving a slow server round trip.
    const second = pathname.split("/")[2];
    if (second === "research" && !pathname.startsWith(`/${first}/research/login`) && !req.cookies.get("sns_session")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = `/${first}/research/login`;
      url.search = "";
      return NextResponse.redirect(url);
    }
    const headers = new Headers(req.headers);
    headers.set("x-sns-lang", first);
    const res = NextResponse.next({ request: { headers } });
    if (req.cookies.get("sns_lang")?.value !== first)
      res.cookies.set("sns_lang", first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${preferred(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and files with an extension (images, audio, icons).
  matcher: ["/((?!api|_next|.*\\.[a-zA-Z0-9]+$).*)"],
};
