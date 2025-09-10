import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get class and grade from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const gradeName = searchParams.get("gradeName");
  const className = searchParams.get("className");

  if (!gradeName || !className) {
    return NextResponse.json(
      { error: "Grade name and class name are required" },
      { status: 400 }
    );
  }

  try {
    // Get all donors in the specified class
    const donors = await prisma.donor.findMany({
      where: {
        gradeName: gradeName,
        className: className,
      },
      select: {
        id: true,
      },
    });

    const donorIds = donors.map((donor) => donor.id);

    // Get donation statistics for these donors
    const classDonations = await prisma.donation.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        donorId: true,
      },
      where: {
        donorId: {
          in: donorIds,
        },
      },
    });

    // Count unique donors who have made donations
    const uniqueDonorsWithDonations = await prisma.donation.groupBy({
      by: ["donorId"],
      where: {
        donorId: {
          in: donorIds,
        },
      },
    });

    return NextResponse.json({
      totalAmount: Number(classDonations._sum.amount) || 0,
      donorCount: uniqueDonorsWithDonations.length || 0,
    });
  } catch (error) {
    console.error("Error fetching class donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch class donations" },
      { status: 500 }
    );
  }
}
