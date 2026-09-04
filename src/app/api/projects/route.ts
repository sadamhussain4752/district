import { prisma } from "@/lib/prisma";
import {
  route, parsePagination, paginated, writeAudit, writeActivity, clientIp, sortOrder,
} from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";
import { projectCreateSchema } from "@/lib/validators";
import { nextProjectCode } from "@/lib/sequence";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;
    const and: Record<string, unknown>[] = [scopeFilter(user)];
    if (q)
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      });
    if (sp.get("districtId")) and.push({ districtId: sp.get("districtId") });
    if (sp.get("status")) and.push({ status: sp.get("status") });
    if (sp.get("fy")) and.push({ financialYear: sp.get("fy") });

    const where = { AND: and };
    const sortable = ["createdAt", "name", "code", "progressPct", "approvedBudget"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.project.findMany({ where, orderBy: orderByClause, skip, take }),
      prisma.project.count({ where }),
    ]);

    const districtIds = [...new Set(rows.map((r) => r.districtId))];
    const districts = await prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, name: true },
    });
    const dMap = new Map(districts.map((d) => [d.id, d.name]));

    const houseCounts = await prisma.house.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: rows.map((r) => r.id) } },
      _count: true,
    });

    const withMeta = rows.map((r) => {
      const hc = houseCounts.filter((h) => h.projectId === r.id);
      const completed = hc
        .filter((h) => ["COMPLETED", "HANDED_OVER"].includes(h.status))
        .reduce((a, h) => a + h._count, 0);
      const total = hc.reduce((a, h) => a + h._count, 0);
      return {
        ...r,
        districtName: dMap.get(r.districtId) ?? "—",
        houseCount: total,
        completedHouses: completed,
      };
    });

    return paginated(withMeta, total, page, pageSize);
  },
  { feature: "projects" },
);

export const POST = route(
  async ({ req, user }) => {
    const input = projectCreateSchema.parse(await req.json());
    const district = await prisma.district.findUniqueOrThrow({
      where: { id: input.districtId },
    });
    const code = await nextProjectCode(district.code);

    const project = await prisma.project.create({
      data: {
        code,
        name: input.name,
        stateId: district.stateId,
        districtId: input.districtId,
        mandalId: input.mandalId || null,
        villageId: input.villageId || null,
        financialYear: input.financialYear,
        plannedHouses: input.plannedHouses,
        approvedBudget: input.approvedBudget,
        startDate: input.startDate ? new Date(input.startDate) : null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        projectManagerId: input.projectManagerId || null,
        contractorId: input.contractorId || null,
        status: "ACTIVE",
        createdBy: user.id,
      },
    });

    await writeAudit({
      user, action: "CREATE", module: "projects", recordId: project.id,
      newValue: { name: project.name }, ip: clientIp(req),
    });
    await writeActivity({
      user, verb: "created",
      summary: `Created project ${project.name} (${project.code})`,
      districtId: project.districtId, link: `/projects/${project.id}`,
    });

    return Response.json({ id: project.id }, { status: 201 });
  },
  { feature: "projects", write: true },
);
