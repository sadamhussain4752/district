import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ user }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const scope = scopeFilter(user);

    const [
      completedToday,
      startedToday,
      spentTodayAgg,
      issuedTodayAgg,
      openCritical,
      recentApprovals,
    ] = await Promise.all([
      prisma.house.count({
        where: { AND: [scope, { actualCompletion: { gte: start } }] },
      }),
      prisma.house.count({
        where: { AND: [scope, { startDate: { gte: start } }] },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: start }, status: { in: ["ACCOUNTS_APPROVED", "PAID"] } },
        _sum: { amount: true },
      }),
      prisma.stockTransaction.aggregate({
        where: { type: "ISSUE", createdAt: { gte: start } },
        _sum: { quantity: true },
      }),
      prisma.issue.count({
        where: { priority: "CRITICAL", status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } },
      }),
      prisma.approval.findMany({
        where: { status: "APPROVED" },
        orderBy: { decidedAt: "desc" },
        take: 6,
      }),
    ]);

    return NextResponse.json({
      completedToday,
      startedToday,
      spentToday: spentTodayAgg._sum.amount ?? 0,
      materialIssuedToday: issuedTodayAgg._sum.quantity ?? 0,
      openCriticalIssues: openCritical,
      recentApprovals,
    });
  },
  { feature: "command-center" },
);
