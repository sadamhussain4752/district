import type {
  HouseStageProgress,
  HouseStatus,
  ScheduleHealth,
  StageStatus,
} from "@prisma/client";
import { CONSTRUCTION_STAGES } from "./constants";

const WEIGHTS = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.weight]));
const TOTAL_WEIGHT = CONSTRUCTION_STAGES.reduce((a, s) => a + s.weight, 0);

const DONE: StageStatus[] = ["VERIFIED", "COMPLETED"];

/** Weighted completion % derived from stage progress (never set arbitrarily). */
export function computeHouseProgress(stages: Pick<
  HouseStageProgress,
  "stageKey" | "status" | "progressPct"
>[]): number {
  let acc = 0;
  for (const s of stages) {
    const w = WEIGHTS.get(s.stageKey) ?? 0;
    const frac = DONE.includes(s.status)
      ? 1
      : Math.max(0, Math.min(1, (s.progressPct ?? 0) / 100));
    acc += w * frac;
  }
  return Math.round((acc / TOTAL_WEIGHT) * 1000) / 10;
}

export function deriveHouseStatus(
  progress: number,
  stages: Pick<HouseStageProgress, "stageKey" | "status">[],
): HouseStatus {
  const completion = stages.find((s) => s.stageKey === "COMPLETION");
  const handover = stages.find((s) => s.stageKey === "HANDOVER");
  if (handover && DONE.includes(handover.status)) return "HANDED_OVER";
  if (completion && DONE.includes(completion.status)) return "COMPLETED";
  if (progress <= 0) return "NOT_STARTED";
  if (progress >= 60) return "UNDER_CONSTRUCTION";
  return "IN_PROGRESS";
}

export function deriveScheduleHealth(house: {
  plannedCompletion: Date | null;
  actualCompletion: Date | null;
  progressPct: number;
  startDate: Date | null;
}): ScheduleHealth {
  if (house.actualCompletion) return "ON_SCHEDULE";
  const now = Date.now();
  if (house.plannedCompletion) {
    const daysLeft = (house.plannedCompletion.getTime() - now) / 86_400_000;
    if (daysLeft < 0) return house.progressPct < 90 ? "CRITICAL" : "DELAYED";
    if (daysLeft < 30 && house.progressPct < 70) return "AT_RISK";
    if (daysLeft < 60 && house.progressPct < 40) return "AT_RISK";
  }
  return "ON_SCHEDULE";
}

/** 0-100 composite health score. */
export function computeHealthScore(input: {
  scheduleHealth: ScheduleHealth;
  budgetRatio: number; // actualCost / estimatedCost
  openCriticalIssues: number;
  failedInspections: number;
  progressPct: number;
}): number {
  let score = 100;
  score -= { ON_SCHEDULE: 0, AT_RISK: 12, DELAYED: 25, CRITICAL: 40 }[
    input.scheduleHealth
  ];
  if (input.budgetRatio > 1.1) score -= Math.min(20, (input.budgetRatio - 1) * 60);
  score -= Math.min(20, input.openCriticalIssues * 7);
  score -= Math.min(15, input.failedInspections * 8);
  return Math.max(0, Math.round(score));
}

export function healthBand(score: number): "HEALTHY" | "ATTENTION" | "CRITICAL" {
  if (score >= 75) return "HEALTHY";
  if (score >= 50) return "ATTENTION";
  return "CRITICAL";
}
