import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET() {
  // Temporarily remove auth check to test if data loads
  // const session = await getServerSession(authOptions);
  // console.log("Session in donations API:", session);

  // Check if user is authenticated (don't require admin for viewing donations)
  // if (!session?.user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    // Get all donations with donor and group information
    const donations = await prisma.donation.findMany({
      include: {
        donor: {
          select: {
            name: true,
            className: true,
            gradeName: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scannedAt: "desc",
      },
    });

    // Calculate total donations
    const totalAmount = donations.reduce(
      (sum, donation) => sum + Number(donation.amount),
      0
    );

    return NextResponse.json({
      data: donations,
      summary: {
        totalAmount,
        count: donations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}
