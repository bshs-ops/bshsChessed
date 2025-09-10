import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to perform this action" },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Participation ID is required" },
        { status: 400 }
      );
    }

    // Delete participation record
    await prisma.participation.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Participation record deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting participation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete participation record" },
      { status: 500 }
    );
  }
}
