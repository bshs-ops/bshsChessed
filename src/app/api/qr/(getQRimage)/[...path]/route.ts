import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "qr-codes";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> } // ✅ App Router expects params as Promise
) {
  // Await params from Next.js
  const { path } = await context.params;

  const segments = Array.isArray(path) ? path : [path];

  const fileKey = segments.map(decodeURIComponent).join("/");
  if (!fileKey) {
    return NextResponse.json({ error: "Missing file key" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(fileKey);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isPng = fileKey.toLowerCase().endsWith(".png");
  const isJpg = /\.(jpe?g)$/i.test(fileKey);
  const isSvg = fileKey.toLowerCase().endsWith(".svg");
  const contentType = isPng
    ? "image/png"
    : isJpg
    ? "image/jpeg"
    : isSvg
    ? "image/svg+xml"
    : "application/octet-stream";

  return new NextResponse(data as Blob, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
