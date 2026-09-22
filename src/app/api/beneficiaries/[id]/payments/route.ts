import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, writeActivity, clientIp, HttpError } from "@/lib/api";
import { isReadOnly } from "@/lib/rbac";
import { CONSTRUCTION_STAGES } from "@/lib/constants";

const WEIGHT = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.weight]));
const TOTAL_WEIGHT = CONSTRUCTION_STAGES.reduce((a, s) => a + s.weight, 0);

const schema = z.object({
  paymentId: z.string().min(1),
  paidOn: z.string().min(1), // YYYY-MM-DD
  txnRef: z.string().optional(),
  bankName: z.string().optional(),
  paymentMode: z.string().optional(),
  reverse: z.boolean().optional(), // undo a release
});

/**
 * Record (or reverse) the release of a beneficiary payment milestone.
 * On release: releasedAmount = eligibleAmount, status = PAID, paymentDate = paidOn.
 */
export const PATCH = route(
  async ({ params, req, user }) => {
    if (isReadOnly(user.role)) throw new HttpError(403, "Read-only role");
    const body = schema.parse(await req.json());

    const payment = await prisma.beneficiaryPayment.findFirst({
      where: { id: body.paymentId, beneficiaryId: params.id },
      include: { beneficiary: { select: { name: true, districtId: true } } },
    });
    if (!payment) throw new HttpError(404, "Payment milestone not found");

    const before = {
      status: payment.status,
      releasedAmount: payment.releasedAmount,
      paymentDate: payment.paymentDate,
    };

    let updated;
    const STAGE_FOR: Record<string, string> = {
      FOUNDATION: "BL",
      PLINTH: "RL",
      ROOF: "RC",
      COMPLETION: "COMP",
    };

    if (body.reverse) {
      updated = await prisma.beneficiaryPayment.update({
        where: { id: payment.id },
        data: {
          releasedAmount: 0,
          status: "ELIGIBLE",
          paymentDate: null,
          txnRef: null,
        },
      });
      if (payment.houseId && STAGE_FOR[payment.milestone]) {
        await prisma.houseStageProgress.updateMany({
          where: { houseId: payment.houseId, stageKey: STAGE_FOR[payment.milestone] },
          data: {
            receivedAmount: 0,
            balanceAmount: payment.eligibleAmount,
            status: "PENDING_VERIFICATION",
            paymentDate: null,
            utrNumber: null,
            onlineStatus: "MD-Approve Payment not Done",
            mdDate: null,
          },
        });
      }
    } else {
      const paidOn = new Date(body.paidOn);
      if (Number.isNaN(paidOn.getTime()))
        throw new HttpError(422, "Invalid paid-on date");
      updated = await prisma.beneficiaryPayment.update({
        where: { id: payment.id },
        data: {
          releasedAmount: payment.eligibleAmount,
          status: "PAID",
          paymentDate: paidOn,
          txnRef: body.txnRef?.trim() || payment.txnRef,
          bankName: body.bankName?.trim() || payment.bankName,
        },
      });

      // keep the matching stage-progress row in sync
      if (payment.houseId) {
        const stageKey = STAGE_FOR[payment.milestone];
        if (stageKey) {
          await prisma.houseStageProgress.updateMany({
            where: { houseId: payment.houseId, stageKey },
            data: {
              receivedAmount: payment.eligibleAmount,
              balanceAmount: 0,
              status: "COMPLETED",
              approvalStatus: "APPROVED",
              paymentDate: paidOn,
              paymentMode: body.paymentMode?.trim() || undefined,
              utrNumber: body.txnRef?.trim() || undefined,
              onlineStatus: "MD-Approve Payment Done",
              mdDate: paidOn,
            },
          });
        }
      }
    }

    // roll up house.actualCost + progress from stage rows
    if (payment.houseId) {
      const stages = await prisma.houseStageProgress.findMany({
        where: { houseId: payment.houseId },
        select: { stageKey: true, status: true, receivedAmount: true },
      });
      const actualCost = stages.reduce((a, s) => a + (s.receivedAmount ?? 0), 0);
      const wDone = stages
        .filter((s) => ["COMPLETED", "VERIFIED"].includes(s.status))
        .reduce((a, s) => a + (WEIGHT.get(s.stageKey) ?? 0), 0);
      const progressPct = Math.round((wDone / TOTAL_WEIGHT) * 1000) / 10;
      const compDone = stages.some(
        (s) => s.stageKey === "COMP" && ["COMPLETED", "VERIFIED"].includes(s.status),
      );
      await prisma.house.update({
        where: { id: payment.houseId },
        data: {
          actualCost,
          progressPct,
          status: compDone
            ? "COMPLETED"
            : progressPct <= 0
              ? "NOT_STARTED"
              : progressPct >= 60
                ? "UNDER_CONSTRUCTION"
                : "IN_PROGRESS",
        },
      });
    }

    await writeAudit({
      user,
      action: "PAYMENT",
      module: "payments",
      recordId: payment.id,
      oldValue: before,
      newValue: {
        status: updated.status,
        releasedAmount: updated.releasedAmount,
        paymentDate: updated.paymentDate,
      },
      ip: clientIp(req),
    });
    await writeActivity({
      user,
      verb: body.reverse ? "reversed" : "released",
      summary: body.reverse
        ? `Reversed ${payment.milestone} payment for ${payment.beneficiary.name}`
        : `Released ${payment.milestone} payment ₹${payment.eligibleAmount.toLocaleString("en-IN")} for ${payment.beneficiary.name}`,
      districtId: payment.beneficiary.districtId,
      link: `/beneficiaries/${params.id}`,
    });

    return NextResponse.json({ ok: true, payment: updated });
  },
  { feature: "beneficiaries", write: true },
);
