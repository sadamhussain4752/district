import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { expenseWhere } from "../filters";

export const GET = route(
  async ({ req }) => {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const where = expenseWhere(req, q);
    const [total, vendor, byCategory, allCategories, allPaidBy] = await Promise.all([
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({
        where: { AND: [where, { expenseCode: { startsWith: "PAY-" } }] },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: true }),
      prisma.expense.groupBy({ by: ["category"] }),
      prisma.expense.groupBy({ by: ["paidBy"] }),
    ]);
    const totalAmt = total._sum.amount ?? 0;
    const vendorAmt = vendor._sum.amount ?? 0;
    return NextResponse.json({
      total: { amount: totalAmt, count: total._count },
      vendor: { amount: vendorAmt, count: vendor._count },
      site: { amount: totalAmt - vendorAmt, count: total._count - vendor._count },
      topCategories: byCategory
        .map((c) => ({ category: c.category, amount: c._sum.amount ?? 0, count: c._count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6),
      categories: allCategories.map((c) => c.category).sort(),
      paidBy: allPaidBy.map((p) => p.paidBy).filter(Boolean).sort(),
    });
  },
  { feature: "expenses" },
);
