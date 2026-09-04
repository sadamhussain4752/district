import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, writeActivity, clientIp, HttpError } from "@/lib/api";
import { canViewSensitive } from "@/lib/rbac";
import { maskAadhaar, maskAccount } from "@/lib/utils";
import { beneficiaryUpdateSchema } from "@/lib/validators";
import { maybeCreateHouse } from "@/lib/beneficiary";

export const GET = route(
  async ({ params, user }) => {
    const b = await prisma.beneficiary.findUnique({
      where: { id: params.id },
      include: {
        district: true,
        mandal: true,
        village: true,
        house: {
          include: {
            stageProgress: { orderBy: { sequence: "asc" } },
            photos: { orderBy: { createdAt: "desc" }, take: 12 },
          },
        },
      },
    });
    if (!b) throw new HttpError(404, "Beneficiary not found");

    const sensitive = canViewSensitive(user);
    if (sensitive) {
      await writeAudit({
        user, action: "SENSITIVE_VIEW", module: "beneficiaries", recordId: b.id,
      });
    }

    const [payments, documents, contractor, pm] = await Promise.all([
      prisma.beneficiaryPayment.findMany({
        where: { beneficiaryId: b.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.document.findMany({
        where: { entity: "BENEFICIARY", entityId: b.id },
        orderBy: { createdAt: "desc" },
      }),
      b.contractorId
        ? prisma.contractor.findUnique({ where: { id: b.contractorId } })
        : null,
      b.projectManagerId
        ? prisma.user.findUnique({
            where: { id: b.projectManagerId },
            select: { id: true, name: true, mobile: true },
          })
        : null,
    ]);

    return NextResponse.json({
      ...b,
      aadhaar: sensitive ? undefined : undefined,
      aadhaarDisplay: sensitive
        ? b.aadhaarLast4
          ? `XXXX XXXX ${b.aadhaarLast4}`
          : "—"
        : maskAadhaar(b.aadhaarLast4),
      bankAccountDisplay: sensitive
        ? b.bankAccountEnc ?? "—"
        : maskAccount(b.bankAccountLast4),
      canViewSensitive: sensitive,
      payments,
      documents,
      contractor,
      projectManager: pm,
    });
  },
  { feature: "beneficiaries" },
);

export const PATCH = route(
  async ({ params, req, user }) => {
    const body = await req.json();
    const input = beneficiaryUpdateSchema.parse(body);

    const before = await prisma.beneficiary.findUnique({ where: { id: params.id } });
    if (!before) throw new HttpError(404, "Beneficiary not found");

    const data: Record<string, unknown> = { ...input, updatedBy: user.id };
    delete data.aadhaar;
    if (input.dob) data.dob = new Date(input.dob);
    if (input.sanctionDate) data.sanctionDate = new Date(input.sanctionDate);

    const updated = await prisma.beneficiary.update({
      where: { id: params.id },
      data,
    });

    if (input.status && input.status !== before.status) {
      await maybeCreateHouse(updated.id, input.status);
      await writeAudit({
        user, action: "UPDATE", module: "beneficiaries", recordId: updated.id,
        oldValue: { status: before.status }, newValue: { status: input.status },
        ip: clientIp(req),
      });
      await writeActivity({
        user, verb: "updated",
        summary: `Beneficiary ${updated.name} moved to ${input.status.replace(/_/g, " ").toLowerCase()}`,
        districtId: updated.districtId,
        link: `/beneficiaries/${updated.id}`,
      });
    }

    return NextResponse.json({ ok: true });
  },
  { feature: "beneficiaries", write: true },
);
