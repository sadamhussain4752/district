import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, writeActivity, clientIp, HttpError } from "@/lib/api";
import { stageUpdateSchema } from "@/lib/validators";
import { recomputeHouse, syncBeneficiaryAndProject } from "@/lib/house";
import { isReadOnly } from "@/lib/rbac";

export const PATCH = route(
  async ({ params, req, user }) => {
    if (isReadOnly(user.role)) throw new HttpError(403, "Read-only role");
    const input = stageUpdateSchema.parse(await req.json());

    const house = await prisma.house.findUnique({
      where: { id: params.id },
      include: { stageProgress: true },
    });
    if (!house) throw new HttpError(404, "House not found");

    const stage = house.stageProgress.find((s) => s.stageKey === input.stageKey);
    if (!stage) throw new HttpError(404, "Stage not found for this house");

    const labourVendor = typeof input.labourVendorId === "string"
      ? await prisma.labourVendor.findUnique({ where: { id: input.labourVendorId }, select: { id: true, name: true, supervisorId: true } }).catch(() => null)
      : null;
    if (typeof input.labourVendorId === "string" && !labourVendor) {
      throw new HttpError(422, "Selected labour contractor was not found");
    }

    const before = {
      status: stage.status,
      progressPct: stage.progressPct,
      billValue: stage.billValue,
      receivedAmount: stage.receivedAmount,
      onlineStatus: stage.onlineStatus,
    };
    const billValue = input.billValue ?? stage.billValue;
    const receivedAmount = input.receivedAmount ?? stage.receivedAmount;
    if (receivedAmount > billValue)
      throw new HttpError(422, "Received amount cannot exceed the bill value");
    const onlineStatus =
      input.onlineStatus !== undefined ? input.onlineStatus || null : stage.onlineStatus;
    const nextStatus = input.status ?? stage.status;
    const nextPct =
      input.progressPct ??
      (nextStatus === "COMPLETED" || nextStatus === "VERIFIED"
        ? 100
        : stage.progressPct);

    await prisma.houseStageProgress.update({
      where: { id: stage.id },
      data: {
        status: nextStatus,
        progressPct: nextPct,
        remarks: input.remarks ?? stage.remarks,
        stageCost: input.stageCost ?? stage.stageCost,
        billValue,
        receivedAmount,
        balanceAmount: Math.max(0, billValue - receivedAmount),
        onlineStatus,
        labourVendorId: input.labourVendorId !== undefined ? input.labourVendorId : stage.labourVendorId,
        ...(input.labourVendorId !== undefined ? { labourContractorName: null } : {}),
        ...(labourVendor?.supervisorId ? { supervisorId: labourVendor.supervisorId } : {}),
        actualStart:
          input.actualStart
            ? new Date(input.actualStart)
            : stage.actualStart ??
              // Only stamp a start date when the status itself is being set —
              // a bill / online-status edit must not start the stage.
              (input.status && nextStatus !== "NOT_STARTED" ? new Date() : null),
        actualEnd:
          input.actualEnd
            ? new Date(input.actualEnd)
            : input.status && (nextStatus === "COMPLETED" || nextStatus === "VERIFIED")
              ? stage.actualEnd ?? new Date()
              : stage.actualEnd,
        approvalStatus:
          nextStatus === "VERIFIED" || nextStatus === "COMPLETED"
            ? "APPROVED"
            : stage.approvalStatus,
        updatedBy: user.id,
      },
    });

    // Roll up stage costs into actualCost
    const costAgg = await prisma.houseStageProgress.aggregate({
      where: { houseId: house.id },
      _sum: { stageCost: true },
    });
    await prisma.house.update({
      where: { id: house.id },
      data: {
        actualCost: costAgg._sum.stageCost ?? 0,
        ...(input.labourVendorId !== undefined ? { labourVendorId: input.labourVendorId } : {}),
        ...(labourVendor?.supervisorId ? { supervisorId: labourVendor.supervisorId } : {}),
      },
    });

    const updatedHouse = await recomputeHouse(house.id);
    await syncBeneficiaryAndProject(house.id);

    await writeAudit({
      user, action: "STAGE_CHANGE", module: "construction", recordId: house.id,
      oldValue: before,
      newValue: { status: nextStatus, progressPct: nextPct, billValue, receivedAmount, onlineStatus, ...(input.labourVendorId !== undefined ? { labourVendorId: labourVendor?.id ?? null, supervisorId: labourVendor?.supervisorId ?? null } : {}) },
      reason: input.remarks, ip: clientIp(req),
    });
    await writeActivity({
      user, verb: "updated",
      summary: `${user.role === "SITE_ENGINEER" ? "Supervisor" : "Team"} updated ${stage.stageName} for house ${house.houseCode} → ${nextStatus.replace(/_/g, " ").toLowerCase()}`,
      districtId: house.districtId,
      link: `/construction/${house.id}`,
    });

    return NextResponse.json({
      ok: true,
      house: {
        progressPct: updatedHouse.progressPct,
        status: updatedHouse.status,
        scheduleHealth: updatedHouse.scheduleHealth,
        healthScore: updatedHouse.healthScore,
      },
    });
  },
  { feature: "construction", write: true },
);
