import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, clientIp, HttpError } from "@/lib/api";
import { supervisorSchema } from "../schema";

const emptyToNull = (value?: string) => value || null;
async function load(id: string) {
  const row = await prisma.supervisor.findUnique({ where: { id } }).catch(() => null);
  if (!row) throw new HttpError(404, "Supervisor not found");
  return row;
}
export const PATCH = route(async ({ params, req, user }) => {
  const before = await load(params.id); const body = supervisorSchema.parse(await req.json());
  const updated = await prisma.supervisor.update({ where: { id: before.id }, data: { ...body, mobile: emptyToNull(body.mobile), contractorId: emptyToNull(body.contractorId), districtId: emptyToNull(body.districtId), mandalId: emptyToNull(body.mandalId), projectId: emptyToNull(body.projectId) } });
  await writeAudit({ user, action: "UPDATE", module: "supervisors", recordId: updated.id, oldValue: before, newValue: updated, ip: clientIp(req) });
  return NextResponse.json(updated);
}, { feature: "supervisors", write: true });
export const DELETE = route(async ({ params, req, user }) => {
  const before = await load(params.id);
  const assigned = await prisma.house.count({ where: { supervisorId: before.id } });
  const labourVendors = await prisma.labourVendor.count({ where: { supervisorId: before.id } });
  if (assigned || labourVendors) throw new HttpError(409, `Cannot delete: assigned to ${assigned} site${assigned === 1 ? "" : "s"} and ${labourVendors} labour vendor${labourVendors === 1 ? "" : "s"}`);
  await prisma.supervisor.delete({ where: { id: before.id } });
  await writeAudit({ user, action: "DELETE", module: "supervisors", recordId: before.id, oldValue: before, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}, { feature: "supervisors", write: true });
