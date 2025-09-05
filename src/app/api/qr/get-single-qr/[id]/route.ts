// src/app/api/qr/get-single-qr/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // await the params

  const qr = await prisma.qRCode.findUnique({
    where: { id },
    include: {
      donor: {
        select: { id: true, name: true, className: true, gradeName: true },
      },
      presetGroup: { select: { id: true, name: true } },
    },
  });

  if (!qr)
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });

  const payload = {
    id: qr.id,
    type: qr.type,
    code: qr.value,
    imageUrl: qr.qrCodeUrl,
    storagePath: qr.storagePath,
    isActive: qr.isActive,
    createdAt: qr.createdAt,
    identity:
      qr.type === "IDENTITY" && qr.donor
        ? {
            donorId: qr.donor.id,
            name: qr.donor.name,
            className: qr.donor.className,
            gradeName: qr.donor.gradeName,
          }
        : null,
    preset:
      qr.type === "PRESET"
        ? {
            groupId: qr.presetGroupId ?? null,
            groupName: qr.presetGroup?.name ?? null,
            amount: qr.presetAmount?.toString() ?? null,
            label: qr.label ?? null,
          }
        : null,
  };

  return NextResponse.json({ data: payload });
}
