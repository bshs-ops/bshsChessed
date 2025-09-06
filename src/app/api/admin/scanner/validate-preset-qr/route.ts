import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body: { token: string } = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    // Find the QR Code using the scanned token
    const qrCode = await prisma.qRCode.findUnique({
      where: { value: token },
      include: {
        presetGroup: { select: { id: true, name: true } },
      },
    });

    // Validate the QR Code
    if (!qrCode || !qrCode.isActive || qrCode.type !== "PRESET") {
      return NextResponse.json(
        { error: "Invalid or inactive Preset QR Code." },
        { status: 404 }
      );
    }

    if (!qrCode.presetGroupId || !qrCode.presetAmount) {
      return NextResponse.json(
        { error: "Preset QR is missing group or amount." },
        { status: 400 }
      );
    }

    // Return the preset information
    return NextResponse.json({
      data: {
        presetGroupId: qrCode.presetGroupId,
        presetGroupName: qrCode.presetGroup?.name || "Unknown",
        presetAmount: qrCode.presetAmount,
        label: qrCode.label || "Unlabeled preset",
      },
    });
  } catch (error) {
    console.error("Scanner Preset Validation Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
