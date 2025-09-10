// src/app/api/admin/expenses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const expenses = await prisma.expense.findMany({
      include: { group: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { groupId, description, amount, fundingSource, date } = body;

    if (!description || !amount || !fundingSource) {
      return NextResponse.json(
        { error: "description, amount, and fundingSource are required" },
        { status: 400 }
      );
    }

    // Validate fundingSource
    if (!["BUDGET", "DONATION", "EXTERNAL"].includes(fundingSource)) {
      return NextResponse.json(
        {
          error: "fundingSource must be one of: BUDGET, DONATION, EXTERNAL",
        },
        { status: 400 }
      );
    }

    // If groupId is provided, ensure group exists
    if (groupId) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        groupId,
        description,
        amount: parseFloat(amount),
        fundingSource,
        date: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({ data: expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
