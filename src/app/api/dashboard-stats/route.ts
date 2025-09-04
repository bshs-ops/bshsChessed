// src/app/api/admin/dashboard-stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  // Budget, Spent, Remaining
  const [
    budgetAgg,
    spentAgg,
    qrTotal,
    qrActive,
    donorTotal,
    groupTotal,
    donationAgg,
  ] = await Promise.all([
    prisma.budget.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.qRCode.count(),
    prisma.qRCode.count({ where: { isActive: true } }),
    prisma.donor.count(),
    prisma.group.count(),
    prisma.donation.aggregate({ _sum: { amount: true } }),
  ]);

  const budget = Number(budgetAgg._sum.amount ?? 0);
  const spent = Number(spentAgg._sum.amount ?? 0);
  const remaining = budget - spent;
  const totalDonations = Number(donationAgg._sum.amount ?? 0);

  return NextResponse.json({
    data: {
      budget,
      spent,
      remaining,
      qrTotal,
      qrActive,
      donorTotal,
      groupTotal,
      totalDonations,
    },
  });
}
