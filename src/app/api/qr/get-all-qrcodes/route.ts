// src/app/api/qr/get-all-qrcodes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET() {
  // Admin guard
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  // Pull all QRs with related donor / group for formatting
  const qrCodes = await prisma.qRCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      donor: {
        select: { id: true, name: true, className: true, gradeName: true },
      },
      presetGroup: {
        select: { id: true, name: true },
      },
    },
  });

  // Normalize to a frontend-friendly format
  const data = qrCodes.map((q) => {
    const isIdentity = q.type === "IDENTITY";
    const isPreset = q.type === "PRESET";

    return {
      id: q.id,
      type: q.type, // "IDENTITY" | "PRESET"
      code: q.value, // the printable/encoded string
      imageUrl: q.qrCodeUrl, // permanent proxy URL if you used /qr-img/...
      storagePath: q.storagePath, // useful for admin/debug
      isActive: q.isActive,
      createdAt: q.createdAt,

      // Only present when relevant:
      identity:
        isIdentity && q.donor
          ? {
              donorId: q.donor.id,
              name: q.donor.name,
              className: q.donor.className,
              gradeName: q.donor.gradeName,
            }
          : null,

      preset: isPreset
        ? {
            groupId: q.presetGroupId ?? null,
            groupName: q.presetGroup?.name ?? null,
            amount: q.presetAmount?.toString() ?? null, // Decimal -> string for JSON safety
            label: q.label ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({ data });
}
