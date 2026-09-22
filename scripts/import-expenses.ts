/**
 * Import the "EESHA Telangana Astonic Payment Summary" workbook into Expense.
 *
 *   npx tsx scripts/import-expenses.ts [path/to/workbook.xlsx] [--dry-run]
 *
 * Default path: data/payment-summary.xlsx (gitignored).
 *   PAYMENTS SUMMARY  → PAY-xxxx  (vendor / bank payments)
 *   Prasad Expenses   → EXP-xxxx  (site expenses paid by supervisors)
 * Re-runnable: all PAY-/EXP- rows are replaced on every real run. Expenses
 * entered by hand in the app (other codes) are left alone.
 * The purchase registers (AAC BLOCKS, MATERIAL INVENTORY) are NOT imported —
 * they are the invoices behind the vendor payments and would double-count.
 */
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FILE = args.find((a) => !a.startsWith("--")) ?? "data/payment-summary.xlsx";

type Cell = string | number | boolean | null;
const str = (v: Cell) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
const key = (v: Cell) => str(v).toLowerCase().replace(/[^a-z]/g, "");

/** Excel serial → UTC midnight; also accepts "dd/mm/yyyy[-…]" / "dd-mm-yyyy TO …" ranges (first date). */
function toDate(v: Cell): Date | null {
  if (typeof v === "number") return new Date(Math.round(v) * 86400000 + Date.UTC(1899, 11, 30));
  const m = str(v).match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Sheet "Code" / "Purpose" spellings → one category label.
const CATEGORY_ALIASES: Record<string, string> = {
  diesel: "Diesel", dieselforauger: "Diesel for Auger",
  sitexpenses: "Site Expenses", siteexpenses: "Site Expenses", site: "Site Expenses", expense: "Site Expenses",
  sitemaintainance: "Site Expenses", hubexpenses: "Site Expenses", roomexpenses: "Room Rent", roomrent: "Room Rent",
  officerent: "Room Rent", resort: "Room Rent", hotel: "Room Rent",
  tools: "Tools", toolsmachines: "Tools", roomtools: "Tools", comptools: "Tools", rctools: "Tools", rltools: "Tools",
  toolspurchase: "Tools",
  transport: "Transport", tranport: "Transport", shifting: "Transport", travel: "Travel", travellingexpenses: "Travel",
  vehiclerents: "Vehicle Rent", jcb: "Vehicle Rent",
  vehiclemaintainance: "Vehicle Maintenance", vehiclemaintance: "Vehicle Maintenance", tractorreapair: "Vehicle Maintenance",
  tolls: "Tolls & FASTag", tollsamount: "Tolls & FASTag", fasttagrecharge: "Tolls & FASTag",
  loadingunloading: "Loading / Unloading",
  food: "Food", foodexpenses: "Food", labourfoodexpenses: "Food",
  electricals: "Electricals", electicals: "Electricals", siteelectrical: "Electricals", tubelight: "Electricals",
  electricity: "Power Bill", powerbill: "Power Bill", broadband: "Power Bill",
  runners: "Runners", runnersforplywood: "Runners",
  cement: "Cement", steel: "Steel", ironpurchased: "Steel", ironpurchase: "Steel", iron: "Steel", steelpurchase: "Steel",
  ironmoulds: "Steel", bindingwire: "Binding Wire", nails: "Nails",
  aggregate: "Aggregate", aggregatesrikanthreddy: "Aggregate", aggregatejagan: "Aggregate",
  pendingaggregatebill: "Aggregate", sand: "Sand", robosand: "Sand",
  material: "Material", materialexpenses: "Material", rcmaterial: "Material", materialsupplier: "Material",
  hardware: "Material", halfinchpipes: "Material", suitpipe: "Material", tarpa: "Material", tarp: "Material", tent: "Material",
  wood: "Plywood & Wood", plywood: "Plywood & Wood", plywoodshuttering: "Plywood & Wood", cenertingwoodamount: "Plywood & Wood",
  doorframes: "Doors & Windows", africanteakdoorframe: "Doors & Windows", windowsframes: "Doors & Windows",
  sliders: "Doors & Windows", slidres: "Doors & Windows",
  bricks: "Bricks & Blocks", aacblocks: "Bricks & Blocks",
  beta: "Beta (RMC Batta)", readymix: "Ready Mix (RMC)",
  labour: "Labour", labourcharges: "Labour", labourpayment: "Labour", labourvendor: "Labour",
  labourmaintainance: "Labour", carpenter: "Labour",
  augering: "Augering",
  staffsalaries: "Salaries", driversalary: "Salaries", driversalaries: "Salaries", salaryinadvance: "Salaries",
  salaryadvance: "Salaries", supervisorexpesnes: "Salaries",
  opting: "Driver Opting", optingdriver: "Driver Opting", driveropting: "Driver Opting",
  stationary: "Office & Stationery", officeexpenses: "Office & Stationery", xerox: "Office & Stationery",
  stickfiles: "Office & Stationery", visitingcards: "Office & Stationery", newspaper: "Office & Stationery",
  notaryexpenses: "Office & Stationery",
  modelhouseexpenses: "Model House", model: "Model House",
  benificiarypayment: "Beneficiary Payment",
  iciccards: "Card Payment", icicicards: "Card Payment",
};
function category(raw: Cell, fallback: string) {
  const k = key(raw);
  if (!k) return fallback;
  return CATEGORY_ALIASES[k] ?? "Miscellaneous";
}

// Sheet district spellings → DB district name.
const DISTRICT_ALIASES: Record<string, string> = {
  janagaon: "Jangaon", jangaon: "Jangaon", bhongir: "Yadadri Bhuvanagiri", hanamkonda: "Hanumakonda",
  hanmakonda: "Hanumakonda", kothagudem: "Bhadradri Kothagudem", mehaboobabad: "Mahabubabad",
  mehaboobnagar: "Mahabubnagar", mehabubnagar: "Mahabubnagar", mbnr: "Mahabubnagar",
};

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function rows(wb: XLSX.WorkBook, sheet: string): Cell[][] {
  const ws = wb.Sheets[sheet];
  if (!ws) throw new Error(`Sheet "${sheet}" not found in ${FILE}`);
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: null, raw: true });
}

