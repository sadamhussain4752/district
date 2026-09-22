/**
 * Mark the "Auger Filing" stage 100% complete for every house, then recompute
 * house progress / status / current stage.
 *
 *   npx tsx scripts/complete-auger.ts
 */
import { PrismaClient } from "@prisma/client";
import { CONSTRUCTION_STAGES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function retry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i >= tries || !/P2034|write conflict|deadlock/i.test(String(e?.message))) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

async function main() {
  const r = await retry(() =>
    prisma.houseStageProgress.updateMany({
      where: { stageKey: "AUGER" },
      data: {
        status: "COMPLETED",
        progressPct: 100,
        approvalStatus: "APPROVED",
        onlineStatus: "MD-Approve Payment Done",
      },
    }),
  );
  console.log(`✓ ${r.count} Auger Filing rows -> 100% complete`);

  const SEQ = CONSTRUCTION_STAGES.map((s) => s.key);
  const NAME = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.name]));
  const WEIGHT = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.weight]));
  const TOTAL = CONSTRUCTION_STAGES.reduce((a, s) => a + s.weight, 0);
  const DONE = ["COMPLETED", "VERIFIED"];

  const houses = await prisma.house.findMany({
    select: {
      id: true,
      stageProgress: { select: { stageKey: true, status: true, receivedAmount: true } },
    },
  });
  let n = 0;
  for (const h of houses) {
    const byKey = new Map(h.stageProgress.map((s) => [s.stageKey, s]));
    const done = h.stageProgress.filter((s) => DONE.includes(s.status));
    const wDone = done.reduce((a, s) => a + (WEIGHT.get(s.stageKey) ?? 0), 0);
    const progressPct = Math.round((wDone / TOTAL) * 1000) / 10;
    const actualCost = h.stageProgress.reduce((a, s) => a + (s.receivedAmount ?? 0), 0);
    const lastDoneIdx = Math.max(-1, ...done.map((s) => SEQ.indexOf(s.stageKey)));
    const laterInProg = SEQ.find((k, i) => {
      if (i <= lastDoneIdx) return false;
      const s = byKey.get(k);
      return s && !DONE.includes(s.status) && s.status !== "NOT_STARTED";
    });
    const curKey =
      laterInProg ??
      (lastDoneIdx >= 0 && lastDoneIdx < SEQ.length - 1
        ? SEQ[lastDoneIdx + 1]
        : lastDoneIdx === SEQ.length - 1
          ? SEQ[lastDoneIdx]
          : "AUGER");
    const compDone = DONE.includes(byKey.get("COMP")?.status ?? "");
    await prisma.house.update({
      where: { id: h.id },
      data: {
        progressPct,
        actualCost,
        currentStageKey: curKey,
        currentStageName: NAME.get(curKey) ?? curKey,
        status: compDone
          ? "COMPLETED"
          : progressPct <= 0
            ? "NOT_STARTED"
            : progressPct >= 60
              ? "UNDER_CONSTRUCTION"
              : "IN_PROGRESS",
      },
    });
    if (++n % 300 === 0) console.log(`  … ${n}/${houses.length}`);
  }

  const hs = await prisma.house.groupBy({ by: ["status"], _count: true, _avg: { progressPct: true } });
  console.log(hs.map((x) => `${x.status}:${x._count} (${x._avg.progressPct?.toFixed(1)}%)`).join(" | "));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
