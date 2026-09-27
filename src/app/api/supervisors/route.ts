import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder, writeAudit, clientIp } from "@/lib/api";
import { nextCode } from "@/lib/sequence";
import { supervisorSchema } from "./schema";

const emptyToNull = (value?: string) => value || null;

export const GET = route(async ({ req }) => {
  const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
  const filters: Record<string, unknown>[] = [];
  if (q) filters.push({ OR: [
    { name: { contains: q, mode: "insensitive" as const } },
    { supervisorCode: { contains: q, mode: "insensitive" as const } },
    { mobile: { contains: q, mode: "insensitive" as const } },
  ] });
  for (const key of ["districtId", "mandalId", "projectId", "contractorId"] as const) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) filters.push({ [key]: value });
  }
  const where = filters.length ? { AND: filters } : {};
  const [rows, total] = await Promise.all([
    prisma.supervisor.findMany({ where, skip, take, orderBy: sortOrder(sort, dir, ["createdAt", "name", "supervisorCode", "activeSites"], "name") }),
    prisma.supervisor.count({ where }),
  ]);
  const districtIds = rows.flatMap((r) => r.districtId ? [r.districtId] : []);
  const mandalIds = rows.flatMap((r) => r.mandalId ? [r.mandalId] : []);
  const projectIds = rows.flatMap((r) => r.projectId ? [r.projectId] : []);
  const contractorIds = rows.flatMap((r) => r.contractorId ? [r.contractorId] : []);
  const [districts, mandals, projects, contractors, siteCounts] = await Promise.all([
    prisma.district.findMany({ where: { id: { in: districtIds } }, select: { id: true, name: true } }),
    prisma.mandal.findMany({ where: { id: { in: mandalIds } }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } }),
    prisma.contractor.findMany({ where: { id: { in: contractorIds } }, select: { id: true, companyName: true } }),
    prisma.house.groupBy({ by: ["supervisorId"], where: { supervisorId: { in: rows.map((r) => r.id) } }, _count: true }),
  ]);
  const map = (items: { id: string; name: string }[]) => new Map(items.map((x) => [x.id, x.name]));
  const d = map(districts), m = map(mandals), p = map(projects);
  const c = new Map(contractors.map((x) => [x.id, x.companyName]));
  const sites = new Map(siteCounts.map((x) => [x.supervisorId, x._count]));
  return paginated(rows.map((r) => ({ ...r, activeSites: sites.get(r.id) ?? 0, districtName: r.districtId ? d.get(r.districtId) : null, mandalName: r.mandalId ? m.get(r.mandalId) : null, projectName: r.projectId ? p.get(r.projectId) : null, contractorName: r.contractorId ? c.get(r.contractorId) : null })), total, page, pageSize);
}, { feature: "supervisors" });

export const POST = route(async ({ req, user }) => {
  const body = supervisorSchema.parse(await req.json());
  const record = await prisma.supervisor.create({ data: {
    supervisorCode: await nextCode("SUP", "supervisor"), name: body.name, mobile: emptyToNull(body.mobile),
    contractorId: emptyToNull(body.contractorId), districtId: emptyToNull(body.districtId), mandalId: emptyToNull(body.mandalId), projectId: emptyToNull(body.projectId),
  } });
  await writeAudit({ user, action: "CREATE", module: "supervisors", recordId: record.id, newValue: record, ip: clientIp(req) });
  return NextResponse.json(record, { status: 201 });
}, { feature: "supervisors", write: true });