async function main() {
  const wb = XLSX.readFile(FILE);
  const districts = await prisma.district.findMany({ include: { mandals: true } });
  const byDistrictName = new Map(districts.map((d) => [key(d.name), d]));
  // Rural mandals first so "Wardhannapet" prefers "Wardhanna Pet" over its municipality.
  const allMandals = districts
    .flatMap((d) => d.mandals.map((m) => ({ ...m, k: key(m.name.replace(/municipality|municipal corporation/i, "")) })))
    .sort((a, b) => Number(/municipal/i.test(a.name)) - Number(/municipal/i.test(b.name)));

  const unmatched = new Map<string, number>();
  const miss = (what: string) => unmatched.set(what, (unmatched.get(what) ?? 0) + 1);

  function locate(distRaw: Cell, mandalRaw: Cell) {
    const findDistrict = (k: string) => (k ? byDistrictName.get(key(DISTRICT_ALIASES[k] ?? k)) : undefined);
    let mk = key(mandalRaw);
    const dk = key(distRaw);
    let d = findDistrict(dk);
    // Payments "Place" is sometimes a district ("Hanmakonda", "MBNR") rather than a mandal.
    if (!d && !dk && findDistrict(mk)) { d = findDistrict(mk); mk = ""; }
    if (d && (mk === key(d.name) || mk === dk)) mk = "";
    const nearest = (pool: typeof allMandals) => {
      let best = Infinity, hit: (typeof allMandals)[number] | undefined;
      for (const m of pool) {
        const s = m.k === mk ? 0 : m.k.startsWith(mk) || mk.startsWith(m.k) ? 0.5 : lev(m.k, mk);
        if (s < best) { best = s; hit = m; }
      }
      return best <= Math.max(2, Math.floor(mk.length / 4)) ? hit : undefined;
    };
    let mandal: (typeof allMandals)[number] | undefined;
    if (mk && !["hub", "office", "staff", "urban"].includes(mk)) {
      // Sheet districts are loose (Parvathagiri is filed under Hanamkonda, it's Warangal) —
      // fall back to every mandal, and then trust the mandal's real district.
      mandal = (d && nearest(allMandals.filter((m) => m.districtId === d!.id))) || nearest(allMandals);
    }
    const district = mandal ? districts.find((x) => x.id === mandal!.districtId) : d;
    if (dk && !district) miss(`district: ${str(distRaw)}`);
    if (mk && !mandal && !["hub", "office", "staff", "urban"].includes(mk)) miss(`mandal: ${str(mandalRaw)}`);
    return { districtId: district?.id ?? null, mandalId: mandal?.id ?? null };
  }

  type Exp = {
    expenseCode: string; date: Date; category: string; description: string | null; amount: number;
    paymentMode: string | null; paidBy: string | null; vendor: string | null; reference: string | null;
    remarks: string | null; districtId: string | null; mandalId: string | null;
  };
  const out: Exp[] = [];
  const skipped: string[] = [];

  // PAYMENTS SUMMARY: _, Sno, Date, Purpose, Place, VENDOR, Description, Chq./Ref.No., Amount, REMARKS
  for (const r of rows(wb, "PAYMENTS SUMMARY").slice(1)) {
    const amount = r[8];
    if (typeof amount !== "number" || !amount || typeof r[1] !== "number") continue;
    const date = toDate(r[2]);
    if (!date) { skipped.push(`PAY ${r[1]}: no date`); continue; }
    const ref = str(r[7]);
    const place = str(r[4]);
    out.push({
      expenseCode: `PAY-${String(r[1]).padStart(4, "0")}`,
      date, amount,
      category: category(r[3], "Vendor Payment"),
      description: str(r[6]) || str(r[3]) || null,
      paymentMode: /phone ?pe/i.test(ref) ? "PhonePe" : /cash/i.test(ref) ? "Cash" : "Bank Transfer",
      paidBy: "EESHA Infra (Head Office)",
      vendor: str(r[5]) || null,
      reference: ref || null,
      remarks: [str(r[9]), place && `Place: ${place}`].filter(Boolean).join(" · ") || null,
      ...locate(null, place),
    });
  }

  // Prasad Expenses: _, Sno, Date, Payment By, Code, DIST, Mandal, Description, Material, QTY, Rate, Amount, REMARKS
  for (const r of rows(wb, "Prasad Expenses").slice(3)) {
    const amount = r[11];
    if (typeof amount !== "number" || !amount || typeof r[1] !== "number") continue;
    const date = toDate(r[2]);
    if (!date) { skipped.push(`EXP ${r[1]}: no date (${str(r[2])})`); continue; }
    const qty = typeof r[9] === "number" ? +r[9].toFixed(2) : null;
    const detail = [str(r[8]), qty != null && r[10] != null ? `${qty} × ₹${r[10]}` : ""].filter(Boolean).join(" · ");
    const rawDate = typeof r[2] === "string" ? `Period: ${str(r[2])}` : "";
    out.push({
      expenseCode: `EXP-${String(r[1]).padStart(4, "0")}`,
      date, amount: +amount.toFixed(2),
      category: category(r[4], "Site Expenses"),
      description: [str(r[7]), detail].filter(Boolean).join(" — ") || null,
      paymentMode: "Site Cash",
      paidBy: str(r[3]) ? titleCase(str(r[3])) : null,
      vendor: null,
      reference: null,
      remarks: [str(r[12]), rawDate, str(r[4]) && `Code: ${str(r[4])}`].filter(Boolean).join(" · ") || null,
      ...locate(r[5], r[6]),
    });
  }

  const dupes = out.map((e) => e.expenseCode).filter((c, i, a) => a.indexOf(c) !== i);
  if (dupes.length) throw new Error(`Duplicate Sno in workbook: ${[...new Set(dupes)].join(", ")}`);

  const sum = (p: string) => out.filter((e) => e.expenseCode.startsWith(p)).reduce((a, e) => a + e.amount, 0);
  const cats = new Map<string, number>();
  for (const e of out) cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
  console.log(`Vendor payments: ${out.filter((e) => e.expenseCode.startsWith("PAY")).length} rows, ₹${sum("PAY").toLocaleString("en-IN")}`);
  console.log(`Site expenses:   ${out.filter((e) => e.expenseCode.startsWith("EXP")).length} rows, ₹${sum("EXP").toLocaleString("en-IN")}`);
  console.log(`With district: ${out.filter((e) => e.districtId).length}, with mandal: ${out.filter((e) => e.mandalId).length}`);
  console.log("By category:", [...cats].sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ₹${Math.round(v).toLocaleString("en-IN")}`).join(" | "));
  if (skipped.length) console.log("Skipped:", skipped);
  if (unmatched.size) console.log("Unmatched locations:", Object.fromEntries(unmatched));

  if (DRY) { console.log("--dry-run: nothing written."); return; }

  const del = await prisma.expense.deleteMany({
    where: { OR: [{ expenseCode: { startsWith: "PAY-" } }, { expenseCode: { startsWith: "EXP-" } }] },
  });
  for (let i = 0; i < out.length; i += 500) {
    await prisma.expense.createMany({
      data: out.slice(i, i + 500).map((e) => ({ ...e, gst: 0, status: "PAID" as const })),
    });
  }
  console.log(`Replaced ${del.count} → ${out.length} expenses.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
