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
    // Get all distinct grades with their associated classes
    const donors = await prisma.donor.findMany({
      select: {
        gradeName: true,
        className: true,
      },
      distinct: ["gradeName", "className"],
      orderBy: [{ gradeName: "asc" }, { className: "asc" }],
    });

    // Group by grade name
    const grades = donors.reduce((acc, donor) => {
      if (!donor.gradeName || !donor.className) return acc;

      const existingGrade = acc.find((g) => g.name === donor.gradeName);
      if (existingGrade) {
        if (!existingGrade.classes.includes(donor.className)) {
          existingGrade.classes.push(donor.className);
        }
      } else {
        acc.push({
          name: donor.gradeName,
          classes: [donor.className],
        });
      }
      return acc;
    }, [] as { name: string; classes: string[] }[]);

    return NextResponse.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades" },
      { status: 500 }
    );
  }
}
