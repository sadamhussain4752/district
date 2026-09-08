/**
 * Import the Astonic Construction / TSHCL Indiramma Indlu workbook into the DB.
 *
 *   npx tsx scripts/import-astonic.ts --dry-run          # parse + report, write nothing
 *   npx tsx scripts/import-astonic.ts                    # WIPES operational data + loads
 *   FILE=path/to/report.xlsx npx tsx scripts/import-astonic.ts --dry-run
 *
 * Source of truth:
 *   Mapped_List          -> beneficiaries + houses + location hierarchy
 *   Inventory - Summary  -> per-stage progress, approval chain, labour/supervisor, payment
 *   CMS_Report           -> payment cards
 *   Cash_Transcation_Details -> cash collected from beneficiaries
 *
 * Users / logins are NOT touched.
 */
import * as XLSX from "xlsx";
import { existsSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { CONSTRUCTION_STAGES, STAGE_ALIASES } from "../src/lib/constants";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";
const FILE = process.env.FILE || "data/astonic-report.xlsx";
const SALT = process.env.JWT_ACCESS_SECRET || "salt";
// Optional: a fresh "Inventory - Summary" CSV export that overrides the sheet
// inside FILE (auto-detected if data/inventory-summary.csv exists).
const INVENTORY_CSV =
  process.env.INVENTORY_CSV ||
  (existsSync("data/inventory-summary.csv") ? "data/inventory-summary.csv" : "");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const hashAadhaar = (a: string) =>
  createHash("sha256").update(`${a}:${SALT}`).digest("hex");

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const last4 = (v: unknown) => {
  const d = digits(v);
  return d.length >= 4 ? d.slice(-4) : d || null;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Excel serial OR "DD-Mon-YYYY" / "DD/MM/YYYY" text -> JS Date. */
function xdate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === "string") {
    const s = v.trim();
    // 26-Nov-2025 / 26 Nov 2025 / 26-November-2025
    let m = s.match(/^(\d{1,2})[-\s/]+([A-Za-z]{3,})[-\s/]+(\d{4})$/);
    if (m) {
      const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mon != null) return new Date(Date.UTC(+m[3], mon, +m[1]));
    }
    // 26/11/2025 or 26-11-2025 (day-first)
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    // 2025-11-26
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  }

  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  const p = XLSX.SSF.parse_date_code(n); // handles the 1900 leap-year bug
  if (!p) return null;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d, p.H || 0, p.M || 0, p.S || 0));
  return isNaN(d.getTime()) ? null : d;
}

const money = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Title-case a messy name / place: trims, collapses spaces, fixes ALL-CAPS + all-lower. */
function tidyName(v: unknown): string {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bSj\b/g, "SJ")
    .replace(/\bN\/a\b/i, "N/A");
}

const DISTRICT_ALIASES: Record<string, string> = {
  hanumakonda: "Hanumakonda",
  hanmakonda: "Hanumakonda",
  jangoan: "Jangaon",
  jangaon: "Jangaon",
  kamareddy: "Kamareddy",
  siddipet: "Siddipet",
  "bhadradri kothagudem": "Bhadradri Kothagudem",
  kothagudem: "Bhadradri Kothagudem",
  mahabubabad: "Mahabubabad",
  mahbubabad: "Mahabubabad",
  mahabubnagar: "Mahabubnagar",
  mahbubnagar: "Mahabubnagar",
  "yadadri bhuvanagiri": "Yadadri Bhuvanagiri",
  bhuvanagiri: "Yadadri Bhuvanagiri",
  yadadri: "Yadadri Bhuvanagiri",
  narayanpet: "Narayanpet",
  warangal: "Warangal",
  "warangal rural": "Warangal",
  khammam: "Khammam",
  medak: "Medak",
};
function canonDistrict(v: unknown): string {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return DISTRICT_ALIASES[s.toLowerCase()] || tidyName(s);
}

function sheet(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`sheet not found: "${name}"`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
}

// ---------------------------------------------------------------------------
// parse: Mapped_List  (header row index 1)
// ---------------------------------------------------------------------------
type BenRow = {
  applicationId: string;
  astCode: string;
  district: string;
  mandal: string;
  village: string;
  name: string;
  aadhaar: string;
  icici: string;
  referenceNumber: string;
  cmsStatus: string;
  sft: string;
  listType: string;
  payable: number;
  mouDate: Date | null;
  mouStatus: string;
  cardHolder: string;
  currentStage: string; // BL / RL / RC / COMP
  stageBilled: Record<string, number>;
  stageDpr: Record<string, Date | null>;
  totalBilled: number;
  totalReceived: number;
  balance: number;
};

