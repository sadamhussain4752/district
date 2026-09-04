import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [scopeFilter(user)];
    if (q) and.push({ OR: [{ issueCode: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] });
    if (sp.get("status")) and.push({ status: sp.get("status") });
    if (sp.get("priority")) and.push({ priority: sp.get("priority") });
    if (sp.get("districtId")) and.push({ districtId: sp.get("districtId") });

    const where = { AND: and };
    const sortable = ["createdAt", "priority", "status", "dueDate"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.issue.findMany({ where, orderBy: orderByClause, skip, take }),
      prisma.issue.count({ where }),
    ]);
    return paginated(rows, total, page, pageSize);
  },
  { feature: "issues" },
);
