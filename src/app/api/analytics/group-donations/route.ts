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

  // Get groupId from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json(
      { error: "Group ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get total donations for the specified group
    const groupDonations = await prisma.donation.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        groupId: groupId,
      },
    });

    return NextResponse.json({
      totalAmount: Number(groupDonations._sum.amount) || 0,
    });
  } catch (error) {
    console.error("Error fetching group donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch group donations" },
      { status: 500 }
    );
  }
}
