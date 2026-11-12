// Receives a shared sign as multipart form data (same fields as the Share form).
// Used by the Share page to send signs that were saved on the phone while it was offline.
import { NextResponse } from "next/server";
import { handleShare } from "@/lib/share-handler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the sign as multipart form data." }, { status: 400 });
  }
  const result = await handleShare(form);
  return NextResponse.json(result, { status: result.ok ? 200 : result.values ? 422 : 500, headers: { "Cache-Control": "no-store" } });
}
