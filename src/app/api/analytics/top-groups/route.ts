import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get top groups by total donation amount
    const topGroups = await prisma.donation.groupBy({
      by: ["groupId"],
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 10, // Get top 10 groups
    });

    // Fetch group details for the top groups
    const groupsWithDetails = await Promise.all(
      topGroups.map(async (groupData) => {
        if (!groupData.groupId) return null;

        const group = await prisma.group.findUnique({
          where: { id: groupData.groupId },
          select: {
            id: true,
            name: true,
          },
        });

        return {
          ...group,
          totalDonated: Number(groupData._sum.amount),
        };
      })
    );

    // Filter out null values (in case any groupId was null)
    const validGroups = groupsWithDetails.filter((group) => group !== null);

    return NextResponse.json(validGroups);
  } catch (error) {
    console.error("Error fetching top groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch top groups" },
      { status: 500 }
    );
  }
}
