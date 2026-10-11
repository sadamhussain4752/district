import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, clientIp, HttpError } from "@/lib/api";

const counts = {
  augerCount: z.coerce.number().int().min(0).default(0),
  blCount: z.coerce.number().int().min(0).default(0),
  rlCount: z.coerce.number().int().min(0).default(0),
  rcCount: z.coerce.number().int().min(0).default(0),
  compCount: z.coerce.number().int().min(0).default(0),
};

/** Edit a mandal row, the contractor's payment figures, or both. */
const schema = z.object({
  claim: z.object({ id: z.string().optional(), mandalName: z.string().trim().min(1).max(80), ...counts }).optional(),
  deleteClaimId: z.string().optional(),
  payment: z
    .object({
      claimAmount: z.coerce.number().min(0),
      tdsAmount: z.coerce.number().min(0),
      netPayable: z.coerce.number().min(0),
      paidAmount: z.coerce.number().min(0),
      balanceAmount: z.coerce.number().min(0).optional(),
    })
    .optional(),
});

async function load(id: string) {
  const vendor = await prisma.labourVendor.findUnique({ where: { id } }).catch(() => null);
  if (!vendor) throw new HttpError(404, "Labour contractor not found");
  return vendor;
}

export const PATCH = route(
  async ({ params, req, user }) => {
    const before = await load(params.id);
    const body = schema.parse(await req.json());

    if (body.deleteClaimId) {
      await prisma.labourMandalClaim.deleteMany({
        where: { id: body.deleteClaimId, vendorId: before.id },
      });
    }

    if (body.claim) {
      const { id, ...data } = body.claim;
      const mandal = await prisma.mandal.findFirst({
        where: { name: { equals: data.mandalName, mode: "insensitive" } },
        select: { id: true },
      });
      if (id) {
        const existing = await prisma.labourMandalClaim.findFirst({ where: { id, vendorId: before.id } });
        if (!existing) throw new HttpError(404, "Mandal row not found for this contractor");
        await prisma.labourMandalClaim.update({ where: { id }, data: { ...data, mandalId: mandal?.id ?? null } });
      } else {
        await prisma.labourMandalClaim.create({
          data: { ...data, vendorId: before.id, mandalId: mandal?.id ?? null },
        });
      }
    }

    if (body.payment) {
      const { paidAmount, netPayable } = body.payment;
      if (paidAmount > netPayable) throw new HttpError(422, "Paid amount cannot exceed net payable");
    }

    // Stage totals always follow the mandal rows; balance follows net payable − paid.
    const claims = await prisma.labourMandalClaim.findMany({ where: { vendorId: before.id } });
    const sum = (f: "augerCount" | "blCount" | "rlCount" | "rcCount" | "compCount") =>
      claims.reduce((a, c) => a + c[f], 0);
    const payment = body.payment
      ? {
          ...body.payment,
          balanceAmount: body.payment.balanceAmount ?? Math.max(0, body.payment.netPayable - body.payment.paidAmount),
        }
      : {};

    const updated = await prisma.labourVendor.update({
      where: { id: before.id },
      data: {
        augerCount: sum("augerCount"), blCount: sum("blCount"), rlCount: sum("rlCount"),
        rcCount: sum("rcCount"), compCount: sum("compCount"),
        ...payment,
      },
    });

    await writeAudit({
      user, action: "UPDATE", module: "labour-payment-chart", recordId: updated.name,
      oldValue: before, newValue: updated, ip: clientIp(req),
    });
    return NextResponse.json(updated);
  },
  { feature: "labour", write: true },
);
