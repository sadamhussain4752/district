import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import { scopeFilter } from "./rbac";
import type { DashboardKpis, DistrictStat } from "./types";
import { clampPct } from "./utils";

export type DashboardFilter = {
  districtId?: string | null;
  fy?: string | null;
};

/** Combine RBAC geography scope with the UI district filter. */
function houseWhere(user: SessionUser, filter: DashboardFilter) {
  const and: Record<string, unknown>[] = [scopeFilter(user)];
  if (filter.districtId) and.push({ districtId: filter.districtId });
  return and.length ? { AND: and } : {};
}

function beneficiaryWhere(user: SessionUser, filter: DashboardFilter) {
  const and: Record<string, unknown>[] = [scopeFilter(user)];
  if (filter.districtId) and.push({ districtId: filter.districtId });
  if (filter.fy) and.push({ financialYear: filter.fy });
  return and.length ? { AND: and } : {};
}

export async function getDashboardKpis(
  user: SessionUser,
  filter: DashboardFilter,
): Promise<DashboardKpis> {
  const hWhere = houseWhere(user, filter);
  const bWhere = beneficiaryWhere(user, filter);

  const [
    totalApplications,
    totalBeneficiaries,
    verifiedBeneficiaries,
    approvedBeneficiaries,
    houseAgg,
    notStarted,
    underConstruction,
    completedHouses,
    startedHouses,
    delayedHouses,
    fundAgg,
    expenseAgg,
    pendingPaymentAgg,
    releasedPaymentAgg,
    stock,
    materials,
    projectBudgetAgg,
    cancelledCount,
  ] = await Promise.all([
    prisma.beneficiary.count({ where: bWhere }),
    prisma.beneficiary.count({ where: bWhere }),
    prisma.beneficiary.count({
      where: { AND: [bWhere, { status: { in: ["VERIFIED", "APPROVED", "HOUSE_ALLOTTED", "CONSTRUCTION_STARTED", "UNDER_CONSTRUCTION", "COMPLETED"] } }] },
    }),
    prisma.beneficiary.count({
      where: { AND: [bWhere, { status: { in: ["APPROVED", "HOUSE_ALLOTTED", "CONSTRUCTION_NOT_STARTED", "CONSTRUCTION_STARTED", "UNDER_CONSTRUCTION", "COMPLETED"] } }] },
    }),
    prisma.house.aggregate({
      where: hWhere,
      _sum: { estimatedCost: true, actualCost: true },
      _count: true,
      _avg: { progressPct: true },
    }),
    prisma.house.count({ where: { AND: [hWhere, { status: "NOT_STARTED" }] } }),
    prisma.house.count({
      where: { AND: [hWhere, { status: { in: ["IN_PROGRESS", "UNDER_CONSTRUCTION"] } }] },
    }),
    prisma.house.count({
      where: { AND: [hWhere, { status: { in: ["COMPLETED", "HANDED_OVER"] } }] },
    }),
    prisma.house.count({
      where: { AND: [hWhere, { status: { notIn: ["NOT_STARTED"] } }] },
    }),
    prisma.house.count({
      where: {
        AND: [hWhere, { scheduleHealth: { in: ["DELAYED", "CRITICAL"] } }],
      },
    }),
    prisma.governmentFund.aggregate({
      where: filter.districtId ? { districtId: filter.districtId } : {},
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        AND: [
          filter.districtId ? { districtId: filter.districtId } : {},
          { status: { in: ["ACCOUNTS_APPROVED", "PAID"] } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.beneficiaryPayment.aggregate({
      where: { status: { in: ["ELIGIBLE", "SUBMITTED", "VERIFICATION", "APPROVED", "PROCESSING"] } },
      _sum: { eligibleAmount: true },
    }),
    prisma.beneficiaryPayment.aggregate({
      where: { status: "PAID" },
      _sum: { releasedAmount: true },
    }),
    prisma.inventoryStock.findMany({
      select: { quantity: true, material: { select: { standardRate: true, reorderLevel: true } } },
    }),
    prisma.material.count(),
    prisma.project.aggregate({
      where: filter.districtId ? { districtId: filter.districtId } : {},
      _sum: { approvedBudget: true },
    }),
    prisma.beneficiary.count({
      where: { AND: [bWhere, { status: { in: ["CANCELLED", "REJECTED", "ON_HOLD"] } }] },
    }),
  ]);

  const inventoryValue = stock.reduce(
    (a, s) => a + s.quantity * (s.material?.standardRate ?? 0),
    0,
  );
  const lowStockItems = stock.filter(
    (s) => s.quantity <= (s.material?.reorderLevel ?? 0),
  ).length;

  const fundsReceived = fundAgg._sum.amount ?? 0;
  // Total expenditure = approved site expenses + capitalised construction cost booked against houses
  const totalExpenditure =
    (expenseAgg._sum.amount ?? 0) + (houseAgg._sum.actualCost ?? 0);
  const amountReleased = releasedPaymentAgg._sum.releasedAmount ?? 0;
  const totalProjectValue =
    (projectBudgetAgg._sum.approvedBudget ?? 0) || (houseAgg._sum.estimatedCost ?? 0);

  return {
    totalApplications,
    totalBeneficiaries,
    verifiedBeneficiaries,
    approvedHouses: approvedBeneficiaries,
    constructionStarted: startedHouses,
    notStarted,
    underConstruction,
    completedHouses,
    delayedHouses,
    cancelledCount,
    totalProjectValue,
    fundsReceived,
    amountReleased,
    totalExpenditure,
    pendingPayments: pendingPaymentAgg._sum.eligibleAmount ?? 0,
    inventoryValue,
    lowStockItems,
    availableBalance: fundsReceived - totalExpenditure,
    overallCompletionPct: clampPct(houseAgg._avg.progressPct ?? 0),
  };
}

export async function getDistrictStats(
  user: SessionUser,
): Promise<DistrictStat[]> {
  const scope = scopeFilter(user);
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, geoKey: true },
  });

  const results: DistrictStat[] = [];
  for (const d of districts) {
    const baseWhere = { AND: [scope, { districtId: d.id }] };
    const [
      applications,
      approved,
      houseAgg,
      notStarted,
      underConstruction,
      completed,
      started,
      delayed,
    ] = await Promise.all([
      prisma.beneficiary.count({ where: { districtId: d.id } }),
      prisma.beneficiary.count({
        where: {
          districtId: d.id,
          status: { in: ["APPROVED", "HOUSE_ALLOTTED", "CONSTRUCTION_NOT_STARTED", "CONSTRUCTION_STARTED", "UNDER_CONSTRUCTION", "COMPLETED"] },
        },
      }),
      prisma.house.aggregate({
        where: { districtId: d.id },
        _sum: { estimatedCost: true, actualCost: true },
        _avg: { progressPct: true },
        _count: true,
      }),
      prisma.house.count({ where: { districtId: d.id, status: "NOT_STARTED" } }),
      prisma.house.count({
        where: { districtId: d.id, status: { in: ["IN_PROGRESS", "UNDER_CONSTRUCTION"] } },
      }),
      prisma.house.count({
        where: { districtId: d.id, status: { in: ["COMPLETED", "HANDED_OVER"] } },
      }),
      prisma.house.count({
        where: { districtId: d.id, status: { not: "NOT_STARTED" } },
      }),
      prisma.house.count({
        where: { districtId: d.id, scheduleHealth: { in: ["DELAYED", "CRITICAL"] } },
      }),
    ]);
    void baseWhere;

    results.push({
      id: d.id,
      name: d.name,
      geoKey: d.geoKey,
      applications,
      approved,
      started,
      underConstruction,
      completed,
      notStarted,
      delayed,
      projectValue: houseAgg._sum.estimatedCost ?? 0,
      spent: houseAgg._sum.actualCost ?? 0,
      completionPct: clampPct(houseAgg._avg.progressPct ?? 0),
    });
  }
  return results;
}
