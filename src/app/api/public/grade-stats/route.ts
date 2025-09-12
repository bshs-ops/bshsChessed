import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get all groups except VOLUNTEER_GROUP and CHESSED GENERAL
    const groups = await prisma.group.findMany({
      where: {
        name: {
          notIn: ["VOLUNTEER_GROUP", "CHESSED GENERAL"],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const grades = ["9", "10", "11", "12"];
    const gradeStats = [];

    for (const grade of grades) {
      // Get total amount raised by this grade
      const totalRaised = await prisma.donation.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          donor: {
            gradeName: grade,
          },
          group: {
            name: {
              notIn: ["VOLUNTEER_GROUP", "CHESSED GENERAL"],
            },
          },
        },
      });

      // Get top donor for this grade
      const topDonor = await prisma.donation.groupBy({
        by: ["donorId"],
        _sum: {
          amount: true,
        },
        where: {
          donor: {
            gradeName: grade,
          },
          group: {
            name: {
              notIn: ["VOLUNTEER_GROUP", "CHESSED GENERAL"],
            },
          },
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 1,
      });

      let topDonorInfo = null;
      if (topDonor.length > 0) {
        const donorDetails = await prisma.donor.findUnique({
          where: { id: topDonor[0].donorId },
          select: {
            name: true,
            className: true,
          },
        });
        topDonorInfo = {
          name: donorDetails?.name || "Unknown",
          className: donorDetails?.className || "Unknown",
          amount: Number(topDonor[0]._sum.amount) || 0,
        };
      }

      // Get amount raised per group for this grade
      const groupStats = [];
      for (const group of groups) {
        const groupTotal = await prisma.donation.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            donor: {
              gradeName: grade,
            },
            groupId: group.id,
          },
        });

        groupStats.push({
          groupName: group.name,
          amount: Number(groupTotal._sum.amount) || 0,
        });
      }

      gradeStats.push({
        grade,
        totalRaised: Number(totalRaised._sum.amount) || 0,
        topDonor: topDonorInfo,
        groupStats,
      });
    }

    return NextResponse.json({ data: gradeStats });
  } catch (error) {
    console.error("Error fetching grade stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch grade statistics" },
      { status: 500 }
    );
  }
}