function parseMappedList(wb: XLSX.WorkBook) {
  const rows = sheet(wb, "Mapped_List");
  const H = rows[1] as string[];
  const c = (label: string, from = 0) => {
    const want = label.trim();
    for (let i = from; i < H.length; i++)
      if (String(H[i]).trim() === want) return i;
    return -1;
  };
  const idx = {
    ast: c("S.No."),
    district: c("District"),
    mandal: c("Mandal"),
    village: c("Village_Name"),
    appId: c("Application Id"),
    name: c("Name Of The Beneficiary"),
    aadhaar: c("Aadhaar No"),
    icici: c("ICICI Account"),
    ref: c("Reference Number"),
    cms: c("CMS Account Status"),
    sft: c("SFT"),
    listType: c("Initial List Type"),
    payable: c("Payable for Benificiary"),
    mouDate: c("MOU-Date"),
    mouStatus: c("MOU-Status"),
    cardHolder: c("Name of Card Holder"),
    field: c("Field "),
    total: c("Actula Amount"),
  };
  // 4 (DPR-Date, Amount) pairs immediately after "Field " => BL, RL, RC, COMP
  const pairStart = idx.field + 1;
  const stageOrder = ["BL", "RL", "RC", "COMP"];

  const out: BenRow[] = [];
  const dupes: string[] = [];
  const seen = new Set<string>();

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const appId = String(row[idx.appId] ?? "").trim();
    if (!appId) continue;
    if (seen.has(appId)) {
      dupes.push(appId);
      continue;
    }
    seen.add(appId);

    const stageBilled: Record<string, number> = {};
    const stageDpr: Record<string, Date | null> = {};
    for (let s = 0; s < 4; s++) {
      const dcol = pairStart + s * 2;
      const acol = dcol + 1;
      stageDpr[stageOrder[s]] = xdate(row[dcol]);
      stageBilled[stageOrder[s]] = money(row[acol]);
    }
    const totalBilled = money(row[idx.total]);
    const totalReceived = money(row[idx.total + 1]);
    const balance = money(row[idx.total + 2]);

    out.push({
      applicationId: appId,
      astCode: String(row[idx.ast] ?? "").trim(),
      district: canonDistrict(row[idx.district]),
      mandal: tidyName(row[idx.mandal]),
      village: tidyName(row[idx.village]),
      name: tidyName(row[idx.name]),
      aadhaar: digits(row[idx.aadhaar]),
      icici: digits(row[idx.icici]),
      referenceNumber: String(row[idx.ref] ?? "").trim(),
      cmsStatus: String(row[idx.cms] ?? "").trim().toUpperCase(),
      sft: String(row[idx.sft] ?? "").trim(),
      listType: String(row[idx.listType] ?? "").trim(),
      payable: money(row[idx.payable]),
      mouDate: xdate(row[idx.mouDate]),
      mouStatus: String(row[idx.mouStatus] ?? "").trim(),
      cardHolder: tidyName(row[idx.cardHolder]),
      currentStage: String(row[idx.field] ?? "").trim().toUpperCase(),
      stageBilled,
      stageDpr,
      totalBilled,
      totalReceived,
      balance,
    });
  }
  return { rows: out, dupes };
}

// ---------------------------------------------------------------------------
// parse: Inventory - Summary  (header row index 2)  -> stage progress
// ---------------------------------------------------------------------------
type StageRow = {
  applicationId: string;
  stageKey: string;
  date: Date | null;
  district: string;
  mandal: string;
  village: string;
  name: string;
  aadhaar: string;
  onlineStatus: string;
  offlineStage: string;
  capturedOn: Date | null;
  labour: string;
  supervisor: string;
  amount: number;
  paymentDate: Date | null;
  paymentMode: string;
  billValue: number;
  received: number;
  balance: number;
  paymentBank: string;
  utr: string;
  approval: Record<string, Date | null>;
};

