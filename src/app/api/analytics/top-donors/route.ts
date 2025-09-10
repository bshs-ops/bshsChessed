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
    // Get top donors by total amount donated
    const topDonors = await prisma.donation.groupBy({
      by: ["donorId"],
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 10, // Get top 10 donors
    });

    // Fetch donor details for the top donors
    const donorsWithDetails = await Promise.all(
      topDonors.map(async (donation) => {
        const donor = await prisma.donor.findUnique({
          where: { id: donation.donorId },
          select: {
            id: true,
            name: true,
            className: true,
            gradeName: true,
          },
        });

        return {
          ...donor,
          totalDonated: Number(donation._sum.amount),
        };
      })
    );

    return NextResponse.json(donorsWithDetails);
  } catch (error) {
    console.error("Error fetching top donors:", error);
    return NextResponse.json(
      { error: "Failed to fetch top donors" },
      { status: 500 }
    );
  }
}
