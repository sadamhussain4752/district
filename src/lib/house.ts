import type { StageStatus, ApprovalStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { CONSTRUCTION_STAGES, DEPLOY_STATE } from "./constants";
import { nextHouseCode } from "./sequence";
import {
  computeHouseProgress, deriveHouseStatus, deriveScheduleHealth,
  computeHealthScore,
} from "./progress";

/** Create a house for a beneficiary + seed all construction stages. */
export async function createHouseForBeneficiary(beneficiaryId: string) {
  const existing = await prisma.house.findUnique({ where: { beneficiaryId } });
  if (existing) return existing;

  const ben = await prisma.beneficiary.findUniqueOrThrow({
    where: { id: beneficiaryId },
    include: { district: true },
  });

  const stateCode = DEPLOY_STATE === "AP" ? "AP" : "TG";
  const houseCode = await nextHouseCode(stateCode, ben.district.code);
  const first = CONSTRUCTION_STAGES[0];

  const house = await prisma.house.create({
    data: {
      houseCode,
      beneficiaryId,
      projectId: ben.projectId,
      stateId: ben.stateId,
      districtId: ben.districtId,
      mandalId: ben.mandalId,
      villageId: ben.villageId,
      contractorId: ben.contractorId,
      projectManagerId: ben.projectManagerId,
      estimatedCost: ben.sanctionAmount || 0,
      currentStageKey: first.key,
      currentStageName: first.name,
      status: "NOT_STARTED",
    },
  });

  await prisma.houseStageProgress.createMany({
    data: CONSTRUCTION_STAGES.map((s, i) => ({
      houseId: house.id,
      stageKey: s.key,
      stageName: s.name,
      sequence: i + 1,
      status: "NOT_STARTED" as StageStatus,
      progressPct: 0,
      billValue: s.billValue,
      approvalStatus: "PENDING" as ApprovalStatus,
    })),
  });

  return house;
}

/** Recompute derived house fields from its stage progress + related records. */
export async function recomputeHouse(houseId: string) {
  const house = await prisma.house.findUniqueOrThrow({
    where: { id: houseId },
    include: { stageProgress: { orderBy: { sequence: "asc" } } },
  });

  const progressPct = computeHouseProgress(house.stageProgress);
  const status = deriveHouseStatus(progressPct, house.stageProgress);

  const current =
    [...house.stageProgress]
      .reverse()
      .find((s) => ["STARTED", "IN_PROGRESS", "PENDING_VERIFICATION"].includes(s.status)) ??
    [...house.stageProgress].find((s) => !["VERIFIED", "COMPLETED"].includes(s.status)) ??
    house.stageProgress[house.stageProgress.length - 1];

  const [openCritical, failedInspections] = await Promise.all([
    prisma.issue.count({
      where: { houseId, priority: "CRITICAL", status: { notIn: ["RESOLVED", "VERIFIED", "CLOSED"] } },
    }),
    prisma.qualityInspection.count({
      where: { houseId, result: { in: ["FAILED", "REWORK_REQUIRED"] } },
    }),
  ]);

  const scheduleHealth = deriveScheduleHealth({
    plannedCompletion: house.plannedCompletion,
    actualCompletion: house.actualCompletion,
    progressPct,
    startDate: house.startDate,
  });

  const healthScore = computeHealthScore({
    scheduleHealth,
    budgetRatio: house.estimatedCost ? house.actualCost / house.estimatedCost : 1,
    openCriticalIssues: openCritical,
    failedInspections,
    progressPct,
  });

  const isDone = ["COMPLETED", "HANDED_OVER"].includes(status);

  return prisma.house.update({
    where: { id: houseId },
    data: {
      progressPct,
      status: scheduleHealth === "CRITICAL" && !isDone ? "DELAYED" : status,
      scheduleHealth,
      healthScore,
      currentStageKey: current?.stageKey,
      currentStageName: current?.stageName,
      startDate:
        house.startDate ??
        (progressPct > 0 ? new Date() : null),
      actualCompletion:
        isDone && !house.actualCompletion ? new Date() : house.actualCompletion,
    },
  });
}

/** Roll house status back to the linked beneficiary + parent project totals. */
export async function syncBeneficiaryAndProject(houseId: string) {
  const house = await prisma.house.findUniqueOrThrow({ where: { id: houseId } });

  const benStatus =
    house.status === "COMPLETED" || house.status === "HANDED_OVER"
      ? "COMPLETED"
      : house.status === "NOT_STARTED"
        ? "CONSTRUCTION_NOT_STARTED"
        : house.progressPct >= 50
          ? "UNDER_CONSTRUCTION"
          : "CONSTRUCTION_STARTED";

  await prisma.beneficiary.update({
    where: { id: house.beneficiaryId },
    data: { status: benStatus },
  });

  if (house.projectId) {
    const agg = await prisma.house.aggregate({
      where: { projectId: house.projectId },
      _avg: { progressPct: true },
      _sum: { actualCost: true },
    });
    await prisma.project.update({
      where: { id: house.projectId },
      data: {
        progressPct: Math.round((agg._avg.progressPct ?? 0) * 10) / 10,
        totalExpenditure: agg._sum.actualCost ?? 0,
      },
    });
  }
}
