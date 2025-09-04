// src/app/api/qr/update-qrcode/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "qr-codes";
const FOLDER = "qrCodes"; // logical folder

type Body = {
  // editable metadata (optional)
  type?: "IDENTITY" | "PRESET";
  donorId?: string | null;
  presetGroupId?: string | null;
  presetAmount?: string | number | null; // Decimal input
  label?: string | null;
  isActive?: boolean;

  // image control
  regenerateImage?: boolean; // if true, rebuild PNG
  filenameBase?: string | null; // optional new base name for file
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { id } = params;
  const body = (await req.json()) as Body;

  const existing = await prisma.qRCode.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  // base update data
  const dataToUpdate: Record<string, unknown> = {};
  if (typeof body.type !== "undefined") dataToUpdate.type = body.type;
  if (typeof body.donorId !== "undefined") dataToUpdate.donorId = body.donorId;
  if (typeof body.presetGroupId !== "undefined")
    dataToUpdate.presetGroupId = body.presetGroupId;
  if (typeof body.presetAmount !== "undefined" && body.presetAmount !== null) {
    dataToUpdate.presetAmount = body.presetAmount; // let Prisma handle Decimal
  } else if (body.presetAmount === null) {
    dataToUpdate.presetAmount = null;
  }
  if (typeof body.label !== "undefined") dataToUpdate.label = body.label;
  if (typeof body.isActive !== "undefined")
    dataToUpdate.isActive = body.isActive;

  // optionally regenerate PNG and overwrite in Storage
  if (body.regenerateImage) {
    const token = existing.value; // your encoded string
    const redeemUrl = `${process.env.DOMAIN}/redeemQR/${token}`;

    const buffer = await QRCode.toBuffer(redeemUrl, {
      type: "png",
      width: 500,
      color: { dark: "#000000", light: "#00000000" },
    });

    // prefer existing storagePath; otherwise build one from filenameBase or default
    let storagePath = existing.storagePath;
    if (!storagePath) {
      const safeBase = (body.filenameBase || `qr_${token}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      storagePath = `${FOLDER}/${safeBase}.png`;
    }

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true, // overwrite existing
      });
    if (upErr) {
      console.error("Supabase upload error:", upErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    dataToUpdate.storagePath = storagePath;
    dataToUpdate.qrCodeUrl = `${process.env.DOMAIN}/qr-img/${encodeURI(
      storagePath
    )}`;
  }

  await prisma.qRCode.update({ where: { id }, data: dataToUpdate });
  return NextResponse.json({ success: true });
}
