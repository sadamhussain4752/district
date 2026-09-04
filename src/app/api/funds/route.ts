import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const GET = route(
  async ({ req }) => {
    const sp = req.nextUrl.searchParams;
    const where: Record<string, unknown> = {};
    if (sp.get("fy")) where.financialYear = sp.get("fy");
    if (sp.get("districtId")) where.districtId = sp.get("districtId");

    const [releases, totalReceived, totalExpense] = await Promise.all([
      prisma.governmentFund.findMany({ where, orderBy: { releaseDate: "desc" } }),
      prisma.governmentFund.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.aggregate({
        where: { status: { in: ["ACCOUNTS_APPROVED", "PAID"] } },
        _sum: { amount: true },
      }),
    ]);

    const districtIds = [...new Set(releases.map((r) => r.districtId).filter(Boolean))] as string[];
    const districts = await prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, name: true },
    });
    const dMap = new Map(districts.map((d) => [d.id, d.name]));

    const received = totalReceived._sum.amount ?? 0;
    const utilized = totalExpense._sum.amount ?? 0;

    return NextResponse.json({
      summary: {
        totalSanctioned: received,
        totalReceived: received,
        totalUtilized: utilized,
        balance: received - utilized,
        utilizationPct: received ? Math.round((utilized / received) * 1000) / 10 : 0,
      },
      releases: releases.map((r) => ({
        ...r,
        districtName: r.districtId ? dMap.get(r.districtId) : "State",
      })),
    });
  },
  { feature: "funds" },
);
