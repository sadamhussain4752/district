import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [scopeFilter(user)];
    if (sp.get("districtId")) and.push({ districtId: sp.get("districtId") });
    if (sp.get("houseId")) and.push({ houseId: sp.get("houseId") });

    const where = { AND: and };
    const [rows, total] = await Promise.all([
      prisma.dailyProgressReport.findMany({
        where,
        orderBy: { date: dir },
        skip,
        take,
      }),
      prisma.dailyProgressReport.count({ where }),
    ]);

    const houseIds = [...new Set(rows.map((r) => r.houseId).filter(Boolean))] as string[];
    const houses = await prisma.house.findMany({
      where: { id: { in: houseIds } },
      select: { id: true, houseCode: true },
    });
    const hMap = new Map(houses.map((h) => [h.id, h.houseCode]));

    return paginated(
      rows.map((r) => ({ ...r, houseCode: r.houseId ? hMap.get(r.houseId) : null })),
      total,
      page,
      pageSize,
    );
  },
  { feature: "daily-progress" },
);
