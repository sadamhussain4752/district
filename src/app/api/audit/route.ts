import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder, HttpError } from "@/lib/api";

export const GET = route(
  async ({ req, user }) => {
    if (!["SUPER_ADMIN", "STATE_ADMIN", "AUDITOR"].includes(user.role)) {
      throw new HttpError(403, "Audit logs are restricted");
    }
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [];
    if (q) and.push({ OR: [{ module: { contains: q, mode: "insensitive" } }, { userName: { contains: q, mode: "insensitive" } }] });
    if (sp.get("module")) and.push({ module: sp.get("module") });
    if (sp.get("action")) and.push({ action: sp.get("action") });

    const where = and.length ? { AND: and } : {};
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: sortOrder(sort, dir, ["createdAt", "action", "module", "userName"]),
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return paginated(rows, total, page, pageSize);
  },
  { feature: "audit" },
);
