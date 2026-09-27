import { prisma } from "../src/lib/prisma";
import { nextCode } from "../src/lib/sequence";

function key(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
}

async function retryWrite(operation: () => Promise<unknown>) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if ((error as { code?: string }).code !== "P2034" || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
}

function batches<T>(items: T[], size = 25) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

async function main() {
  const stages = await prisma.houseStageProgress.findMany({
    where: { labourContractorName: { not: null } },
    select: {
      id: true,
      houseId: true,
      labourContractorName: true,
      supervisorId: true,
      supervisorName: true,
    },
  });
  const houses = await prisma.house.findMany({
    where: { id: { in: [...new Set(stages.map((stage) => stage.houseId))] } },
    select: {
      id: true,
      districtId: true,
      mandalId: true,
      projectId: true,
      contractorId: true,
      supervisorId: true,
    },
  });
  const houseMap = new Map(houses.map((house) => [house.id, house]));
  const existing = await prisma.labourVendor.findMany();
  const supervisors = await prisma.supervisor.findMany();
  const supervisorByName = new Map(supervisors.map((supervisor) => [key(supervisor.name), supervisor]));
  const vendorByName = new Map(existing.map((vendor) => [key(vendor.name), vendor]));
  let created = 0;
  let linkedStages = 0;

  const groups = new Map<string, typeof stages>();
  for (const stage of stages) {
    if (!stage.labourContractorName?.trim()) continue;
    const stagesForName = groups.get(key(stage.labourContractorName)) ?? [];
    stagesForName.push(stage);
    groups.set(key(stage.labourContractorName), stagesForName);
  }

  for (const vendorStages of groups.values()) {
    const first = vendorStages[0];
    const name = first.labourContractorName!.trim().replace(/\s+/g, " ");
    const firstHouse = houseMap.get(first.houseId);
    const supervisorId = vendorStages.map((stage) => {
      const house = houseMap.get(stage.houseId);
      return stage.supervisorId ??
        (stage.supervisorName ? supervisorByName.get(key(stage.supervisorName))?.id : null) ??
        house?.supervisorId;
    }).find(Boolean) ?? null;
    let vendor = vendorByName.get(key(name));
    if (!vendor) {
      vendor = await prisma.labourVendor.create({
        data: {
          vendorCode: await nextCode("LAB", "labour-vendor"),
          name,
          districtId: firstHouse?.districtId ?? null,
          mandalId: firstHouse?.mandalId ?? null,
          projectId: firstHouse?.projectId ?? null,
          contractorId: firstHouse?.contractorId ?? null,
          supervisorId,
        },
      });
      vendorByName.set(key(name), vendor);
      created += 1;
    } else if (!vendor.supervisorId && supervisorId) {
      vendor = await prisma.labourVendor.update({
        where: { id: vendor.id },
        data: { supervisorId },
      });
      vendorByName.set(key(name), vendor);
    }
    for (const stageIds of batches(vendorStages.map((stage) => stage.id))) {
      await retryWrite(() => prisma.houseStageProgress.updateMany({
        where: { id: { in: stageIds } },
        data: {
          labourVendorId: vendor.id,
          ...(supervisorId ? { supervisorId } : {}),
        },
      }));
    }
    const houseIds = [...new Set(vendorStages.map((stage) => stage.houseId))];
    for (const ids of batches(houseIds)) {
      await retryWrite(() => prisma.house.updateMany({
        where: { id: { in: ids } },
        data: {
          labourVendorId: vendor.id,
          ...(supervisorId ? { supervisorId } : {}),
        },
      }));
    }
    linkedStages += vendorStages.length;
  }

  console.log(JSON.stringify({ uniqueLegacyNames: groups.size, created, linkedStages }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
