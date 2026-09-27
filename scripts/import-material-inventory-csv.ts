/**
 * Idempotently import the MATERIAL INVENTORY - SUMMAR (U) CSV into inventory.
 *
 * FILE=/absolute/path.csv npx tsx scripts/import-material-inventory-csv.ts
 */
import * as XLSX from "xlsx";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FILE = process.env.FILE;
if (!FILE) throw new Error("Set FILE to the source CSV path");

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const key = (value: unknown) => clean(value).toLocaleLowerCase("en-IN");
const number = (value: unknown) => {
  const normalized = clean(value).replace(/[^0-9.\-]/g, "");
  if (!normalized || normalized === "-" || normalized.startsWith("#")) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const slug = (value: string) =>
  value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase().slice(0, 32);
const title = (value: string) => value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const MATERIALS: Record<string, { name: string; category: string; unit: string }> = {
  rmc: { name: "RMC", category: "Concrete", unit: "Cu.m" },
  "8 inch blocks": { name: "8 Inch Blocks", category: "Blocks", unit: "Nos" },
  "6 inch blocks": { name: "6 Inch Blocks", category: "Blocks", unit: "Nos" },
  bricks: { name: "Bricks", category: "Masonry", unit: "Nos" },
  "20mm": { name: "20MM Aggregate", category: "Aggregate", unit: "Cu.m" },
  "10mm": { name: "10MM Aggregate", category: "Aggregate", unit: "Cu.m" },
  "wet mix": { name: "Wet Mix", category: "Aggregate", unit: "Cu.m" },
  msand: { name: "M-Sand", category: "Sand", unit: "Cu.m" },
  steel: { name: "Steel", category: "Steel", unit: "MT" },
  "chemical bags": { name: "Chemical Bags", category: "Chemical", unit: "Bags" },
};

const MANDAL_ALIASES: Record<string, string> = {
  "warangal muncipal corporation": "Warangal Municipal Corporation",
  hanamkonda: "Hanamkonda",
  palakurthy: "Palakurthi",
  wardhannapeta: "Wardhannapet",
  bheemadevarapally: "Bheemadevarapally",
  bhimadevarapally: "Bheemadevarapally",
  doultabad: "Doulathabad",
};

type SourceRow = {
  serial: string; date: Date | null; tripSheet: string; vehicle: string; vendor: string;
  mandal: string; village: string; materialKey: string; quantity: number; rate: number; amount: number;
};

function parseDate(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  const workbook = XLSX.readFile(FILE!, { raw: false });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
  const parsed: SourceRow[] = [];
  let skipped = 0;

  for (const row of rows.slice(3)) {
    const serial = clean(row[1]);
    const materialKey = key(row[10]);
    const quantity = number(row[11]) ?? number(row[12]);
    if (!/^\d+$/.test(serial) || !MATERIALS[materialKey] || quantity == null || quantity <= 0) {
      if (serial || materialKey) skipped += 1;
      continue;
    }
    parsed.push({
      serial,
      date: parseDate(row[3]),
      tripSheet: clean(row[4]),
      vehicle: clean(row[5]),
      vendor: clean(row[6]),
      mandal: clean(row[8]) || "Unassigned",
      village: clean(row[9]),
      materialKey,
      quantity,
      rate: number(row[13]) ?? 0,
      amount: number(row[14]) ?? 0,
    });
  }

  if (process.argv.includes("--replace")) {
    const [requestItems, consumption, purchaseItems, grnItems] = await Promise.all([
      prisma.materialRequestItem.count(),
      prisma.materialConsumption.count(),
      prisma.purchaseItem.count(),
      prisma.grnItem.count(),
    ]);
    if (requestItems || consumption || purchaseItems || grnItems) {
      throw new Error("Inventory reset stopped because materials are referenced by operational records.");
    }
    await prisma.stockTransaction.deleteMany();
    await prisma.inventoryStock.deleteMany();
    await prisma.material.deleteMany();
    await prisma.warehouse.deleteMany();
  }

  const states = await prisma.state.findMany({ take: 1, select: { id: true } });
  const stateId = states[0]?.id ?? null;
  const mandals = await prisma.mandal.findMany({ select: { id: true, name: true, districtId: true } });
  const mandalByName = new Map(mandals.map((mandal) => [key(mandal.name), mandal]));
  const materialIds = new Map<string, string>();

  for (const [materialKey, meta] of Object.entries(MATERIALS)) {
    const sourceRows = parsed.filter((row) => row.materialKey === materialKey);
    const totalQuantity = sourceRows.reduce((sum, row) => sum + row.quantity, 0);
    const standardRate = totalQuantity
      ? sourceRows.reduce((sum, row) => sum + row.amount, 0) / totalQuantity
      : 0;
    const material = await prisma.material.upsert({
      where: { materialCode: `MIU-${slug(meta.name)}` },
      create: { materialCode: `MIU-${slug(meta.name)}`, ...meta, standardRate, reorderLevel: 0 },
      update: { ...meta, standardRate },
    });
    materialIds.set(materialKey, material.id);
  }

  const warehouseIds = new Map<string, string>();
  for (const sourceName of [...new Set(parsed.map((row) => row.mandal))]) {
    const canonicalName = MANDAL_ALIASES[key(sourceName)] ?? title(sourceName);
    const matched = mandalByName.get(key(canonicalName)) ?? mandalByName.get(key(sourceName));
    const warehouse = await prisma.warehouse.upsert({
      where: { code: `MIU-${slug(canonicalName || "UNASSIGNED")}` },
      create: {
        code: `MIU-${slug(canonicalName || "UNASSIGNED")}`,
        name: `Material Inventory — ${canonicalName}`,
        level: "MANDAL",
        stateId,
        districtId: matched?.districtId ?? null,
        mandalId: matched?.id ?? null,
      },
      update: {
        name: `Material Inventory — ${canonicalName}`,
        stateId,
        districtId: matched?.districtId ?? null,
        mandalId: matched?.id ?? null,
      },
    });
    warehouseIds.set(key(sourceName), warehouse.id);
  }

  const grouped = new Map<string, { quantity: number; value: number }>();
  for (const row of parsed) {
    const materialId = materialIds.get(row.materialKey)!;
    const warehouseId = warehouseIds.get(key(row.mandal))!;
    const groupKey = `${materialId}:${warehouseId}`;
    const current = grouped.get(groupKey) ?? { quantity: 0, value: 0 };
    current.quantity += row.quantity;
    current.value += row.amount;
    grouped.set(groupKey, current);
  }
  for (const [groupKey, balance] of grouped) {
    const [materialId, warehouseId] = groupKey.split(":");
    await prisma.inventoryStock.upsert({
      where: { materialId_warehouseId: { materialId, warehouseId } },
      create: { materialId, warehouseId, quantity: balance.quantity, value: balance.value },
      update: { quantity: balance.quantity, value: balance.value },
    });
  }

  const transactionData = parsed.map((row) => {
    const materialId = materialIds.get(row.materialKey)!;
    const warehouseId = warehouseIds.get(key(row.mandal))!;
    const digest = createHash("sha1")
      .update([row.serial, row.date?.toISOString() ?? "", row.tripSheet, row.materialKey, row.mandal, row.village, row.quantity].join("|"))
      .digest("hex").slice(0, 12).toUpperCase();
    return {
      txnNo: `MIU-${digest}`,
      type: "PURCHASE_RECEIPT" as const,
      materialId,
      warehouseId,
      quantity: row.quantity,
      balanceAfter: grouped.get(`${materialId}:${warehouseId}`)?.quantity ?? row.quantity,
      purpose: [row.vendor, row.village].filter(Boolean).join(" · ") || "Material inventory import",
      reference: [row.tripSheet && `Trip ${row.tripSheet}`, row.vehicle && `Vehicle ${row.vehicle}`, `Source row ${row.serial}`].filter(Boolean).join(" · "),
      createdAt: row.date ?? new Date(),
    };
  });
  const existingTransactions = await prisma.stockTransaction.findMany({
    where: { txnNo: { in: transactionData.map((row) => row.txnNo) } },
    select: { txnNo: true },
  });
  const existingNumbers = new Set(existingTransactions.map((row) => row.txnNo));
  const missingTransactions = transactionData.filter((row) => !existingNumbers.has(row.txnNo));
  if (missingTransactions.length) {
    await prisma.stockTransaction.createMany({ data: missingTransactions });
  }
  const transactionsCreated = missingTransactions.length;

  console.log(JSON.stringify({
    sourceRows: rows.length - 3,
    importedRows: parsed.length,
    skippedRows: skipped,
    materials: materialIds.size,
    warehouses: warehouseIds.size,
    stockBalances: grouped.size,
    totalQuantity: parsed.reduce((sum, row) => sum + row.quantity, 0),
    totalValue: parsed.reduce((sum, row) => sum + row.amount, 0),
    transactionsCreated,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
