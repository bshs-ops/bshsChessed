import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Check auth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to perform this action" },
        { status: 401 }
      );
    }

    // Get all donors with identity QR codes
    const donors = await prisma.donor.findMany({
      include: {
        participations: {
          include: {
            group: true,
          },
        },
      },
    });

    // Transform the data to include the required fields
    const transformedDonors = donors.map((donor) => {
      const participations = donor.participations.map((p) => ({
        id: p.id,
        groupId: p.groupId,
        groupName: p.group.name,
        date: p.date.toISOString(),
      }));

      return {
        id: donor.id,
        name: donor.name,
        className: donor.className,
        gradeName: donor.gradeName,
        isVolunteer: participations.length > 0,
        participations,
      };
    });

    return NextResponse.json({ data: transformedDonors }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching donors:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch donors";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
