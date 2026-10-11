/**
 * Import the "Labour_Payment Details" sheet into LabourVendor + LabourMandalClaim.
 *
 *   npx tsx scripts/import-labour-payments.ts [path/to/workbook.xlsx] [--dry-run]
 *
 * Layout: a block per labour contractor — the first row carries the name, its
 * first mandal and the payment chart (Total / TDS / Net Payable / Paid /
 * Balance); following rows add one mandal each; the block ends with a
 * "<name>_Total" row. Re-runnable: every vendor's chart and mandal rows are
 * rewritten from the sheet.
 */
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { nextCode } from "../src/lib/sequence";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FILE = args.find((a) => !a.startsWith("--")) ?? "data/astonic-report.xlsx";
const SHEET = "Labour_Payment Details";

type Cell = string | number | null;
const str = (v: Cell) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const key = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v: Cell) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[, ]/g, "")) || 0);

type Claim = { mandalName: string; augerCount: number; blCount: number; rlCount: number; rcCount: number; compCount: number };
type Block = {
  name: string;
  claims: Claim[];
  claimAmount: number; tdsAmount: number; netPayable: number; paidAmount: number; balanceAmount: number;
};

function parse(rows: Cell[][]) {
  // columns: 1 name, 2 mandal, 3..7 Auger BL RL RC COMP, 8 Total, 9 TDS, 10 Net, 11 Paid, 12 Balance
  const head = rows.findIndex((r) => str(r[1]) === "Labour_Name");
  if (head < 0) throw new Error(`Header row not found in "${SHEET}"`);
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const row of rows.slice(head + 1)) {
    const name = str(row[1]);
    const mandalName = str(row[2]);
    if (name === "Net_Total") break;
    if (name.endsWith("_Total")) { current = null; continue; } // block terminator
    if (name) {
      current = {
        name,
        claims: [],
        claimAmount: num(row[8]), tdsAmount: num(row[9]), netPayable: num(row[10]),
        paidAmount: num(row[11]), balanceAmount: num(row[12]),
      };
      blocks.push(current);
    }
    if (!current || !mandalName) continue;
    current.claims.push({
      mandalName,
      augerCount: num(row[3]), blCount: num(row[4]), rlCount: num(row[5]),
      rcCount: num(row[6]), compCount: num(row[7]),
    });
  }
  return blocks;
}

async function main() {
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${FILE}`);
  const blocks = parse(XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: null, raw: true }));

  const vendors = await prisma.labourVendor.findMany({ select: { id: true, name: true } });
  const byName = new Map(vendors.map((v) => [key(v.name), v]));
  const mandals = await prisma.mandal.findMany({ select: { id: true, name: true } });
  const mandalByName = new Map(mandals.map((m) => [key(m.name), m]));

  const totals = { claim: 0, paid: 0, balance: 0, claims: 0, created: 0, unmatchedMandals: new Set<string>() };
  for (const b of blocks) {
    totals.claim += b.claimAmount;
    totals.paid += b.paidAmount;
    totals.balance += b.balanceAmount;
    totals.claims += b.claims.length;
    for (const c of b.claims) if (!mandalByName.has(key(c.mandalName))) totals.unmatchedMandals.add(c.mandalName);
  }

  console.log(`Sheet: ${blocks.length} labour contractors, ${totals.claims} mandal rows`);
  console.log(
    `Gross ₹${totals.claim.toLocaleString("en-IN")} · paid ₹${totals.paid.toLocaleString("en-IN")} · balance ₹${totals.balance.toLocaleString("en-IN")}`,
  );
  const missing = blocks.filter((b) => !byName.has(key(b.name))).map((b) => b.name);
  if (missing.length) console.log("Not yet in the labour master (will be created):", missing.join(", "));
  if (totals.unmatchedMandals.size) console.log("Mandals not matched to masters:", [...totals.unmatchedMandals].join(", "));
  if (DRY) { console.log("--dry-run: nothing written."); return; }

  for (const b of blocks) {
    let vendor = byName.get(key(b.name));
    if (!vendor) {
      vendor = await prisma.labourVendor.create({
        data: { vendorCode: await nextCode("LAB", "labour-vendor"), name: b.name },
        select: { id: true, name: true },
      });
      byName.set(key(b.name), vendor);
      totals.created += 1;
    }
    const sum = (f: keyof Claim) => b.claims.reduce((a, c) => a + (c[f] as number), 0);
    await prisma.labourVendor.update({
      where: { id: vendor.id },
      data: {
        augerCount: sum("augerCount"), blCount: sum("blCount"), rlCount: sum("rlCount"),
        rcCount: sum("rcCount"), compCount: sum("compCount"),
        claimAmount: b.claimAmount, tdsAmount: b.tdsAmount, netPayable: b.netPayable,
        paidAmount: b.paidAmount, balanceAmount: b.balanceAmount,
      },
    });
    await prisma.labourMandalClaim.deleteMany({ where: { vendorId: vendor.id } });
    if (b.claims.length) {
      await prisma.labourMandalClaim.createMany({
        data: b.claims.map((c) => ({
          ...c,
          vendorId: vendor!.id,
          mandalId: mandalByName.get(key(c.mandalName))?.id ?? null,
        })),
      });
    }
  }
  console.log(`Updated ${blocks.length} labour contractors (${totals.created} newly created).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
