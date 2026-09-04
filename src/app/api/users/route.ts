import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, HttpError, sortOrder } from "@/lib/api";

export const GET = route(
  async ({ req, user }) => {
    if (!["SUPER_ADMIN", "STATE_ADMIN"].includes(user.role)) {
      throw new HttpError(403, "User management is restricted");
    }
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [];
    if (q)
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { employeeId: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      });
    if (sp.get("role")) and.push({ role: sp.get("role") });
    if (sp.get("status")) and.push({ status: sp.get("status") });

    const where = and.length ? { AND: and } : {};
    const sortable = ["createdAt", "name", "role", "employeeId", "lastLoginAt"];
    const orderByClause = sortOrder(sort, dir, sortable, "name");

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        select: {
          id: true, employeeId: true, name: true, email: true, mobile: true,
          role: true, department: true, status: true, districtId: true,
          lastLoginAt: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const districtIds = [...new Set(rows.map((r) => r.districtId).filter(Boolean))] as string[];
    const districts = await prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, name: true },
    });
    const dMap = new Map(districts.map((d) => [d.id, d.name]));

    return paginated(
      rows.map((r) => ({ ...r, districtName: r.districtId ? dMap.get(r.districtId) : null })),
      total,
      page,
      pageSize,
    );
  },
  { feature: "users" },
);
