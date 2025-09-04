// src/app/api/qr/delete-qrcode/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "qr-codes";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const qrId = params.id;

  const record = await prisma.qRCode.findUnique({
    where: { id: qrId },
    select: { storagePath: true, qrCodeUrl: true },
  });
  if (!record)
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  let storagePath = record.storagePath;

  if (!storagePath && record.qrCodeUrl) {
    try {
      const u = new URL(record.qrCodeUrl);
      const marker = "/qr-img/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1)
        storagePath = decodeURI(u.pathname.slice(idx + marker.length));
    } catch {
      /* ignore */
    }
  }

  if (storagePath) {
    const { error: rmErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (rmErr) console.error("Supabase remove error:", rmErr);
  }

  await prisma.qRCode.delete({ where: { id: qrId } });
  return new NextResponse(null, { status: 204 });
}