function parseInventory(wb: XLSX.WorkBook) {
  // Prefer a standalone Inventory-Summary CSV export when one is provided —
  // its column layout matches the workbook sheet (header on row index 2).
  let rows: unknown[][];
  if (INVENTORY_CSV) {
    const cwb = XLSX.readFile(INVENTORY_CSV);
    rows = XLSX.utils.sheet_to_json(cwb.Sheets[cwb.SheetNames[0]], {
      header: 1,
      defval: "",
    }) as unknown[][];
    console.log(`  (Inventory-Summary from CSV: ${INVENTORY_CSV})`);
  } else {
    rows = sheet(wb, "Inventory - Summary");
  }
  const H = rows[2] as string[];
  const c = (label: string) => H.findIndex((h) => String(h).trim() === label);
  const idx = {
    date: c("Date"),
    appId: c("Application Id"),
    stage: c("Stage"),
    district: c("District"),
    mandal: c("Mandal"),
    village: c("Village"),
    name: c("Beneficiary Name"),
    aadhaar: c("Aadhaar_No"),
    online: c("Online_Status"),
    offline: c("Off Line Stage"),
    captured: c("Captured as on date"),
    ps: c("PS"),
    ae: c("AE"),
    pd: c("PD"),
    collector: c("Collector"),
    ee: c("EE"),
    ce: c("CE"),
    md: c("MD"),
    labour: c("Labour Contractor Name"),
    supervisor: c("Supervisor Name"),
    amount: c("Amount"),
    payDate: c("Payment_Date"),
    payMode: c("Payment_Mode"),
    bill: c("Bill_Value"),
    received: c("Received_Amount"),
    balance: c("Balance"),
    bank: c("Payment Bank Name"),
    utr: H.findIndex((h) => String(h).trim().startsWith("UTR Number")),
  };

  const out: StageRow[] = [];
  const badStage = new Set<string>();
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const appId = String(row[idx.appId] ?? "").trim();
    if (!appId) continue;
    const raw = String(row[idx.stage] ?? "").trim().toUpperCase();
    const stageKey = STAGE_ALIASES[raw];
    if (!stageKey) {
      if (raw) badStage.add(raw);
      continue;
    }
    out.push({
      applicationId: appId,
      stageKey,
      date: xdate(row[idx.date]),
      district: canonDistrict(row[idx.district]),
      mandal: tidyName(row[idx.mandal]),
      village: tidyName(row[idx.village]),
      name: tidyName(row[idx.name]),
      aadhaar: digits(row[idx.aadhaar]),
      onlineStatus: String(row[idx.online] ?? "").trim(),
      offlineStage: String(row[idx.offline] ?? "").trim(),
      capturedOn: xdate(row[idx.captured]),
      labour: tidyName(row[idx.labour]),
      supervisor: tidyName(row[idx.supervisor]),
      amount: money(row[idx.amount]),
      paymentDate: xdate(row[idx.payDate]),
      paymentMode: normalizePaymentMode(row[idx.payMode]),
      billValue: money(row[idx.bill]),
      received: money(row[idx.received]),
      balance: money(row[idx.balance]),
      paymentBank: String(row[idx.bank] ?? "").trim(),
      utr: String(row[idx.utr] ?? "").trim(),
      approval: {
        PS: xdate(row[idx.ps]),
        AE: xdate(row[idx.ae]),
        PD: xdate(row[idx.pd]),
        Collector: xdate(row[idx.collector]),
        EE: xdate(row[idx.ee]),
        CE: xdate(row[idx.ce]),
        MD: xdate(row[idx.md]),
      },
    });
  }
  return { rows: out, badStage };
}

function normalizePaymentMode(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("icici")) return "ICICI Card";
  if (s.includes("golden")) return "Golden Rock Card";
  if (s.includes("eesha")) return "Eesha Card";
  if (s.includes("own") || s.includes("dbt")) return "DBT / Own Account";
  if (s.includes("cash")) return "Cash Collected";
  return String(v).trim();
}

