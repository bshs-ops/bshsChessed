import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "qr-codes";

// --- 1. Handler for Updating a QR Code ---
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string } | null;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const existingQr = await prisma.qRCode.findUnique({ where: { id } });
    if (!existingQr) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    // This logic handles the specific structure sent from your frontend form
    if (body.type === "IDENTITY") {
      // For IDENTITY, we update the QR and its related Donor in one transaction
      await prisma.$transaction([
        prisma.qRCode.update({
          where: { id },
          data: { isActive: body.isActive },
        }),
        prisma.donor.update({
          where: { id: existingQr.donorId! }, // Assumes donorId exists for IDENTITY type
          data: {
            name: body.studentName,
            className: body.studentClass,
            gradeName: body.studentGrade,
          },
        }),
      ]);
    } else if (body.type === "PRESET") {
      // For PRESET, we update the QR code directly
      await prisma.qRCode.update({
        where: { id },
        data: {
          isActive: body.isActive,
          presetGroupId: body.groupId,
          presetAmount: body.amount, // Prisma handles string -> Decimal conversion
          label: body.label,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update QR Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// --- 2. Handler for Deleting a QR Code ---
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  const user = session?.user as { role: string } | null;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    // First, find the QR record to get its storage path and related donor
    const qrToDelete = await prisma.qRCode.findUnique({
      where: { id },
      select: { storagePath: true, type: true, donorId: true },
    });

    if (!qrToDelete) {
      return NextResponse.json({ error: "QR not found" }, { status: 404 });
    }

    // Delete the image file from Supabase storage
    if (qrToDelete.storagePath) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([qrToDelete.storagePath]);
      if (storageError) {
        // Log the error but don't block deletion from the database
        console.error("Supabase file deletion error:", storageError.message);
      }
    }

    // Use a transaction to delete the QR code and, if it's an IDENTITY type,
    // also delete the associated Donor to prevent orphaned data.
    if (qrToDelete.type === "IDENTITY" && qrToDelete.donorId) {
      await prisma.$transaction([
        prisma.qRCode.delete({ where: { id } }),
        prisma.donor.delete({ where: { id: qrToDelete.donorId } }),
      ]);
    } else {
      // If it's a PRESET type, just delete the QR code
      await prisma.qRCode.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete QR Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
