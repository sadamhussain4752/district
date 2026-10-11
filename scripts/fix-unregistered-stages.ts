/**
 * A stage counts as reached only when TSHCL's Inventory-Summary register has a
 * row for it. The importer also marks a stage done from the Mapped_List billing
 * columns alone, which overstates BL / COMP by a few houses that have no
 * register entry and no money received. This resets those back to NOT_STARTED.
 *
 *   npx tsx scripts/fix-unregistered-stages.ts [--dry-run]
 *
 * Auger Filing is exempt: it is deliberately complete for every house and never
 * carries an online status.
 */
import { PrismaClient } from "@prisma/client";
import { recomputeHouse, syncBeneficiaryAndProject } from "../src/lib/house";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

async function main() {
  const suspects = await prisma.houseStageProgress.findMany({
    where: {
      stageKey: { not: "AUGER" },
      status: { not: "NOT_STARTED" },
      onlineStatus: null,
      receivedAmount: { lte: 0 },
    },
    select: { id: true, houseId: true, stageKey: true, status: true, billValue: true },
  });

  const byStage = suspects.reduce<Record<string, number>>((a, s) => {
    a[s.stageKey] = (a[s.stageKey] ?? 0) + 1;
    return a;
  }, {});
  console.log(`${suspects.length} stage rows have no register entry and no money:`, byStage);
  if (DRY) { console.log("--dry-run: nothing written."); return; }

  await prisma.houseStageProgress.updateMany({
    where: { id: { in: suspects.map((s) => s.id) } },
    data: {
      status: "NOT_STARTED",
      progressPct: 0,
      approvalStatus: "PENDING",
      actualStart: null,
      actualEnd: null,
      billValue: 0,
      balanceAmount: 0,
    },
  });

  const houseIds = [...new Set(suspects.map((s) => s.houseId))];
  for (const id of houseIds) {
    await recomputeHouse(id);
    await syncBeneficiaryAndProject(id);
  }
  console.log(`Reset ${suspects.length} stage rows and recomputed ${houseIds.length} houses.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
