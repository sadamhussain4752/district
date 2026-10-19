import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { expenseWhere } from "../filters";

export const GET = route(
  async ({ req }) => {
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const where = expenseWhere(req, q);
    const [total, vendor, byCategory, allCategories, allPaidBy, labourPayments] = await Promise.all([
      prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({
        where: { AND: [where, { expenseCode: { startsWith: "PAY-" } }] },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: true }),
      prisma.expense.groupBy({ by: ["category"] }),
      prisma.expense.groupBy({ by: ["paidBy"] }),
      prisma.expense.findMany({
        where: {
          AND: [
            where,
            { category: { equals: "Labour", mode: "insensitive" } },
          ],
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          expenseCode: true,
          date: true,
          amount: true,
          vendor: true,
          paymentMode: true,
          reference: true,
          districtId: true,
          mandalId: true,
          status: true,
        },
      }),
    ]);
    const [districts, mandals] = await Promise.all([
      prisma.district.findMany({ select: { id: true, name: true } }),
      prisma.mandal.findMany({ select: { id: true, name: true } }),
    ]);
    const districtNames = new Map(districts.map((item) => [item.id, item.name]));
    const mandalNames = new Map(mandals.map((item) => [item.id, item.name]));
    const labourGroupMap = new Map<string, {
      vendor: string;
      amount: number;
      count: number;
      transactions: Array<Record<string, unknown>>;
    }>();
    for (const payment of labourPayments) {
      const vendorName = payment.vendor?.trim() || "Unassigned Labour Contractor";
      const key = vendorName.toLocaleLowerCase("en-IN");
      const group = labourGroupMap.get(key) ?? {
        vendor: vendorName,
        amount: 0,
        count: 0,
        transactions: [],
      };
      group.amount += payment.amount;
      group.count += 1;
      group.transactions.push({
        ...payment,
        districtName: payment.districtId ? districtNames.get(payment.districtId) ?? null : null,
        mandalName: payment.mandalId ? mandalNames.get(payment.mandalId) ?? null : null,
      });
      labourGroupMap.set(key, group);
    }
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
      labourGroups: [...labourGroupMap.values()].sort((a, b) => b.amount - a.amount),
    });
  },
  { feature: "expenses" },
);
