import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder, writeAudit, clientIp } from "@/lib/api";
import { nextCode } from "@/lib/sequence";
import { labourSchema } from "./schema";
const emptyToNull = (value?: string) => value || null;
export const GET = route(async ({ req }) => {
  const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
  const filters: Record<string, unknown>[] = [];
  if (q) filters.push({ OR: [{ name: { contains: q, mode: "insensitive" as const } }, { vendorCode: { contains: q, mode: "insensitive" as const } }, { trade: { contains: q, mode: "insensitive" as const } }] });
  for (const key of ["districtId", "mandalId", "projectId", "contractorId", "supervisorId"] as const) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) filters.push({ [key]: value });
  }
  const where = filters.length ? { AND: filters } : {};
  const [rows, total] = await Promise.all([prisma.labourVendor.findMany({ where, skip, take, orderBy: sortOrder(sort, dir, ["createdAt", "name", "vendorCode", "workerCount"], "name") }), prisma.labourVendor.count({ where })]);
  const ids = <T,>(fn: (r: typeof rows[number]) => T | null) => rows.flatMap((r) => { const value = fn(r); return value ? [value] : []; }) as string[];
  const [districts, mandals, projects, contractors, supervisors, entries] = await Promise.all([
    prisma.district.findMany({ where: { id: { in: ids((r) => r.districtId) } }, select: { id: true, name: true } }), prisma.mandal.findMany({ where: { id: { in: ids((r) => r.mandalId) } }, select: { id: true, name: true } }), prisma.project.findMany({ where: { id: { in: ids((r) => r.projectId) } }, select: { id: true, name: true } }), prisma.contractor.findMany({ where: { id: { in: ids((r) => r.contractorId) } }, select: { id: true, companyName: true } }), prisma.supervisor.findMany({ where: { id: { in: ids((r) => r.supervisorId) } }, select: { id: true, name: true } }), prisma.labourEntry.groupBy({ by: ["vendorId"], where: { vendorId: { in: rows.map((r) => r.id) } }, _count: true }),
  ]);
  const map = (a: { id: string; name: string }[]) => new Map(a.map((x) => [x.id, x.name])); const d = map(districts), m = map(mandals), p = map(projects), s = map(supervisors), c = new Map(contractors.map((x) => [x.id, x.companyName])), e = new Map(entries.map((x) => [x.vendorId, x._count]));
  return paginated(rows.map((r) => ({ ...r, entryCount: e.get(r.id) ?? 0, districtName: r.districtId ? d.get(r.districtId) : null, mandalName: r.mandalId ? m.get(r.mandalId) : null, projectName: r.projectId ? p.get(r.projectId) : null, contractorName: r.contractorId ? c.get(r.contractorId) : null, supervisorName: r.supervisorId ? s.get(r.supervisorId) : null })), total, page, pageSize);
}, { feature: "labour" });
export const POST = route(async ({ req, user }) => {
  const body = labourSchema.parse(await req.json()); const record = await prisma.labourVendor.create({ data: { vendorCode: await nextCode("LAB", "labour-vendor"), name: body.name, contactPhone: emptyToNull(body.contactPhone), trade: emptyToNull(body.trade), contractorId: emptyToNull(body.contractorId), districtId: emptyToNull(body.districtId), mandalId: emptyToNull(body.mandalId), projectId: emptyToNull(body.projectId), supervisorId: emptyToNull(body.supervisorId), workerCount: body.workerCount, rateType: emptyToNull(body.rateType) } });
  await writeAudit({ user, action: "CREATE", module: "labour", recordId: record.id, newValue: record, ip: clientIp(req) }); return NextResponse.json(record, { status: 201 });
}, { feature: "labour", write: true });
