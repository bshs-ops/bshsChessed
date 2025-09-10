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

  // Get filter parameters from query string
  const searchParams = request.nextUrl.searchParams;
  const groupId = searchParams.get("groupId");
  const gradeName = searchParams.get("gradeName");
  const className = searchParams.get("className");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build filter object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (groupId) {
    filter.groupId = groupId;
  }

  if (gradeName) {
    filter.donor = {
      gradeName: gradeName,
    };
  }

  if (className) {
    filter.donor = {
      ...(filter.donor || {}),
      className: className,
    };
  }

  // Handle date range filtering
  if (startDate || endDate) {
    filter.createdAt = {};

    if (startDate) {
      filter.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      filter.createdAt.lte = new Date(endDate);
    }
  }

  try {
    // Get total donations based on filters
    const totalDonations = await prisma.donation.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: filter,
    });

    // Get donations list with related donor info
    const donations = await prisma.donation.findMany({
      where: filter,
      include: {
        donor: {
          select: {
            name: true,
            gradeName: true,
            className: true,
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
      take: 100, // Limit to 100 most recent donations
    });

    // Get unique grades and classes for filtering options
    const grades = await prisma.donor.groupBy({
      by: ["gradeName"],
      where: {
        gradeName: {
          not: "",
        },
      },
    });

    const classes = await prisma.donor.groupBy({
      by: ["className"],
      where: {
        className: {
          not: "",
        },
      },
    });

    // Get all groups for filtering options
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      summary: {
        totalAmount: Number(totalDonations._sum.amount) || 0,
        count: totalDonations._count.id || 0,
      },
      donations,
      filterOptions: {
        grades: grades.map((g) => g.gradeName).filter(Boolean),
        classes: classes.map((c) => c.className).filter(Boolean),
        groups,
      },
    });
  } catch (error) {
    console.error("Error fetching filtered donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donation data" },
      { status: 500 }
    );
  }
}
