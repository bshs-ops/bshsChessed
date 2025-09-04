import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Optional: narrow which fields you send to the client
const groupSelect = {
  id: true,
  name: true,
  type: true, // FUND | VOLUNTEER
  createdAt: true,
  updatedAt: true,
};

export async function GET() {
  try {
    // You can sort by name to make dropdowns stable
    const groups = await prisma.group.findMany({
      select: groupSelect,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: groups }, { status: 200 });
  } catch (err) {
    console.error("get-all-groups error:", err);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
