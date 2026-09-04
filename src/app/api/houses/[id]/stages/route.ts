import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, writeAudit, writeActivity, clientIp, HttpError } from "@/lib/api";
import { stageUpdateSchema } from "@/lib/validators";
import { recomputeHouse, syncBeneficiaryAndProject } from "@/lib/house";
import { CONSTRUCTION_STAGES } from "@/lib/constants";
import { isReadOnly } from "@/lib/rbac";

const STAGE_META = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s]));

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

    const meta = STAGE_META.get(input.stageKey);

    // Business rule: a QC stage cannot be marked COMPLETED/VERIFIED without a passing inspection.
    if (
      meta?.qc &&
      (input.status === "COMPLETED" || input.status === "VERIFIED")
    ) {
      const passed = await prisma.qualityInspection.findFirst({
        where: {
          houseId: house.id,
          stageKey: input.stageKey,
          result: { in: ["PASSED", "PASSED_WITH_OBSERVATION"] },
        },
      });
      if (!passed) {
        throw new HttpError(
          409,
          `${meta.name} requires a passed quality inspection before it can be completed.`,
        );
      }
    }

    const before = { status: stage.status, progressPct: stage.progressPct };
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
        actualStart:
          input.actualStart
            ? new Date(input.actualStart)
            : stage.actualStart ??
              (nextStatus !== "NOT_STARTED" ? new Date() : null),
        actualEnd:
          input.actualEnd
            ? new Date(input.actualEnd)
            : nextStatus === "COMPLETED" || nextStatus === "VERIFIED"
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
      data: { actualCost: costAgg._sum.stageCost ?? 0 },
    });

    const updatedHouse = await recomputeHouse(house.id);
    await syncBeneficiaryAndProject(house.id);

    await writeAudit({
      user, action: "STAGE_CHANGE", module: "construction", recordId: house.id,
      oldValue: before, newValue: { status: nextStatus, progressPct: nextPct },
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
