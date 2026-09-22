import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";
import { BENEFICIARY_STATUS_LABELS, HOUSE_STATUS_LABELS } from "@/lib/constants";
import { healthBand } from "@/lib/progress";

export const GET = route(
  async ({ user, req }) => {
    const districtId = req.nextUrl.searchParams.get("districtId");
    const scope = scopeFilter(user);
    const hWhere = districtId ? { AND: [scope, { districtId }] } : scope;
    const bWhere = districtId ? { AND: [scope, { districtId }] } : scope;

    const [
      benStatuses,
      houseStatuses,
      houses,
      expenses,
      stock,
      dprs,
    ] = await Promise.all([
      prisma.beneficiary.groupBy({ by: ["status"], where: bWhere, _count: true }),
      prisma.house.groupBy({ by: ["status"], where: hWhere, _count: true }),
      prisma.house.findMany({
        where: hWhere,
        select: {
          id: true, houseCode: true, progressPct: true, healthScore: true,
          scheduleHealth: true, currentStageName: true, actualCompletion: true,
          plannedCompletion: true, districtId: true,
        },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { AND: [districtId ? { districtId } : {}, { status: { in: ["ACCOUNTS_APPROVED", "PAID"] } }] },
        _sum: { amount: true },
      }),
      prisma.inventoryStock.findMany({
        select: {
          quantity: true,
          material: { select: { name: true, unit: true, reorderLevel: true } },
        },
      }),
      prisma.dailyProgressReport.findMany({
        where: districtId ? { districtId } : {},
        select: { date: true, pctToday: true },
        orderBy: { date: "asc" },
      }),
    ]);

    const beneficiaryStatus = benStatuses.map((s) => ({
      name: BENEFICIARY_STATUS_LABELS[s.status] ?? s.status,
      value: s._count,
    }));
    const constructionStatus = houseStatuses.map((s) => ({
      name: HOUSE_STATUS_LABELS[s.status] ?? s.status,
      value: s._count,
    }));

    // Monthly construction completions
    const monthly = new Map<string, { completed: number; dprPct: number; dprN: number }>();
    for (const h of houses) {
      if (h.actualCompletion) {
        const k = h.actualCompletion.toISOString().slice(0, 7);
        const m = monthly.get(k) ?? { completed: 0, dprPct: 0, dprN: 0 };
        m.completed += 1;
        monthly.set(k, m);
      }
    }
    for (const d of dprs) {
      const k = d.date.toISOString().slice(0, 7);
      const m = monthly.get(k) ?? { completed: 0, dprPct: 0, dprN: 0 };
      m.dprPct += d.pctToday;
      m.dprN += 1;
      monthly.set(k, m);
    }
    const monthlyProgress = [...monthly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, v]) => ({
        month,
        completed: v.completed,
        avgDailyProgress: v.dprN ? Math.round((v.dprPct / v.dprN) * 10) / 10 : 0,
      }));

    // Categories come from the imported ledger, so rank them and fold the tail into "Others".
    const rankedExpenses = expenses
      .map((e) => ({ name: e.category, value: e._sum.amount ?? 0 }))
      .filter((e) => e.value > 0)
      .sort((a, b) => b.value - a.value);
    const expenseCategories = rankedExpenses.length > 8
      ? [...rankedExpenses.slice(0, 7), { name: "Others", value: rankedExpenses.slice(7).reduce((a, e) => a + e.value, 0) }]
      : rankedExpenses;

    const materialAlerts = stock
      .filter((s) => s.quantity <= (s.material?.reorderLevel ?? 0))
      .map((s) => ({
        name: s.material?.name ?? "—",
        quantity: s.quantity,
        unit: s.material?.unit ?? "",
        reorderLevel: s.material?.reorderLevel ?? 0,
        severity:
          s.quantity <= (s.material?.reorderLevel ?? 0) * 0.4
            ? "critical"
            : "low",
      }))
      .sort((a, b) => a.quantity / (a.reorderLevel || 1) - b.quantity / (b.reorderLevel || 1))
      .slice(0, 8);

    const topDelayed = houses
      .filter((h) => ["DELAYED", "CRITICAL"].includes(h.scheduleHealth))
      .sort((a, b) => a.progressPct - b.progressPct)
      .slice(0, 8)
      .map((h) => ({
        id: h.id,
        houseCode: h.houseCode,
        progressPct: h.progressPct,
        stage: h.currentStageName,
        health: h.scheduleHealth,
      }));

    const bands = { HEALTHY: 0, ATTENTION: 0, CRITICAL: 0 };
    for (const h of houses) bands[healthBand(h.healthScore)] += 1;

    return NextResponse.json({
      beneficiaryStatus,
      constructionStatus,
      monthlyProgress,
      expenseCategories,
      materialAlerts,
      topDelayed,
      projectHealth: [
        { name: "Healthy", value: bands.HEALTHY },
        { name: "Attention Required", value: bands.ATTENTION },
        { name: "Critical", value: bands.CRITICAL },
      ],
    });
  },
  { feature: "dashboard" },
);
