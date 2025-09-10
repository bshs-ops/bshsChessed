// src/app/api/admin/budgets/route.ts
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
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: budgets });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
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
    const { amount, groupId } = body;

    if (!amount || !groupId) {
      return NextResponse.json(
        { error: "amount and groupId are required" },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // First check if there's an existing budget for this group
    const existingBudget = await prisma.budget.findFirst({
      where: { groupId },
    });

    let budget;
    if (existingBudget) {
      // Update existing budget
      budget = await prisma.budget.update({
        where: { id: existingBudget.id },
        data: { amount: parseFloat(amount) },
      });
    } else {
      // Create new budget
      budget = await prisma.budget.create({
        data: {
          amount: parseFloat(amount),
          groupId,
        },
      });
    }

    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Budget ID is required" },
        { status: 400 }
      );
    }

    // Check if the budget exists
    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Delete the budget
    await prisma.budget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    );
  }
}
