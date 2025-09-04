// src/app/api/qr/(getQRimage)/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "qr-codes";

type Ctx =
  | { params: Promise<{ path: string[] | string }> }
  | { params: { path: string[] | string } };

export async function GET(req: NextRequest, ctx: Ctx) {
  // 👇 Handle both async and sync params
  const raw = "params" in ctx ? (await (ctx as any).params) ?? {} : {};
  let segments: string[] = [];

  if (Array.isArray(raw.path)) segments = raw.path;
  else if (typeof raw.path === "string" && raw.path.length)
    segments = [raw.path];

  // Fallback: derive from URL (helps during odd edge cases)
  if (segments.length === 0) {
    const after = new URL(req.url).pathname.replace(/^\/api\/qr\/?/, "");
    if (after) segments = after.split("/").map(decodeURIComponent);
  }

  // Final object key inside the Supabase bucket
  const fileKey = segments.map(decodeURIComponent).join("/"); // e.g. "identity/john-cena_531475.png"
  if (!fileKey) {
    return NextResponse.json({ error: "Missing file key" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(fileKey);
  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Content-Type based on extension (optional but nice)
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

  return new NextResponse(data as any, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
