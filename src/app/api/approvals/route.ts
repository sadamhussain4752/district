import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, writeActivity, HttpError } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";
import { z } from "zod";

export const GET = route(
  async ({ req, user }) => {
    const status = req.nextUrl.searchParams.get("status") || "PENDING";
    const and: Record<string, unknown>[] = [{ status }];
    const scope = scopeFilter(user);
    if (Object.keys(scope).length) and.push(scope);

    const items = await prisma.approval.findMany({
      where: { AND: and },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });

    const grouped = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ items, counts: grouped });
  },
  { feature: "approvals" },
);

const decisionSchema = z.object({
  id: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().optional(),
});

export const PATCH = route(
  async ({ req, user }) => {
    const { id, decision, remarks } = decisionSchema.parse(await req.json());
    const approval = await prisma.approval.findUnique({ where: { id } });
    if (!approval) throw new HttpError(404, "Approval not found");
    if (approval.status !== "PENDING")
      throw new HttpError(409, "This request has already been decided");

    await prisma.approval.update({
      where: { id },
      data: {
        status: decision,
        decidedById: user.id,
        decidedAt: new Date(),
        remarks,
      },
    });

    // Apply side effect for beneficiary verification
    if (approval.type === "BENEFICIARY_VERIFICATION") {
      await prisma.beneficiary.update({
        where: { id: approval.entityId },
        data: { status: decision === "APPROVED" ? "VERIFIED" : "REJECTED" },
      });
    }

    await writeAudit({
      user,
      action: decision === "APPROVED" ? "APPROVE" : "REJECT",
      module: "approvals",
      recordId: approval.id,
      newValue: { decision },
      reason: remarks,
    });
    await writeActivity({
      user,
      verb: decision.toLowerCase(),
      summary: `${user.name} ${decision === "APPROVED" ? "approved" : "rejected"} ${approval.entityLabel ?? approval.type}`,
      districtId: approval.districtId,
      link: "/approvals",
    });

    return NextResponse.json({ ok: true });
  },
  { feature: "approvals", write: true },
);
