import { publishedSigns } from "@/lib/records";

// The published library in the shape the assistant uses, so phones can answer offline from a cached copy.
// Public data only (the same records the sign pages show).
export const revalidate = 300;

export async function GET() {
  const signs = await publishedSigns();
  return Response.json({ updated: new Date().toISOString(), signs }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } });
}
