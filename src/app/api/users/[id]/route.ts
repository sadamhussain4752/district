import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError, route, writeAudit, clientIp } from "@/lib/api";
import { allowedFeatures, type FeatureKey } from "@/lib/rbac";

const ROLES = ["SUPER_ADMIN", "STATE_ADMIN", "SITE_ENGINEER", "ACCOUNTS", "AUDITOR"] as const;
const STATUSES = ["ACTIVE", "DISABLED", "INVITED"] as const;
const FEATURES: FeatureKey[] = ["dashboard", "command-center", "executive-mis", "map", "beneficiaries", "projects", "construction", "daily-progress", "contractors", "supervisors", "labour", "inventory", "material-requests", "purchases", "expenses", "funds", "payments", "quality", "issues", "approvals", "reports", "documents", "users", "audit", "settings"];
const schema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  mobile: z.string().trim().optional(),
  department: z.string().trim().optional(),
  role: z.enum(ROLES),
  status: z.enum(STATUSES),
  access: z.array(z.enum(FEATURES as [FeatureKey, ...FeatureKey[]])),
  sensitiveView: z.boolean().default(false),
});

export const PATCH = route(async ({ req, user, params }) => {
  if (user.role !== "SUPER_ADMIN") throw new HttpError(403, "Only a Super Admin can change user access");
  const body = schema.parse(await req.json());
  if (params.id === user.id && (body.status !== "ACTIVE" || !body.access.includes("users"))) {
    throw new HttpError(422, "You cannot disable your own account or remove your own user-management access");
  }
  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "User not found");
  const emailOwner = await prisma.user.findFirst({ where: { email: body.email, id: { not: params.id } }, select: { id: true } });
  if (emailOwner) throw new HttpError(409, "That email address is already assigned to another user");
  const defaults = allowedFeatures(body.role);
  const selected = new Set(body.access);
  const permissions = FEATURES.flatMap((feature) => {
    const differs = defaults.has(feature) !== selected.has(feature);
    return differs ? [`feature:${selected.has(feature) ? "+" : "-"}${feature}`] : [];
  });
  if (body.sensitiveView) permissions.push("sensitive:view");
  const updated = await prisma.user.update({ where: { id: params.id }, data: {
    name: body.name, email: body.email, mobile: body.mobile || null, department: body.department || null,
    role: body.role, status: body.status, permissions, failedLogins: 0, lockedUntil: null,
  } });
  await prisma.refreshToken.deleteMany({ where: { userId: updated.id } });
  await writeAudit({ user, action: "UPDATE", module: "users", recordId: updated.id, oldValue: existing, newValue: updated, ip: clientIp(req) });
  return NextResponse.json({ id: updated.id, role: updated.role, status: updated.status, permissions: updated.permissions });
}, { feature: "users", write: true });

export const DELETE = route(async ({ req, user, params }) => {
  if (user.role !== "SUPER_ADMIN") throw new HttpError(403, "Only a Super Admin can delete users");
  if (params.id === user.id) throw new HttpError(422, "You cannot delete your own account");
  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "User not found");
  if (existing.role === "SUPER_ADMIN" && existing.status === "ACTIVE") {
    const activeSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
    if (activeSuperAdmins <= 1) throw new HttpError(422, "The last active Super Admin cannot be deleted");
  }
  await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
  await prisma.user.delete({ where: { id: existing.id } });
  await writeAudit({ user, action: "DELETE", module: "users", recordId: existing.id, oldValue: existing, ip: clientIp(req) });
  return NextResponse.json({ ok: true });
}, { feature: "users", write: true });
