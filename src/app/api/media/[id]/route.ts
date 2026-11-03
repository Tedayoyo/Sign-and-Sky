// Serves an uploaded photo. Public photos for everyone; private ones (farmer submissions) only for signed-in researchers.
import { one } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const m = await one<{ mime_type: string; data: Buffer; is_public: boolean }>(
    "select mime_type, data, is_public from uploaded_media where id = $1",
    [id],
  );
  if (!m) return new Response("Not found", { status: 404 });
  if (!m.is_public && !(await currentUser())) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mime_type,
      "Cache-Control": m.is_public ? "public, max-age=86400" : "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
