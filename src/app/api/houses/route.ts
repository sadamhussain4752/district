import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;

    const and: Record<string, unknown>[] = [scopeFilter(user)];
    if (q) and.push({ houseCode: { contains: q, mode: "insensitive" } });
    for (const key of ["districtId", "mandalId", "projectId", "contractorId", "status"] as const) {
      const v = sp.get(key);
      if (v) and.push({ [key]: v });
    }
    const health = sp.get("health");
    if (health === "delayed") and.push({ scheduleHealth: { in: ["DELAYED", "CRITICAL"] } });
    if (health === "at-risk") and.push({ scheduleHealth: "AT_RISK" });

    const where = { AND: and };
    const sortable = ["createdAt", "houseCode", "progressPct", "status", "healthScore"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.house.findMany({
        where, orderBy: orderByClause, skip, take,
        select: {
          id: true, houseCode: true, progressPct: true, status: true,
          scheduleHealth: true, healthScore: true, currentStageName: true,
          plannedCompletion: true, estimatedCost: true, actualCost: true,
          beneficiary: { select: { name: true, beneficiaryCode: true } },
          district: { select: { name: true } },
          mandal: { select: { name: true } },
        },
      }),
      prisma.house.count({ where }),
    ]);

    return paginated(rows, total, page, pageSize);
  },
  { feature: "construction" },
);
