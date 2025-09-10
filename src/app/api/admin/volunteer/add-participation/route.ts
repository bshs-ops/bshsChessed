import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Check auth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to perform this action" },
        { status: 401 }
      );
    }

    // Get request body
    const { donorId, groupId, date } = await req.json();

    // Validate required fields
    if (!donorId || !groupId) {
      return NextResponse.json(
        { error: "Donor ID and Group ID are required" },
        { status: 400 }
      );
    }

    // Create participation record
    const participation = await prisma.participation.create({
      data: {
        donorId,
        groupId,
        date: date ? new Date(date) : new Date(), // Use provided date or current date
      },
    });

    return NextResponse.json({ data: participation }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error adding participation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add participation",
      },
      { status: 500 }
    );
  }
}
