/**
 * In-place migration for existing data (no re-import), using bulk updateMany:
 *  - "Auger Boring / Foundation" -> "Auger Filing" and refreshed stage names
 *  - stage bill values: BL 1,00,000 · RL 1,00,000 · RC 1,40,000 · COMP 1,60,000
 *  - house contract value / beneficiary sanction -> ₹5,00,000
 *  - beneficiary-payment eligible amounts follow the new stage bill values
 *
 *   npx tsx scripts/migrate-stage-values.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  CONSTRUCTION_STAGES,
  HOUSE_CONTRACT_VALUE,
} from "../src/lib/constants";

const prisma = new PrismaClient();

/** Retry a write past transient Atlas write-conflict / deadlock errors. */
async function retry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i >= tries || !/P2034|write conflict|deadlock|WriteConflict/i.test(String(e?.message)))
        throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

const MILESTONE_BILL: Record<string, number> = {
  FOUNDATION: 100000,
  PLINTH: 100000,
  ROOF: 140000,
  COMPLETION: 160000,
};

async function main() {
  // 1. ConstructionStage master
  for (const s of CONSTRUCTION_STAGES) {
    await retry(() => prisma.constructionStage.updateMany({
      where: { key: s.key },
      data: { name: s.name, shortName: s.shortName, billValue: s.billValue, weightPct: s.weight },
    }));
  }
  console.log("✓ construction stage master");

  // 2. HouseStageProgress — name + billValue + balance (bulk)
  for (const s of CONSTRUCTION_STAGES) {
    await retry(() => prisma.houseStageProgress.updateMany({
      where: { stageKey: s.key },
      data: { stageName: s.name, billValue: s.billValue },
    }));
    // received rows have 0 balance; unpaid rows owe the full bill
    await retry(() => prisma.houseStageProgress.updateMany({
      where: { stageKey: s.key, receivedAmount: { gt: 0 } },
      data: { balanceAmount: 0 },
    }));
    await retry(() => prisma.houseStageProgress.updateMany({
      where: { stageKey: s.key, receivedAmount: { lte: 0 } },
      data: { balanceAmount: s.billValue },
    }));
    console.log(`✓ ${s.key} stage rows -> "${s.name}" bill ₹${s.billValue.toLocaleString("en-IN")}`);
  }

  // 3. House currentStageName (bulk per key) + contract value
  for (const s of CONSTRUCTION_STAGES) {
    await retry(() => prisma.house.updateMany({
      where: { currentStageKey: s.key },
      data: { currentStageName: s.name },
    }));
  }
  const hh = await retry(() => prisma.house.updateMany({ data: { estimatedCost: HOUSE_CONTRACT_VALUE } }));
  console.log(`✓ ${hh.count} houses -> contract value ₹${HOUSE_CONTRACT_VALUE.toLocaleString("en-IN")}`);

  // 4. Beneficiary sanction amount
  const bn = await retry(() => prisma.beneficiary.updateMany({ data: { sanctionAmount: HOUSE_CONTRACT_VALUE } }));
  console.log(`✓ ${bn.count} beneficiaries -> sanction ₹${HOUSE_CONTRACT_VALUE.toLocaleString("en-IN")}`);

  // 4b. Project approved budget = houses × contract value
  const projs = await prisma.project.findMany({ select: { id: true, districtId: true } });
  for (const pr of projs) {
    const n = await prisma.beneficiary.count({ where: { districtId: pr.districtId } });
    await prisma.project.update({
      where: { id: pr.id },
      data: { approvedBudget: n * HOUSE_CONTRACT_VALUE, plannedHouses: n },
    });
  }
  console.log(`✓ ${projs.length} project budgets`);

  // 5. BeneficiaryPayment eligible amounts + keep released rows consistent
  for (const [ms, bill] of Object.entries(MILESTONE_BILL)) {
    const r = await retry(() => prisma.beneficiaryPayment.updateMany({
      where: { milestone: ms as never },
      data: { eligibleAmount: bill },
    }));
    // a PAID milestone should release the (new) full eligible amount
    await retry(() => prisma.beneficiaryPayment.updateMany({
      where: { milestone: ms as never, status: "PAID" },
      data: { releasedAmount: bill },
    }));
    console.log(`✓ ${r.count} ${ms} payments -> eligible ₹${bill.toLocaleString("en-IN")}`);
  }

  // 6. Recompute house progress + actualCost from stage rows (bulk-ish, batched)
  const houses = await prisma.house.findMany({
    select: {
      id: true,
      stageProgress: {
        select: { stageKey: true, status: true, receivedAmount: true },
      },
    },
  });
  const WEIGHT = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.weight]));
  const NAME = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.name]));
  const SEQ = CONSTRUCTION_STAGES.map((s) => s.key);
  const TOTAL = CONSTRUCTION_STAGES.reduce((a, s) => a + s.weight, 0);
  const DONE = ["COMPLETED", "VERIFIED"];
  let n = 0;
  for (const h of houses) {
    const byKey = new Map(h.stageProgress.map((s) => [s.stageKey, s]));
    const done = h.stageProgress.filter((s) => DONE.includes(s.status));
    const wDone = done.reduce((a, s) => a + (WEIGHT.get(s.stageKey) ?? 0), 0);
    const actualCost = h.stageProgress.reduce((a, s) => a + (s.receivedAmount ?? 0), 0);
    // current stage = successor of the furthest-done stage, unless a *later*
    // stage is already in progress
    const lastDoneIdx = Math.max(
      -1,
      ...done.map((s) => SEQ.indexOf(s.stageKey)),
    );
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
    await prisma.house.update({
      where: { id: h.id },
      data: {
        progressPct: Math.round((wDone / TOTAL) * 1000) / 10,
        actualCost,
        currentStageKey: curKey,
        currentStageName: NAME.get(curKey) ?? curKey,
      },
    });
    if (++n % 300 === 0) console.log(`  … ${n}/${houses.length} houses recomputed`);
  }
  console.log(`✓ ${n} houses recomputed`);

  const agg = await prisma.houseStageProgress.aggregate({
    _sum: { billValue: true, receivedAmount: true },
  });
  console.log(
    `\nStage bill total ₹${(agg._sum.billValue ?? 0).toLocaleString("en-IN")} · received ₹${(agg._sum.receivedAmount ?? 0).toLocaleString("en-IN")}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
