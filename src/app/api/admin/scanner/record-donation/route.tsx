import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

type IdentifierType = "QR_VALUE" | "DONOR_ID";

type Body = {
  action: "VALIDATE" | "RECORD";
  // When identifierType is QR_VALUE (default), clients send `token` (the QR value)
  // When identifierType is DONOR_ID, clients send `donorId` directly (used by Physical Scanner mode)
  identifierType?: IdentifierType;
  token?: string;
  donorId?: string;
  amount?: number;
  groupId?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body: Body = await request.json();

  try {
    const identifierType: IdentifierType = body.identifierType ?? "QR_VALUE";

    if (body.action === "VALIDATE") {
      if (identifierType === "DONOR_ID") {
        const donorId = (body.donorId || "").trim();
        if (!donorId) {
          return NextResponse.json(
            { error: "Student ID is required." },
            { status: 400 }
          );
        }
        const donor = await prisma.donor.findUnique({ where: { id: donorId } });
        if (!donor) {
          return NextResponse.json(
            {
              error:
                "Invalid student ID. It looks like a Preset QR was scanned. Please scan a Student ID in step 1.",
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ data: donor });
      } else {
        const token = (body.token || "").trim();
        if (!token) {
          return NextResponse.json(
            { error: "QR token is required." },
            { status: 400 }
          );
        }
        const qrCode = await prisma.qRCode.findUnique({
          where: { value: token },
        });
        if (
          !qrCode ||
          !qrCode.isActive ||
          qrCode.type !== "IDENTITY" ||
          !qrCode.donorId
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid or inactive Student ID QR. Make sure you're scanning the Student ID code.",
            },
            { status: 404 }
          );
        }
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
      }
    } else if (body.action === "RECORD") {
      const { amount, groupId } = body;
      if (typeof amount !== "number" || amount <= 0 || !groupId) {
        return NextResponse.json(
          { error: "Valid amount and group are required." },
          { status: 400 }
        );
      }

      let donorIdToUse: string | null = null;
      if (identifierType === "DONOR_ID") {
        const donorId = (body.donorId || "").trim();
        if (!donorId) {
          return NextResponse.json(
            { error: "Student ID is required to record a donation." },
            { status: 400 }
          );
        }
        const donor = await prisma.donor.findUnique({ where: { id: donorId } });
        if (!donor) {
          return NextResponse.json(
            {
              error:
                "Invalid student ID. It looks like a Preset QR was scanned. Please scan a valid Student ID first.",
            },
            { status: 400 }
          );
        }
        donorIdToUse = donor.id;
      } else {
        const token = (body.token || "").trim();
        if (!token) {
          return NextResponse.json(
            { error: "QR token is required to record a donation." },
            { status: 400 }
          );
        }
        const qrCode = await prisma.qRCode.findUnique({
          where: { value: token },
        });
        if (
          !qrCode ||
          !qrCode.isActive ||
          qrCode.type !== "IDENTITY" ||
          !qrCode.donorId
        ) {
          return NextResponse.json(
            {
              error:
                "Invalid or inactive Student ID QR. Make sure you're scanning the Student ID code.",
            },
            { status: 404 }
          );
        }
        donorIdToUse = qrCode.donorId;
      }

      const donation = await prisma.donation.create({
        data: {
          donorId: donorIdToUse!,
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
