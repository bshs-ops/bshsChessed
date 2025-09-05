import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

type Body =
  // Used in Normal Mode to get donor details after a scan
  | {
      action: "VALIDATE";
      token: string;
    }
  // Used to submit a donation in both Normal and Preset modes
  | {
      action: "RECORD";
      token: string;
      amount: number;
      groupId: string;
    };

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body: Body = await request.json();

  try {
    // 1. Find the QR Code using the scanned token
    const qrCode = await prisma.qRCode.findUnique({
      where: { value: body.token },
    });

    // 2. Validate the QR Code
    if (
      !qrCode ||
      !qrCode.isActive ||
      qrCode.type !== "IDENTITY" ||
      !qrCode.donorId
    ) {
      return NextResponse.json(
        { error: "Invalid or inactive Identity QR Code." },
        { status: 404 }
      );
    }

    // 3. Handle the requested action
    if (body.action === "VALIDATE") {
      const donor = await prisma.donor.findUnique({
        where: { id: qrCode.donorId },
      });
      if (!donor) {
        return NextResponse.json(
          { error: "Donor not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: donor });
    } else if (body.action === "RECORD") {
      const { amount, groupId } = body;
      if (typeof amount !== "number" || amount <= 0 || !groupId) {
        return NextResponse.json(
          { error: "Valid amount and group are required." },
          { status: 400 }
        );
      }

      // Record the donation in the database
      const donation = await prisma.donation.create({
        data: {
          donorId: qrCode.donorId,
          groupId: groupId,
          amount: amount,
          source: "SCAN",
        },
        include: {
          donor: { select: { name: true } },
          group: { select: { name: true } },
        },
      });

      return NextResponse.json({
        message: "Donation recorded successfully!",
        data: {
          donorName: donation.donor.name,
          groupName: donation.group.name,
          amount: donation.amount,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Scanner API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
