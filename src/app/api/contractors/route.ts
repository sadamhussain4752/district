import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder } from "@/lib/api";

export const GET = route(
  async ({ req }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const where = q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" as const } },
            { contractorCode: { contains: q, mode: "insensitive" as const } },
            { gstin: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const sortable = ["createdAt", "companyName", "contractValue", "performanceScore", "qualityScore"];
    const orderByClause = sortOrder(sort, dir, sortable, "companyName");

    const [rows, total] = await Promise.all([
      prisma.contractor.findMany({ where, orderBy: orderByClause, skip, take }),
      prisma.contractor.count({ where }),
    ]);

    const withStats = await Promise.all(
      rows.map(async (c) => {
        const [houses, completed, billAgg] = await Promise.all([
          prisma.house.count({ where: { contractorId: c.id } }),
          prisma.house.count({
            where: { contractorId: c.id, status: { in: ["COMPLETED", "HANDED_OVER"] } },
          }),
          prisma.contractorBill.aggregate({
            where: { contractorId: c.id },
            _sum: { netPayable: true },
          }),
        ]);
        return {
          ...c,
          assignedHouses: houses,
          completedHouses: completed,
          billedAmount: billAgg._sum.netPayable ?? 0,
        };
      }),
    );

    return paginated(withStats, total, page, pageSize);
  },
  { feature: "contractors" },
);
