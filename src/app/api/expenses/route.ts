import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder } from "@/lib/api";

export const GET = route(
  async ({ req }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [];
    if (q) and.push({ OR: [{ expenseCode: { contains: q, mode: "insensitive" } }, { vendor: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] });
    if (sp.get("status")) and.push({ status: sp.get("status") });
    if (sp.get("districtId")) and.push({ districtId: sp.get("districtId") });
    if (sp.get("category")) and.push({ category: sp.get("category") });

    const where = and.length ? { AND: and } : {};
    const sortable = ["date", "amount", "status", "createdAt"];
    const orderByClause = sortOrder(sort, dir, sortable, "date");

    const [rows, total, agg] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: orderByClause, skip, take }),
      prisma.expense.count({ where }),
      prisma.expense.groupBy({ by: ["status"], where, _sum: { amount: true }, _count: true }),
    ]);
    return paginated(
      rows.map((r) => ({ ...r, summary: agg })),
      total,
      page,
      pageSize,
    );
  },
  { feature: "expenses" },
);
