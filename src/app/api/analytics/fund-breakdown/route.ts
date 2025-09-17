import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get all donations with group and donor information
    const donations = await prisma.donation.findMany({
      include: {
        group: true,
        donor: true,
      },
    });

    // Get all groups to understand what groups exist
    const allGroups = await prisma.group.findMany();
    console.log(
      "Available groups:",
      allGroups.map((g) => ({ id: g.id, name: g.name, type: g.type }))
    );

    // Get volunteer participation data for current month
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const volunteerParticipation = await prisma.participation.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        donor: true,
      },
    });

    console.log("Total donations:", donations.length);
    console.log("Sample donation:", donations[0]);

    // Helper function to organize data by grade and class
    const organizeByGradeAndClass = (data: any[]) => {
      const result: Record<string, Record<string, number>> = {};

      data.forEach((item: any) => {
        const grade = item.donor?.gradeName || "Unknown";
        const className = item.donor?.className || "Unknown";

        if (!result[grade]) result[grade] = {};
        if (!result[grade][className]) result[grade][className] = 0;

        result[grade][className] += parseFloat(item.amount || 1); // For volunteers, count as 1
      });

      return result;
    };

    // Calculate Shiras Sara breakdown
    const shirasSaraData = donations.filter(
      (d: any) =>
        d.group?.name &&
        (d.group.name.toUpperCase().includes("SHIRAS_SARA") ||
          d.group.name.toUpperCase().includes("SHIRAS SARA") ||
          d.group.name.toUpperCase() === "SHIRAS_SARA")
    );
    const shirasSaraTotal = shirasSaraData.reduce(
      (sum: number, d: any) => sum + parseFloat(d.amount),
      0
    );
    const shirasSaraBreakdown = organizeByGradeAndClass(shirasSaraData);

    // Calculate Shiras Sara Supporters breakdown
    const shirasSaraSupportersData = donations.filter(
      (d: any) =>
        d.group?.name &&
        (d.group.name.toUpperCase().includes("SHIRAS_SARA_SUPPORTER") ||
          d.group.name.toUpperCase().includes("SHIRAS SARA SUPPORTER") ||
          d.group.name.toUpperCase().includes("SUPPORTER"))
    );
    const shirasSaraSupportersTotal = shirasSaraSupportersData.reduce(
      (sum: number, d: any) => sum + parseFloat(d.amount),
      0
    );
    const shirasSaraSupportersBreakdown = organizeByGradeAndClass(
      shirasSaraSupportersData
    );

    // Calculate Tiferes Rochel breakdown
    const tiferesRochelData = donations.filter(
      (d: any) =>
        d.group?.name &&
        (d.group.name.toUpperCase().includes("TIFERES_ROCHEL") ||
          d.group.name.toUpperCase().includes("TIFERES ROCHEL") ||
          d.group.name.toUpperCase().includes("TIFERESROCHEL") ||
          d.group.name.toUpperCase() === "TIFERES_ROCHEL")
    );
    const tiferesRochelTotal = tiferesRochelData.reduce(
      (sum: number, d: any) => sum + parseFloat(d.amount),
      0
    );
    const tiferesRochelBreakdown = organizeByGradeAndClass(tiferesRochelData);
    const quartersCount = tiferesRochelData.filter(
      (d: any) => parseFloat(d.amount) === 0.25
    ).length;

    // Calculate Lev Shulamis volunteer breakdown
    const levShulamis = volunteerParticipation.filter((p: any) => p.donor);
    const levShulamimBreakdown = organizeByGradeAndClass(levShulamis);

    const result = {
      shirasSara: {
        total: shirasSaraTotal,
        breakdown: shirasSaraBreakdown,
      },
      shirasSaraSupporter: {
        total: shirasSaraSupportersTotal,
        breakdown: shirasSaraSupportersBreakdown,
      },
      tiferesRochel: {
        total: tiferesRochelTotal,
        breakdown: tiferesRochelBreakdown,
        quartersCount,
      },
      levShulamis: {
        breakdown: levShulamimBreakdown,
      },
    };

    console.log("Result breakdown:", JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching fund breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch fund breakdown data" },
      { status: 500 }
    );
  }
}