// ---------------------------------------------------------------------------
// parse: CMS_Report  (header row index 2)  -> cards
// ---------------------------------------------------------------------------
function parseCards(wb: XLSX.WorkBook) {
  const rows = sheet(wb, "CMS_Report");
  const H = rows[2] as string[];
  const c = (label: string) => H.findIndex((h) => String(h).trim() === label);
  const idx = {
    card: c("Card Number"),
    holder: c("Name of Card Holder"),
    appId: c("Application ID"),
    status: c("Card Status"),
    account: c("Account Number"),
    balance: c("Account Balance"),
    ledger: c("Account Ledger Balance"),
    currency: c("Account Currency"),
    product: c("Product Name"),
    type: c("Card Type"),
    aadhaar: c("Aadhar_No"),
  };
  const out = [];
  const seen = new Set<string>();
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const card = digits(row[idx.card]);
    if (!card || card.length < 12) continue;
    if (seen.has(card)) continue;
    seen.add(card);
    out.push({
      cardNumber: card,
      holder: tidyName(row[idx.holder]),
      applicationId: String(row[idx.appId] ?? "").trim(),
      status: String(row[idx.status] ?? "").trim().toUpperCase(),
      account: digits(row[idx.account]),
      balance: money(row[idx.balance]),
      ledger: money(row[idx.ledger]),
      currency: String(row[idx.currency] ?? "INR").trim() || "INR",
      product: String(row[idx.product] ?? "").trim(),
      type: String(row[idx.type] ?? "").trim(),
      aadhaar: digits(row[idx.aadhaar]),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// parse: Cash_Transcation_Details  (header row index 1)  -> cash collections
// ---------------------------------------------------------------------------
function parseCash(wb: XLSX.WorkBook) {
  const rows = sheet(wb, "Cash_Transcation_Details");
  const out = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    const appId = String(row[2] ?? "").trim();
    const amount = money(row[10]);
    if (!appId || !amount) continue;
    out.push({
      date: xdate(row[1]),
      applicationId: appId,
      district: canonDistrict(row[3]),
      stageKey: STAGE_ALIASES[String(row[9] ?? "").trim().toUpperCase()] || null,
      collectedBy: tidyName(row[8]),
      amount,
      remarks: String(row[11] ?? "").trim(),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nReading ${FILE} …`);
  const wb = XLSX.readFile(FILE, { cellDates: false });

  const { rows: bens, dupes } = parseMappedList(wb);
  const { rows: stages, badStage } = parseInventory(wb);
  const cards = parseCards(wb);
  const cash = parseCash(wb);

  // ---- roll-up stats ----
  const districts = new Map<string, Set<string>>(); // district -> mandals
  for (const b of bens) {
    if (!districts.has(b.district)) districts.set(b.district, new Set());
    if (b.mandal) districts.get(b.district)!.add(b.mandal);
  }
  const stageCounts: Record<string, number> = {};
  for (const s of stages) stageCounts[s.stageKey] = (stageCounts[s.stageKey] || 0) + 1;

  const benByApp = new Map(bens.map((b) => [b.applicationId, b]));
  const stagesByApp = new Map<string, StageRow[]>();
  for (const s of stages) {
    if (!stagesByApp.has(s.applicationId)) stagesByApp.set(s.applicationId, []);
    stagesByApp.get(s.applicationId)!.push(s);
  }
  const stageAppsNotInList = [...stagesByApp.keys()].filter((a) => !benByApp.has(a));

  const labourNames = new Set(stages.map((s) => s.labour).filter(Boolean));
  const supervisorNames = new Set(stages.map((s) => s.supervisor).filter(Boolean));
  const totalBilled = bens.reduce((a, b) => a + b.totalBilled, 0);
  const totalReceived = bens.reduce((a, b) => a + b.totalReceived, 0);
  const cardsLinked = cards.filter((c) => benByApp.has(c.applicationId)).length;

  console.log("\n==================  DRY-RUN REPORT  ==================");
  console.log("Beneficiaries (Mapped_List, unique)  :", bens.length);
  console.log("  duplicate application ids skipped  :", dupes.length);
  console.log("Districts                            :", districts.size);
  for (const [d, ms] of [...districts].sort())
    console.log(`   - ${d.padEnd(24)} ${ms.size} mandals`);
  console.log("Stage-progress rows (Inventory)      :", stages.length);
  console.log("  by stage                           :", JSON.stringify(stageCounts));
  console.log("  unknown stage codes ignored        :", [...badStage].join(", ") || "none");
  console.log("  stage rows for apps NOT in list    :", stageAppsNotInList.length);
  console.log("Payment cards (CMS_Report, unique)   :", cards.length, `(linked to a beneficiary: ${cardsLinked})`);
  console.log("Cash collection entries              :", cash.length);
  console.log("Labour contractors (distinct)        :", labourNames.size);
  console.log("Supervisors (distinct)               :", supervisorNames.size);
  console.log("Total billed (Mapped_List)           : ₹", totalBilled.toLocaleString("en-IN"));
  console.log("Total received (Mapped_List)         : ₹", totalReceived.toLocaleString("en-IN"));
  console.log("Construction stage master            :", CONSTRUCTION_STAGES.map((s) => s.key).join(" → "));
  console.log("=====================================================\n");

  if (DRY) {
    console.log("DRY RUN — nothing written. Re-run without --dry-run to wipe & load.\n");
    await prisma.$disconnect();
    return;
  }

  await loadIntoDb({ bens, stages, cards, cash, benByApp, stagesByApp });
  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------
const oid = () => randomBytes(12).toString("hex");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chunkCreate(model: any, rows: any[], size = 300, label = "") {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size) });
    if (label && (i + size) % 1500 === 0)
      console.log(`  … ${Math.min(i + size, rows.length)}/${rows.length} ${label}`);
  }
}

async function loadIntoDb(data: {
  bens: BenRow[];
  stages: StageRow[];
  cards: ReturnType<typeof parseCards>;
  cash: ReturnType<typeof parseCash>;
  benByApp: Map<string, BenRow>;
  stagesByApp: Map<string, StageRow[]>;
}) {
  const { bens, stages, cards, cash, stagesByApp } = data;
  const t0 = Date.now();

  console.log("Wiping operational data (users/logins kept) …");
  const wipe = [
    "auditLog", "activityLog", "notification", "approval", "document",
    "issue", "qualityInspection", "measurement", "contractorBillItem",
    "contractorBill", "beneficiaryPayment", "cashCollection", "beneficiaryCard",
    "governmentFund", "expense", "materialConsumption", "stockTransaction",
    "grnItem", "grn", "purchaseItem", "purchaseOrder", "materialRequestItem",
    "materialRequest", "inventoryStock", "warehouse", "material", "supplier",
    "labourEntry", "labourVendor", "labourContractor", "supervisor",
    "contractor", "dailyProgressReport", "stagePhoto", "houseStageProgress",
    "house", "beneficiary", "project", "constructionStage", "village", "mandal",
    "district", "state", "counter",
  ];
  for (const m of wipe) {
    await (prisma as unknown as Record<string, { deleteMany: (a: object) => Promise<unknown> }>)[m].deleteMany({});
  }

  // ---- stage master ----
  const STAGE_SEQ = new Map(CONSTRUCTION_STAGES.map((s, i) => [s.key, i + 1]));
  const STAGE_NAME = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.name]));
  const STAGE_WEIGHT = new Map(CONSTRUCTION_STAGES.map((s) => [s.key, s.weight]));
  const TOTAL_WEIGHT = CONSTRUCTION_STAGES.reduce((a, s) => a + s.weight, 0);
  await prisma.constructionStage.createMany({
    data: CONSTRUCTION_STAGES.map((s, i) => ({
      key: s.key, sequence: i + 1, name: s.name, shortName: s.shortName,
      isMandatory: s.mandatory, needsQC: s.qc, weightPct: s.weight,
      billValue: s.billValue, paymentMilestone: s.milestone ?? null,
    })),
  });

  // ---- state / districts / mandals / villages ----
  const stateId = oid();
  await prisma.state.create({ data: { id: stateId, code: "TG", name: "Telangana" } });

  const clean = bens.filter((b) => b.district && b.mandal && (b.village || true));
  const skipped = bens.length - clean.length;

  const districtMap = new Map<string, string>();
  const distCodeMap = new Map<string, string>();
  const distNames = [...new Set(clean.map((b) => b.district))].sort();
  const usedCodes = new Set<string>();
  const mkCode = (name: string) => {
    const base = (name.replace(/[^A-Za-z]/g, "").toUpperCase() + "XXX").slice(0, 3);
    let code = base;
    for (let n = 2; usedCodes.has(code); n++) code = base.slice(0, 2) + n;
    usedCodes.add(code);
    return code;
  };
  await prisma.district.createMany({
    data: distNames.map((name) => {
      const id = oid();
      const code = mkCode(name);
      districtMap.set(name, id);
      distCodeMap.set(name, code);
      return { id, name, stateId, geoKey: name, code };
    }),
  });

  const mandalMap = new Map<string, string>();
  const mandalKeys = [...new Set(clean.map((b) => `${b.district}|${b.mandal}`))];
  await prisma.mandal.createMany({
    data: mandalKeys.map((key, i) => {
      const [d, m] = key.split("|");
      const id = oid();
      mandalMap.set(key, id);
      return { id, name: m, districtId: districtMap.get(d)!, code: `M${String(i + 1).padStart(4, "0")}` };
    }).filter((x) => x.districtId),
  });

  const villageMap = new Map<string, string>();
  const villageKeys = [...new Set(clean.map((b) => `${b.district}|${b.mandal}|${b.village || "Unspecified"}`))];
  const villageData = villageKeys.map((key, i) => {
    const [d, m, v] = key.split("|");
    const mId = mandalMap.get(`${d}|${m}`);
    if (!mId) return null;
    const id = oid();
    villageMap.set(key, id);
    return { id, name: v, mandalId: mId, code: `V${String(i + 1).padStart(5, "0")}` };
  }).filter(Boolean) as { id: string; name: string; mandalId: string; code: string }[];
  await chunkCreate(prisma.village, villageData);
  console.log(`  ${districtMap.size} districts, ${mandalMap.size} mandals, ${villageMap.size} villages (skipped ${skipped} junk rows)`);

  // ---- contractor + labour contractors + supervisors ----
  const astonicId = oid();
  await prisma.contractor.create({
    data: {
      id: astonicId, contractorCode: "ASTONIC", companyName: "Astonic Construction",
      ownerName: "Astonic Construction", districtIds: [...districtMap.values()], status: "ACTIVE",
    },
  });

  const labourNames = [...new Set(stages.map((s) => s.labour).filter(Boolean))].sort();
  await prisma.labourContractor.createMany({ data: labourNames.map((name) => ({ name })) });

  const supNames = [...new Set(stages.map((s) => s.supervisor).filter(Boolean))].sort();
  const supMap = new Map<string, string>();
  await prisma.supervisor.createMany({
    data: supNames.map((name, i) => {
      const id = oid();
      supMap.set(name.toLowerCase(), id);
      return { id, supervisorCode: `SUP-${String(i + 1).padStart(3, "0")}`, name, contractorId: astonicId };
    }),
  });
  console.log(`  Astonic + ${labourNames.length} labour contractors + ${supNames.length} supervisors`);

  // ---- build beneficiary / house / stage / payment rows in memory ----
  const DONE_ONLINE = /done|paid|approve payment done/i;
  const benIdByApp = new Map<string, string>();
  const distIdByApp = new Map<string, string>();
  const benRows: Prisma.BeneficiaryCreateManyInput[] = [];
  const houseRows: Prisma.HouseCreateManyInput[] = [];
  const stageRows: Prisma.HouseStageProgressCreateManyInput[] = [];
  const payRows: Prisma.BeneficiaryPaymentCreateManyInput[] = [];
  // The 4 payable stages map onto the 4 payment-milestone enum slots.
  const milestoneFor: Record<string, "FOUNDATION" | "PLINTH" | "ROOF" | "COMPLETION"> = {
    BL: "FOUNDATION", RL: "PLINTH", RC: "ROOF", COMP: "COMPLETION",
  };
  let seq = 0;

  for (const b of clean) {
    const dId = districtMap.get(b.district);
    const mId = mandalMap.get(`${b.district}|${b.mandal}`);
    const vId = villageMap.get(`${b.district}|${b.mandal}|${b.village || "Unspecified"}`);
    if (!dId || !mId || !vId) continue;

    const benId = oid();
    const houseId = oid();
    benIdByApp.set(b.applicationId, benId);
    distIdByApp.set(b.applicationId, dId);
    seq++;

    const myStages = stagesByApp.get(b.applicationId) ?? [];
    const byStage = new Map<string, StageRow>();
    for (const s of myStages) {
      const prev = byStage.get(s.stageKey);
      if (!prev || (s.date?.getTime() ?? 0) >= (prev.date?.getTime() ?? 0)) byStage.set(s.stageKey, s);
    }
    const aadhaar = b.aadhaar.length === 12 ? b.aadhaar : null;
    const anyLabour = myStages.find((s) => s.labour)?.labour ?? "";
    const anySup = myStages.find((s) => s.supervisor)?.supervisor ?? "";

    benRows.push({
      id: benId,
      beneficiaryCode: b.astCode || `II-TG-${String(seq).padStart(6, "0")}`,
      applicationNo: b.applicationId,
      applicationId: b.applicationId,
      astCode: b.astCode || null,
      name: b.name || "(unnamed)",
      cardHolderName: b.cardHolder || null,
      aadhaarLast4: aadhaar ? aadhaar.slice(-4) : null,
      aadhaarHash: aadhaar ? hashAadhaar(aadhaar) : null,
      iciciAccountLast4: last4(b.icici),
      iciciAccountEnc: b.icici || null,
      referenceNumber: b.referenceNumber || null,
      cmsAccountStatus: b.cmsStatus || null,
      sft: b.sft || null,
      initialListType: b.listType || null,
      mouDate: b.mouDate,
      mouStatus: b.mouStatus || null,
      stateId, districtId: dId, mandalId: mId, villageId: vId,
      scheme: "Indiramma Indlu",
      financialYear: "2025-26",
      sanctionAmount: b.totalBilled || 400000,
      houseType: b.sft || "400-SFT",
      status: "APPROVED",
      contractorId: astonicId,
    });

    // progress
    let weightDone = 0;
    let started = false;
    let compDone = false;
    let firstDate: Date | null = null;
    let actualCost = 0;
    for (const cs of CONSTRUCTION_STAGES) {
      const sr = byStage.get(cs.key);
      const billed = b.stageBilled[cs.key] ?? 0;
      const received = sr?.received ?? (billed && b.balance === 0 ? billed : 0);
      const online = sr?.onlineStatus ?? "";
      const isDone = received > 0 || DONE_ONLINE.test(online) || billed > 0;
      const w = STAGE_WEIGHT.get(cs.key) ?? 0;
      if (isDone) weightDone += w;
      else if (sr) weightDone += w * 0.4;
      if (sr) started = true;
      if (cs.key === "COMP" && isDone) compDone = true;
      actualCost += received;
      const d = sr?.date ?? b.stageDpr[cs.key] ?? null;
      if (d && (!firstDate || d < firstDate)) firstDate = d;

      const status: Prisma.HouseStageProgressCreateManyInput["status"] = isDone
        ? "COMPLETED"
        : sr
          ? /MD|CE|EE|Collector|PD|AE/i.test(online) ? "PENDING_VERIFICATION" : "IN_PROGRESS"
          : "NOT_STARTED";
      const bill = sr?.billValue || billed || cs.billValue;
      stageRows.push({
        houseId, stageKey: cs.key, stageName: cs.name, sequence: STAGE_SEQ.get(cs.key) ?? 0,
        progressPct: isDone ? 100 : sr ? 40 : 0,
        stageCost: received,
        status,
        actualStart: sr?.date ?? b.stageDpr[cs.key] ?? null,
        actualEnd: isDone ? (sr?.paymentDate ?? sr?.date ?? b.stageDpr[cs.key] ?? null) : null,
        contractorId: astonicId,
        supervisorName: sr?.supervisor || anySup || null,
        labourContractorName: sr?.labour || anyLabour || null,
        onlineStatus: online || null,
        offlineStage: sr?.offlineStage || null,
        capturedOn: sr?.capturedOn ?? null,
        billValue: bill,
        receivedAmount: received,
        balanceAmount: Math.max(0, bill - received),
        paymentMode: sr?.paymentMode || null,
        paymentDate: sr?.paymentDate ?? null,
        paymentBankName: sr?.paymentBank || null,
        utrNumber: sr?.utr || null,
        psDate: sr?.approval.PS ?? null,
        aeDate: sr?.approval.AE ?? null,
        pdDate: sr?.approval.PD ?? null,
        collectorDate: sr?.approval.Collector ?? null,
        eeDate: sr?.approval.EE ?? null,
        ceDate: sr?.approval.CE ?? null,
        mdDate: sr?.approval.MD ?? null,
        approvalStatus: isDone ? "APPROVED" : "PENDING",
      });

      const ms = milestoneFor[cs.key];
      if (ms && (billed || cs.billValue)) {
        const eligible = billed || cs.billValue;
        payRows.push({
          beneficiaryId: benId, houseId, milestone: ms,
          eligibleAmount: eligible, releasedAmount: received,
          status: received >= eligible ? "PAID" : received > 0 ? "PROCESSING" : "ELIGIBLE",
          txnRef: sr?.utr || null, bankName: sr?.paymentBank || null, paymentDate: sr?.paymentDate ?? null,
        });
      }
    }
    const progressPct = Math.round((weightDone / TOTAL_WEIGHT) * 1000) / 10;
    const houseStatus: Prisma.HouseCreateManyInput["status"] = compDone
      ? "COMPLETED"
      : progressPct <= 0 ? "NOT_STARTED" : progressPct >= 60 ? "UNDER_CONSTRUCTION" : "IN_PROGRESS";
    const doneKeys = CONSTRUCTION_STAGES.filter((cs) => {
      const sr = byStage.get(cs.key);
      const billed = b.stageBilled[cs.key] ?? 0;
      return (sr && (sr.received > 0 || DONE_ONLINE.test(sr.onlineStatus))) || billed > 0;
    }).map((cs) => cs.key);
    const inProg = CONSTRUCTION_STAGES.find((cs) => byStage.has(cs.key) && !doneKeys.includes(cs.key))?.key;
    const currentKey = inProg ?? doneKeys[doneKeys.length - 1] ?? "AUGER";

    houseRows.push({
      id: houseId,
      houseCode: b.astCode || `II-TG-H-${String(seq).padStart(6, "0")}`,
      beneficiaryId: benId,
      stateId, districtId: dId, mandalId: mId, villageId: vId,
      contractorId: astonicId,
      supervisorId: anySup ? supMap.get(anySup.toLowerCase()) ?? null : null,
      startDate: firstDate,
      actualCompletion: compDone ? byStage.get("COMP")?.date ?? null : null,
      estimatedCost: b.totalBilled || 400000,
      actualCost,
      currentStageKey: currentKey,
      currentStageName: STAGE_NAME.get(currentKey) ?? currentKey,
      progressPct,
      status: houseStatus,
      scheduleHealth: "ON_SCHEDULE",
      healthScore: Math.max(20, Math.min(100, Math.round(progressPct) + 30)),
    });
  }

  console.log(`Writing ${benRows.length} beneficiaries …`);
  await chunkCreate(prisma.beneficiary, benRows, 300, "beneficiaries");
  await chunkCreate(prisma.house, houseRows, 300, "houses");
  await chunkCreate(prisma.houseStageProgress, stageRows, 500, "stage rows");
  await chunkCreate(prisma.beneficiaryPayment, payRows, 500, "payments");

  // ---- cards ----
  const cardRows = cards.map((c) => ({
    beneficiaryId: benIdByApp.get(c.applicationId) ?? null,
    applicationId: c.applicationId || null,
    cardNumberLast4: c.cardNumber.slice(-4),
    cardNumberEnc: c.cardNumber,
    holderName: c.holder || null,
    status: c.status || null,
    accountNumber: c.account || null,
    accountBalance: c.balance,
    ledgerBalance: c.ledger,
    currency: c.currency,
    productName: c.product || null,
    cardType: c.type || null,
    aadhaarLast4: c.aadhaar.length >= 4 ? c.aadhaar.slice(-4) : null,
  }));
  await chunkCreate(prisma.beneficiaryCard, cardRows, 500, "cards");

  // ---- cash ----
  const cashRows = cash.map((cc) => ({
    beneficiaryId: benIdByApp.get(cc.applicationId) ?? null,
    applicationId: cc.applicationId || null,
    date: cc.date,
    districtId: distIdByApp.get(cc.applicationId) ?? null,
    stageKey: cc.stageKey,
    collectedBy: cc.collectedBy || null,
    amount: cc.amount,
    remarks: cc.remarks || null,
  }));
  await chunkCreate(prisma.cashCollection, cashRows, 500);

  // ---- labour roll-ups ----
  const labourHouses = new Map<string, Set<string>>();
  for (const s of stages) {
    if (!s.labour) continue;
    const k = s.labour;
    if (!labourHouses.has(k)) labourHouses.set(k, new Set());
    labourHouses.get(k)!.add(s.applicationId);
  }
  for (const [name, apps] of labourHouses) {
    await prisma.labourContractor.updateMany({ where: { name }, data: { totalHouses: apps.size } });
  }

  // ---- one Astonic project + one govt-fund record per district ----
  const projRows = [];
  const fundRows = [];
  let fn = 0;
  for (const [dName, dId] of districtMap) {
    const apps = clean.filter((b) => b.district === dName);
    const agg = await prisma.house.aggregate({
      where: { districtId: dId },
      _avg: { progressPct: true },
      _sum: { actualCost: true },
    });
    const received = agg._sum.actualCost ?? 0;
    projRows.push({
      code: `AST-${distCodeMap.get(dName) ?? dName.slice(0, 3).toUpperCase()}`,
      name: `Astonic Indiramma Indlu — ${dName}`,
      stateId, districtId: dId, financialYear: "2025-26",
      plannedHouses: apps.length,
      approvedBudget: apps.reduce((a, b) => a + (b.totalBilled || 400000), 0),
      contractorId: astonicId, status: "ACTIVE" as const,
      progressPct: Math.round((agg._avg.progressPct ?? 0) * 10) / 10,
      totalExpenditure: received,
    });
    if (received > 0) {
      fundRows.push({
        releaseNo: `TSHCL/IND/2025-26/${distCodeMap.get(dName)}/${String(++fn).padStart(3, "0")}`,
        financialYear: "2025-26",
        releaseDate: new Date("2026-04-01"),
        amount: received,
        department: "Telangana State Housing Corporation Ltd (TSHCL)",
        districtId: dId,
      });
    }
  }
  await prisma.project.createMany({ data: projRows });
  if (fundRows.length) await prisma.governmentFund.createMany({ data: fundRows });

  const counts = {
    beneficiaries: await prisma.beneficiary.count(),
    houses: await prisma.house.count(),
    stageProgress: await prisma.houseStageProgress.count(),
    cards: await prisma.beneficiaryCard.count(),
    cardsLinked: await prisma.beneficiaryCard.count({ where: { beneficiaryId: { not: null } } }),
    cash: await prisma.cashCollection.count(),
    payments: await prisma.beneficiaryPayment.count(),
    districts: await prisma.district.count(),
    mandals: await prisma.mandal.count(),
    villages: await prisma.village.count(),
    labourContractors: await prisma.labourContractor.count(),
    supervisors: await prisma.supervisor.count(),
    projects: await prisma.project.count(),
  };
  console.log(`\n✅ IMPORT COMPLETE in ${((Date.now() - t0) / 1000).toFixed(0)}s:`, JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
