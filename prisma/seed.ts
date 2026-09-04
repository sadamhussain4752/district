import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CONSTRUCTION_STAGES } from "../src/lib/constants";
import { computeHouseProgress } from "../src/lib/progress";

const prisma = new PrismaClient();

// ---- deterministic RNG ----
let seed = 20260904;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const chance = (p: number) => rng() < p;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000);

const PASSWORD_HASH = bcrypt.hashSync("password123", 12);

const counters: Record<string, number> = {};
const seq = (k: string) => (counters[k] = (counters[k] || 0) + 1);
const pad = (n: number, l = 5) => String(n).padStart(l, "0");

const DISTRICTS: { name: string; code: string; geoKey: string; hq: string }[] = [
  { name: "Adilabad", code: "ADB", geoKey: "01", hq: "Adilabad" },
  { name: "Nizamabad", code: "NZB", geoKey: "02", hq: "Nizamabad" },
  { name: "Karimnagar", code: "KRM", geoKey: "03", hq: "Karimnagar" },
  { name: "Medak", code: "MDK", geoKey: "04", hq: "Sangareddy" },
  { name: "Rangareddy", code: "RNG", geoKey: "05", hq: "Shamshabad" },
  { name: "Hyderabad", code: "HYD", geoKey: "06", hq: "Hyderabad" },
  { name: "Mahabubnagar", code: "MBN", geoKey: "07", hq: "Mahabubnagar" },
  { name: "Nalgonda", code: "NLG", geoKey: "08", hq: "Nalgonda" },
  { name: "Warangal", code: "WGL", geoKey: "09", hq: "Warangal" },
  { name: "Khammam", code: "KMM", geoKey: "10", hq: "Khammam" },
];

const MANDAL_NAMES = [
  "Bheemgal", "Kamareddy", "Jagtial", "Sircilla", "Huzurabad", "Manthani",
  "Bhongir", "Devarakonda", "Miryalaguda", "Kodad", "Wardhannapet", "Narsampet",
  "Palakurthi", "Madhira", "Yellandu", "Sathupalli", "Kollapur", "Wanaparthy",
  "Gadwal", "Narayanpet", "Zaheerabad", "Narsapur", "Toopran", "Ibrahimpatnam",
  "Maheshwaram", "Chevella", "Vikarabad", "Utnoor", "Nirmal", "Bhainsa",
];

const VILLAGE_NAMES = [
  "Kothapally", "Rampur", "Gangapur", "Lakshmipur", "Venkatapur", "Rajapet",
  "Ananthagiri", "Cheruvugattu", "Mallapur", "Peddapur", "Chinnagudem",
  "Nemmani", "Aliabad", "Yellareddy", "Damaragidda", "Bommena", "Tallapally",
  "Konapur", "Singaram", "Jangamguda",
];

const FIRST_NAMES = [
  "Ramulu", "Lakshmi", "Venkatesh", "Anjamma", "Srinivas", "Padma", "Narsimha",
  "Yadamma", "Mallesh", "Sunitha", "Krishna", "Bhagya", "Rajender", "Sarojana",
  "Ravi", "Kavitha", "Prakash", "Shobha", "Naresh", "Manjula", "Ganesh",
  "Swaroopa", "Balraj", "Renuka", "Sudhakar", "Latha", "Mahesh", "Sujatha",
];
const SURNAMES = [
  "Gande", "Boda", "Mekala", "Racha", "Kandi", "Cheruku", "Adepu", "Bandari",
  "Gajula", "Kummari", "Vaddera", "Nalla", "Pati", "Godishala", "Erra",
  "Bugatha", "Kotha", "Peddi", "Sunkari", "Thouti",
];

const MATERIALS: Prisma.MaterialCreateManyInput[] = [
  { materialCode: "MAT-CEM", name: "Cement (OPC 53)", category: "Cement", unit: "Bag", brand: "UltraTech", reorderLevel: 500, standardRate: 380 },
  { materialCode: "MAT-STL", name: "TMT Steel Fe500", category: "Steel", unit: "MT", brand: "SAIL", reorderLevel: 8, standardRate: 62000 },
  { materialCode: "MAT-BRK", name: "Red Bricks", category: "Masonry", unit: "No", reorderLevel: 20000, standardRate: 7 },
  { materialCode: "MAT-BLK", name: "Cement Blocks 6\"", category: "Masonry", unit: "No", reorderLevel: 5000, standardRate: 32 },
  { materialCode: "MAT-SND", name: "River Sand", category: "Aggregate", unit: "CFT", reorderLevel: 2000, standardRate: 45 },
  { materialCode: "MAT-AGG", name: "20mm Aggregate", category: "Aggregate", unit: "CFT", reorderLevel: 1500, standardRate: 42 },
  { materialCode: "MAT-ELE", name: "Electrical Wiring Set", category: "Electrical", unit: "Set", reorderLevel: 40, standardRate: 4800 },
  { materialCode: "MAT-PLM", name: "Plumbing & Sanitary Set", category: "Plumbing", unit: "Set", reorderLevel: 40, standardRate: 6500 },
  { materialCode: "MAT-TIL", name: "Vitrified Tiles 2x2", category: "Finishing", unit: "Box", reorderLevel: 300, standardRate: 620 },
  { materialCode: "MAT-PNT", name: "Emulsion Paint", category: "Finishing", unit: "Litre", reorderLevel: 400, standardRate: 210 },
  { materialCode: "MAT-DOR", name: "Door Frame + Shutter", category: "Joinery", unit: "No", reorderLevel: 60, standardRate: 5400 },
  { materialCode: "MAT-WIN", name: "Window (UPVC)", category: "Joinery", unit: "No", reorderLevel: 80, standardRate: 3800 },
];

async function main() {
  console.log("Clearing existing data…");
  const models = [
    "auditLog", "activityLog", "notification", "approval", "document",
    "issue", "qualityInspection", "measurement", "contractorBillItem",
    "contractorBill", "beneficiaryPayment", "governmentFund", "expense",
    "materialConsumption", "stockTransaction", "grnItem", "grn", "purchaseItem",
    "purchaseOrder", "materialRequestItem", "materialRequest", "inventoryStock",
    "warehouse", "material", "supplier", "labourEntry", "labourVendor",
    "supervisor", "contractor", "dailyProgressReport", "stagePhoto",
    "houseStageProgress", "house", "beneficiary", "project", "constructionStage",
    "village", "mandal", "district", "state", "counter", "refreshToken", "user",
  ] as const;
  for (const m of models) {
    await (prisma as Record<string, { deleteMany: (a: object) => Promise<unknown> }>)[
      m
    ].deleteMany({});
  }

  console.log("Seeding location hierarchy…");
  const state = await prisma.state.create({
    data: { code: "TG", name: "Telangana" },
  });

  const districts = [];
  for (const d of DISTRICTS) {
    const district = await prisma.district.create({
      data: {
        code: d.code, name: d.name, geoKey: d.geoKey,
        headquarters: d.hq, stateId: state.id,
      },
    });
    const mandals = [];
    const mandalCount = int(2, 3);
    for (let i = 0; i < mandalCount; i++) {
      const mName = `${pick(MANDAL_NAMES)}`;
      const mandal = await prisma.mandal.create({
        data: {
          code: `${d.code}-M${i + 1}`,
          name: mName,
          districtId: district.id,
        },
      });
      const villages = [];
      for (let v = 0; v < int(2, 3); v++) {
        const village = await prisma.village.create({
          data: {
            code: `${d.code}-M${i + 1}-V${v + 1}`,
            name: pick(VILLAGE_NAMES),
            mandalId: mandal.id,
            pinCode: `50${int(1000, 9999)}`,
            isUrban: d.code === "HYD" || chance(0.2),
          },
        });
        villages.push(village);
      }
      mandals.push({ ...mandal, villages });
    }
    districts.push({ ...district, mandals });
  }

  console.log("Seeding construction stages…");
  await prisma.constructionStage.createMany({
    data: CONSTRUCTION_STAGES.map((s, i) => ({
      key: s.key, sequence: i + 1, name: s.name, isMandatory: s.mandatory,
      needsQC: s.qc, weightPct: s.weight,
      paymentMilestone: s.milestone ?? null,
    })),
  });

  console.log("Seeding users…");
  const mk = (
    employeeId: string, name: string, role: Prisma.UserCreateInput["role"],
    extra: Partial<Prisma.UserCreateInput> = {},
  ) =>
    prisma.user.create({
      data: {
        employeeId, name, role,
        email: `${employeeId.toLowerCase()}@indirammailu.tg.gov.in`,
        mobile: `9${int(100000000, 999999999)}`,
        passwordHash: PASSWORD_HASH,
        stateId: state.id,
        permissions: role === "SUPER_ADMIN" ? ["sensitive:view"] : [],
        ...extra,
      },
    });

  const admin = await mk("ADMIN001", "K. Prabhakar Rao", "SUPER_ADMIN");
  await mk("STATE001", "M. Dana Kishore", "STATE_ADMIN");
  await mk("ACC-002", "G. Sridevi", "ACCOUNTS", { department: "Finance" });
  await mk("AUD-001", "P. Ramesh", "AUDITOR");
  await mk("STORE-001", "B. Anjaneyulu", "STORE_MANAGER");

  const ranga = districts.find((d) => d.code === "RNG")!;
  await mk("DM-RANGA", "S. Harish", "DISTRICT_MANAGER", {
    districtId: ranga.id,
  });
  for (const d of districts) {
    if (d.code === "RNG") continue;
    if (chance(0.6))
      await mk(`DM-${d.code}`, `District Manager ${d.name}`, "DISTRICT_MANAGER", {
        districtId: d.id,
      });
  }

  const pms = [];
  for (let i = 1; i <= 8; i++) {
    const d = districts[i % districts.length];
    pms.push(
      await mk(`PM-00${i}`, `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`, "PROJECT_MANAGER", {
        districtId: d.id,
        department: "Project Management",
      }),
    );
  }
  const engineers = [];
  for (let i = 1; i <= 20; i++) {
    const d = districts[i % districts.length];
    engineers.push(
      await mk(`ENG-0${String(i).padStart(2, "0")}`, `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`, "SITE_ENGINEER", {
        districtId: d.id,
      }),
    );
  }
  for (let i = 1; i <= 7; i++) {
    await mk(`CON-00${i}`, `Contractor Rep ${i}`, "CONTRACTOR");
  }

  console.log("Seeding contractors, supervisors, labour vendors…");
  const contractors = [];
  const COMPANIES = [
    "Sri Sai Constructions", "Balaji Infra Projects", "Deccan Builders",
    "Telangana Housing Corp", "Godavari Constructions", "Kakatiya Infratech",
    "Nagarjuna Builders",
  ];
  for (let i = 0; i < COMPANIES.length; i++) {
    const assigned = [districts[i % districts.length].id, districts[(i + 1) % districts.length].id];
    contractors.push(
      await prisma.contractor.create({
        data: {
          contractorCode: `CTR-${String(i + 1).padStart(3, "0")}`,
          companyName: COMPANIES[i],
          ownerName: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
          gstin: `36ABCDE${int(1000, 9999)}F1Z${int(1, 9)}`,
          pan: `ABCDE${int(1000, 9999)}F`,
          registrationNo: `TSCONREG/${2020 + i}/${int(100, 999)}`,
          contactPhone: `9${int(100000000, 999999999)}`,
          email: `contact@${COMPANIES[i].toLowerCase().replace(/[^a-z]/g, "")}.in`,
          districtIds: assigned,
          contractValue: int(5, 40) * 10_000_000,
          securityDeposit: int(20, 90) * 100_000,
          startDate: daysAgo(int(200, 500)),
          completionDate: daysAhead(int(100, 400)),
          performanceScore: int(58, 95),
          qualityScore: int(60, 96),
        },
      }),
    );
  }

  const supervisors = [];
  for (let i = 0; i < 14; i++) {
    const d = districts[i % districts.length];
    supervisors.push(
      await prisma.supervisor.create({
        data: {
          supervisorCode: `SUP-${String(i + 1).padStart(3, "0")}`,
          name: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
          mobile: `9${int(100000000, 999999999)}`,
          districtId: d.id,
          contractorId: pick(contractors).id,
          activeSites: int(2, 9),
          lastVisitAt: daysAgo(int(0, 6)),
        },
      }),
    );
  }

  const labourVendors = [];
  const TRADES = ["Masonry", "RCC & Shuttering", "Electrical", "Plumbing", "Painting", "Finishing"];
  for (let i = 0; i < 8; i++) {
    labourVendors.push(
      await prisma.labourVendor.create({
        data: {
          vendorCode: `LV-${String(i + 1).padStart(3, "0")}`,
          name: `${pick(SURNAMES)} Labour Contractors`,
          trade: TRADES[i % TRADES.length],
          contactPhone: `9${int(100000000, 999999999)}`,
          contractorId: pick(contractors).id,
          districtId: districts[i % districts.length].id,
          workerCount: int(15, 60),
          rateType: pick(["DAILY", "CONTRACT", "QUANTITY"]),
        },
      }),
    );
  }

  console.log("Seeding materials, warehouses, stock…");
  await prisma.material.createMany({ data: MATERIALS });
  const materials = await prisma.material.findMany();
  await prisma.supplier.createMany({
    data: [
      { code: "SUP-001", name: "Sri Venkateswara Traders", gstin: "36AABCS1234K1Z5", contactPhone: "9800000001" },
      { code: "SUP-002", name: "Deccan Steel & Cement", gstin: "36AAECD5678L1Z2", contactPhone: "9800000002" },
      { code: "SUP-003", name: "Kakatiya Building Supplies", gstin: "36AAGCK9012M1Z8", contactPhone: "9800000003" },
    ],
  });

  const stateWh = await prisma.warehouse.create({
    data: { code: "WH-STATE", name: "Telangana State Warehouse — Hyderabad", level: "STATE", stateId: state.id },
  });
  const districtWarehouses = new Map<string, string>();
  for (const d of districts) {
    const wh = await prisma.warehouse.create({
      data: {
        code: `WH-${d.code}`,
        name: `${d.name} District Warehouse`,
        level: "DISTRICT",
        stateId: state.id,
        districtId: d.id,
      },
    });
    districtWarehouses.set(d.id, wh.id);
  }

  for (const m of materials) {
    // state warehouse: healthy
    await prisma.inventoryStock.create({
      data: { materialId: m.id, warehouseId: stateWh.id, quantity: m.reorderLevel * int(3, 6) },
    });
    for (const [, whId] of districtWarehouses) {
      const factor = chance(0.22) ? rng() * 0.6 : 1 + rng() * 2.5;
      await prisma.inventoryStock.create({
        data: {
          materialId: m.id,
          warehouseId: whId,
          quantity: Math.round(m.reorderLevel * factor),
        },
      });
    }
  }

  // A few stock transactions for realism
  let txnN = 0;
  for (const m of materials.slice(0, 6)) {
    await prisma.stockTransaction.create({
      data: {
        txnNo: `STK-${String(++txnN).padStart(5, "0")}`,
        type: "PURCHASE_RECEIPT",
        materialId: m.id,
        warehouseId: stateWh.id,
        quantity: m.reorderLevel * 3,
        balanceAfter: m.reorderLevel * 5,
        createdAt: daysAgo(int(10, 60)),
      },
    });
  }

  console.log("Seeding projects…");
  const projects = [];
  for (const d of districts) {
    const count = d.code === "HYD" ? 1 : int(1, 2);
    for (let i = 0; i < count; i++) {
      const pm = pick(pms.filter((p) => p.districtId === d.id) ?? pms) ?? pick(pms);
      const contractor = pick(contractors);
      const mandal = pick(d.mandals);
      const planned = int(40, 200);
      projects.push(
        await prisma.project.create({
          data: {
            code: `PRJ-${d.code}-${i + 1}`,
            name: `${d.name} Indiramma Housing Cluster ${i + 1}`,
            stateId: state.id,
            districtId: d.id,
            mandalId: mandal.id,
            villageId: pick(mandal.villages).id,
            financialYear: pick(["2024-25", "2025-26"]),
            plannedHouses: planned,
            // ~₹2 L per house + ~12% overhead/infrastructure
            approvedBudget: Math.round(planned * int(195000, 235000) * 1.12),
            startDate: daysAgo(int(120, 400)),
            targetDate: daysAhead(int(60, 300)),
            projectManagerId: pm.id,
            contractorId: contractor.id,
            status: "ACTIVE",
          },
        }),
      );
    }
  }

  console.log("Seeding beneficiaries + houses…");
  const stageKeys = CONSTRUCTION_STAGES.map((s) => s.key);
  const BEN_COUNT = 280;
  let benN = 0;
  const appByFy: Record<string, number> = {};
  const houseByDistrict: Record<string, number> = {};

  const activities: Prisma.ActivityLogCreateManyInput[] = [];
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  for (let i = 0; i < BEN_COUNT; i++) {
    const d = pick(districts);
    const mandal = pick(d.mandals);
    const village = pick(mandal.villages);
    const fy = pick(["2024-25", "2025-26", "2025-26", "2025-26"]);
    appByFy[fy] = (appByFy[fy] || 0) + 1;
    const project = pick(projects.filter((p) => p.districtId === d.id) ?? projects) ?? pick(projects);
    const contractor = project.contractorId ?? pick(contractors).id;
    const pmId = project.projectManagerId;
    const name = `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`;
    const sanction = int(150, 200) * 1000;
    const aadhaar = String(int(100000000000, 999999999999));

    // status distribution
    const roll = rng();
    let status: Prisma.BeneficiaryCreateInput["status"];
    if (roll < 0.08) status = "APPLIED";
    else if (roll < 0.14) status = "VERIFICATION_PENDING";
    else if (roll < 0.18) status = "VERIFIED";
    else if (roll < 0.2) status = "REJECTED";
    else if (roll < 0.26) status = "APPROVED";
    else if (roll < 0.32) status = "CONSTRUCTION_NOT_STARTED";
    else if (roll < 0.6) status = "CONSTRUCTION_STARTED";
    else if (roll < 0.85) status = "UNDER_CONSTRUCTION";
    else status = "COMPLETED";

    const ben = await prisma.beneficiary.create({
      data: {
        beneficiaryCode: `II-TG-BEN-${String(++benN).padStart(6, "0")}`,
        applicationNo: `APP/${fy}/${String(appByFy[fy]).padStart(6, "0")}`,
        registrationNo: `REG${int(100000, 999999)}`,
        name,
        guardianName: `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`,
        gender: chance(0.55) ? "Female" : "Male",
        dob: new Date(int(1960, 2000), int(0, 11), int(1, 28)),
        aadhaarLast4: aadhaar.slice(-4),
        aadhaarHash: `seedhash-${aadhaar}`,
        mobile: `9${int(100000000, 999999999)}`,
        bankAccountLast4: String(int(1000, 9999)),
        bankAccountEnc: String(int(10000000000, 99999999999)),
        ifsc: `SBIN000${int(1000, 9999)}`,
        bankName: pick(["State Bank of India", "Union Bank", "Andhra Pragathi Grameena Bank", "Canara Bank"]),
        address: `H.No ${int(1, 200)}-${int(1, 99)}, ${village.name}`,
        stateId: state.id,
        districtId: d.id,
        mandalId: mandal.id,
        villageId: village.id,
        pinCode: village.pinCode,
        latitude: 17 + rng() * 2,
        longitude: 78 + rng() * 2,
        scheme: "Indiramma Illu",
        financialYear: fy,
        sanctionNo: `SAN/${fy}/${int(10000, 99999)}`,
        sanctionDate: daysAgo(int(60, 500)),
        sanctionAmount: sanction,
        houseType: "G+0 (2BHK)",
        landOwnership: pick(["Own patta land", "Assigned land", "Government allotted plot"]),
        status,
        projectId: project.id,
        contractorId: contractor,
        projectManagerId: pmId,
        createdAt: daysAgo(int(1, 480)),
      },
    });

    const houseStatuses = new Set([
      "APPROVED", "HOUSE_ALLOTTED", "CONSTRUCTION_NOT_STARTED",
      "CONSTRUCTION_STARTED", "UNDER_CONSTRUCTION", "COMPLETED",
    ]);
    if (!houseStatuses.has(status)) {
      activities.push({
        actorName: name, verb: "applied",
        summary: `New Indiramma Illu application ${ben.applicationNo} from ${village.name}, ${d.name}`,
        districtId: d.id, createdAt: ben.createdAt,
      });
      continue;
    }

    houseByDistrict[d.code] = (houseByDistrict[d.code] || 0) + 1;
    const houseCode = `II-TG-${d.code}-${String(houseByDistrict[d.code]).padStart(6, "0")}`;

    // target stage index
    let targetIdx: number;
    let notStarted = false;
    if (status === "COMPLETED") targetIdx = stageKeys.length - 1;
    else if (status === "CONSTRUCTION_NOT_STARTED" || status === "APPROVED" || status === "HOUSE_ALLOTTED") {
      notStarted = true;
      targetIdx = 0;
    } else if (status === "CONSTRUCTION_STARTED") targetIdx = int(3, 8);
    else targetIdx = int(8, 20); // under construction

    const supervisor = pick(supervisors.filter((s) => s.districtId === d.id) ?? supervisors) ?? pick(supervisors);
    const engineer = pick(engineers.filter((e) => e.districtId === d.id) ?? engineers) ?? pick(engineers);
    const startDate = notStarted ? null : daysAgo(int(10, 400));
    const plannedCompletion = notStarted
      ? daysAhead(int(45, 300))
      : daysAhead(int(-90, 240));

    const house = await prisma.house.create({
      data: {
        houseCode,
        beneficiaryId: ben.id,
        projectId: project.id,
        stateId: state.id,
        districtId: d.id,
        mandalId: mandal.id,
        villageId: village.id,
        contractorId: contractor,
        projectManagerId: pmId,
        engineerId: engineer.id,
        supervisorId: supervisor.id,
        labourVendorId: pick(labourVendors).id,
        startDate,
        plannedCompletion,
        estimatedCost: sanction,
        currentStageKey: stageKeys[targetIdx],
        currentStageName: CONSTRUCTION_STAGES[targetIdx].name,
        createdAt: ben.createdAt,
      },
    });

    const stageRows: Prisma.HouseStageProgressCreateManyInput[] = [];
    let actualCost = 0;
    for (let s = 0; s < stageKeys.length; s++) {
      let st: Prisma.HouseStageProgressCreateManyInput["status"];
      let pct = 0;
      if (notStarted) {
        st = "NOT_STARTED";
        pct = 0;
      } else if (s < targetIdx) {
        st = "COMPLETED";
        pct = 100;
      } else if (s === targetIdx && status !== "COMPLETED") {
        st = pick(["IN_PROGRESS", "IN_PROGRESS", "STARTED", "PENDING_VERIFICATION"]);
        pct = int(15, 85);
      } else if (status === "COMPLETED") {
        st = "COMPLETED";
        pct = 100;
      } else {
        st = "NOT_STARTED";
        pct = 0;
      }
      const stageCost =
        st === "NOT_STARTED"
          ? 0
          : Math.round((sanction * CONSTRUCTION_STAGES[s].weight) / 100 * (pct / 100));
      actualCost += stageCost;
      stageRows.push({
        houseId: house.id,
        stageKey: stageKeys[s],
        stageName: CONSTRUCTION_STAGES[s].name,
        sequence: s + 1,
        status: st,
        progressPct: pct,
        stageCost,
        supervisorId: supervisor.id,
        contractorId: contractor,
        approvalStatus: st === "COMPLETED" ? "APPROVED" : "PENDING",
        actualStart: s <= targetIdx && startDate ? daysAgo(int(5, 380)) : null,
        actualEnd: s < targetIdx && startDate ? daysAgo(int(1, 200)) : null,
      });
    }
    await prisma.houseStageProgress.createMany({ data: stageRows });

    const progressPct = computeHouseProgress(
      stageRows.map((r) => ({ stageKey: r.stageKey, status: r.status!, progressPct: r.progressPct! })),
    );

    // schedule health
    let scheduleHealth: Prisma.HouseCreateInput["scheduleHealth"] = "ON_SCHEDULE";
    let hStatus: Prisma.HouseCreateInput["status"];
    if (status === "COMPLETED") {
      hStatus = "COMPLETED";
    } else if (notStarted) {
      hStatus = "NOT_STARTED";
      scheduleHealth = "ON_SCHEDULE";
    } else {
      const overdue = plannedCompletion.getTime() < Date.now();
      if (overdue && progressPct < 85) {
        scheduleHealth = chance(0.5) ? "CRITICAL" : "DELAYED";
        hStatus = "DELAYED";
      } else if (progressPct < 40 && chance(0.3)) {
        scheduleHealth = "AT_RISK";
        hStatus = progressPct >= 50 ? "UNDER_CONSTRUCTION" : "IN_PROGRESS";
      } else {
        hStatus = progressPct <= 0 ? "NOT_STARTED" : progressPct >= 60 ? "UNDER_CONSTRUCTION" : "IN_PROGRESS";
      }
    }

    const healthScore =
      hStatus === "DELAYED"
        ? int(30, 55)
        : scheduleHealth === "AT_RISK"
          ? int(55, 72)
          : int(74, 99);

    await prisma.house.update({
      where: { id: house.id },
      data: {
        progressPct,
        actualCost,
        status: hStatus,
        scheduleHealth,
        healthScore,
        actualCompletion: status === "COMPLETED" ? daysAgo(int(1, 120)) : null,
        delayReason:
          hStatus === "DELAYED"
            ? pick([
                "Contractor labour shortage",
                "Delayed sand supply",
                "Beneficiary land dispute",
                "Pending fund release",
                "Monsoon disruption",
              ])
            : null,
        delayResponsible: hStatus === "DELAYED" ? pick(["Contractor", "Materials", "Funds", "Beneficiary"]) : null,
      },
    });

    // DPRs for active houses
    if (startDate && chance(0.7)) {
      for (let k = 0; k < int(1, 4); k++) {
        await prisma.dailyProgressReport.create({
          data: {
            date: daysAgo(int(0, 40)),
            districtId: d.id,
            mandalId: mandal.id,
            projectId: project.id,
            houseId: house.id,
            stageKey: stageKeys[targetIdx],
            todaysWork: `${CONSTRUCTION_STAGES[targetIdx].name} in progress`,
            pctToday: int(2, 12),
            cumulativePct: progressPct,
            labourCount: int(4, 14),
            weatherImpact: chance(0.2) ? "Light rain — partial work" : "Clear",
            createdById: engineer.id,
          },
        });
      }
    }

    // Payments by milestone
    const MS: { key: "FOUNDATION" | "PLINTH" | "ROOF" | "COMPLETION"; idx: number; amt: number }[] = [
      { key: "FOUNDATION", idx: 5, amt: sanction * 0.25 },
      { key: "PLINTH", idx: 6, amt: sanction * 0.2 },
      { key: "ROOF", idx: 10, amt: sanction * 0.3 },
      { key: "COMPLETION", idx: 23, amt: sanction * 0.25 },
    ];
    for (const ms of MS) {
      const reached = targetIdx >= ms.idx || status === "COMPLETED";
      await prisma.beneficiaryPayment.create({
        data: {
          beneficiaryId: ben.id,
          houseId: house.id,
          milestone: ms.key,
          eligibleAmount: Math.round(ms.amt),
          releasedAmount: reached && chance(0.8) ? Math.round(ms.amt) : 0,
          status: !reached
            ? "ELIGIBLE"
            : chance(0.8)
              ? "PAID"
              : pick(["PROCESSING", "APPROVED", "SUBMITTED"]),
          txnRef: reached ? `PFMS${int(10000000, 99999999)}` : null,
          bankName: ben.bankName,
          paymentDate: reached && chance(0.8) ? daysAgo(int(1, 200)) : null,
        },
      });
    }

    // Quality inspections for completed QC stages
    for (let s = 0; s < Math.min(targetIdx, stageKeys.length); s++) {
      if (CONSTRUCTION_STAGES[s].qc && chance(0.9)) {
        await prisma.qualityInspection.create({
          data: {
            inspectionNo: `QC-${pad(seq("qc"), 6)}`,
            houseId: house.id,
            stageKey: stageKeys[s],
            inspectorId: engineer.id,
            inspectionDate: daysAgo(int(5, 300)),
            result: chance(0.85) ? "PASSED" : chance(0.5) ? "PASSED_WITH_OBSERVATION" : "REWORK_REQUIRED",
            score: int(62, 98),
            remarks: "Routine stage inspection",
          },
        });
      }
    }

    // Issues
    if (chance(0.18)) {
      await prisma.issue.create({
        data: {
          issueCode: `ISS-${pad(seq("iss"), 6)}`,
          priority: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
          category: pick(["Material shortage", "Contractor delay", "Poor workmanship", "Labour shortage", "Payment issue"]),
          houseId: house.id,
          projectId: project.id,
          districtId: d.id,
          raisedById: engineer.id,
          assignedToId: pmId,
          description: "Field-reported issue requiring attention",
          dueDate: daysAhead(int(2, 20)),
          status: pick(["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]),
          createdAt: daysAgo(int(0, 30)),
        },
      });
    }

    // Material consumption samples
    if (targetIdx >= 6 && chance(0.6)) {
      for (const m of [materials[0], materials[1], materials[4]]) {
        const expected = int(40, 90);
        const issued = expected + int(-5, 15);
        const consumed = issued - int(0, 8);
        await prisma.materialConsumption.create({
          data: {
            houseId: house.id,
            stageKey: "FOUNDATION",
            materialId: m.id,
            expectedQty: expected,
            issuedQty: issued,
            consumedQty: consumed,
            returnedQty: issued - consumed,
            varianceQty: consumed - expected,
            materialCost: consumed * m.standardRate,
            flagged: consumed - expected > 10,
          },
        });
      }
    }

    if (chance(0.4)) {
      activities.push({
        actorName: supervisor.name,
        actorRole: "SITE_ENGINEER",
        verb: "updated",
        summary: `Supervisor updated ${CONSTRUCTION_STAGES[targetIdx].name} stage for house ${houseCode}`,
        districtId: d.id,
        link: `/construction/${house.id}`,
        createdAt: daysAgo(int(0, 20)),
      });
    }
  }

  console.log("Seeding government funds & expenses…");
  for (const d of districts) {
    for (const fy of ["2024-25", "2025-26"]) {
      await prisma.governmentFund.create({
        data: {
          releaseNo: `GO/HOU/${fy}/${d.code}/${int(100, 999)}`,
          financialYear: fy,
          sanctionNo: `SAN/${fy}/${int(1000, 9999)}`,
          releaseDate: daysAgo(int(30, 400)),
          amount: int(8, 22) * 1_000_000,
          department: "Housing Department, Government of Telangana",
          districtId: d.id,
        },
      });
    }
  }

  for (const p of projects) {
    for (let i = 0; i < int(3, 8); i++) {
      const amt = int(50000, 900000);
      await prisma.expense.create({
        data: {
          expenseCode: `EXP-${pad(seq("exp"), 6)}`,
          date: daysAgo(int(1, 200)),
          projectId: p.id,
          districtId: p.districtId,
          mandalId: p.mandalId,
          category: pick(["Construction Material", "Labour", "Transport", "Equipment", "Site Expense", "Fuel"]),
          description: "Site operational expense",
          amount: amt,
          gst: Math.round(amt * 0.18),
          paymentMode: pick(["NEFT", "RTGS", "Cheque"]),
          vendor: pick(["Sri Venkateswara Traders", "Deccan Steel & Cement", "Local Transport Union"]),
          status: pick(["SUBMITTED", "PM_APPROVED", "ACCOUNTS_APPROVED", "PAID", "PAID"]),
          createdById: p.projectManagerId,
        },
      });
    }
  }

  console.log("Seeding contractor bills…");
  for (const c of contractors) {
    for (let i = 0; i < int(1, 3); i++) {
      const measurement = int(20, 90) * 100000;
      await prisma.contractorBill.create({
        data: {
          raBillNo: `RA/${c.contractorCode}/${i + 1}`,
          contractorId: c.id,
          periodFrom: daysAgo(int(90, 150)),
          periodTo: daysAgo(int(1, 60)),
          houseCount: int(5, 40),
          measurementAmount: measurement,
          materialDeduction: Math.round(measurement * 0.15),
          retention: Math.round(measurement * 0.05),
          taxes: Math.round(measurement * 0.02),
          netPayable: Math.round(measurement * 0.78),
          status: pick(["CONTRACTOR_SUBMITTED", "ENGINEER_VERIFIED", "PM_APPROVED", "ACCOUNTS_VERIFIED", "PAID"]),
        },
      });
    }
  }

  console.log("Seeding notifications & approvals & activity…");
  const someHouses = await prisma.house.findMany({
    where: { scheduleHealth: { in: ["DELAYED", "CRITICAL"] } },
    take: 8,
  });
  for (const h of someHouses) {
    notifications.push({
      role: "DISTRICT_MANAGER",
      districtId: h.districtId,
      category: "DELAY",
      title: `House ${h.houseCode} is delayed`,
      body: `Stage ${h.currentStageName} · ${h.progressPct}% complete`,
      link: `/construction/${h.id}`,
    });
  }
  const lowStock = await prisma.inventoryStock.findMany({
    include: { material: true, warehouse: true },
  });
  for (const s of lowStock.filter((x) => x.quantity <= x.material.reorderLevel).slice(0, 6)) {
    notifications.push({
      role: "STORE_MANAGER",
      districtId: s.warehouse.districtId,
      category: "STOCK",
      title: `${s.material.name} below reorder level`,
      body: `${s.warehouse.name}: ${s.quantity} ${s.material.unit} left`,
      link: "/inventory",
    });
  }
  notifications.push({
    userId: admin.id,
    category: "APPROVAL",
    title: "5 beneficiary verifications pending",
    body: "Verification queue needs attention",
    link: "/approvals",
  });

  await prisma.notification.createMany({ data: notifications });

  const pendingBens = await prisma.beneficiary.findMany({
    where: { status: "VERIFICATION_PENDING" },
    take: 10,
  });
  for (const b of pendingBens) {
    await prisma.approval.create({
      data: {
        type: "BENEFICIARY_VERIFICATION",
        entityId: b.id,
        entityLabel: `${b.name} · ${b.beneficiaryCode}`,
        districtId: b.districtId,
        status: "PENDING",
      },
    });
  }

  activities.push(
    {
      actorName: "G. Sridevi", actorRole: "ACCOUNTS", verb: "approved",
      summary: "Accounts approved Expense EXP-23004 for ₹4.2 L",
      link: "/expenses", createdAt: daysAgo(1),
    },
    {
      actorName: "K. Prabhakar Rao", actorRole: "SUPER_ADMIN", verb: "released",
      summary: "Government fund release recorded for Khammam district — ₹2.1 Cr",
      link: "/funds", createdAt: daysAgo(2),
    },
  );
  await prisma.activityLog.createMany({ data: activities });

  const counts = {
    users: await prisma.user.count(),
    districts: await prisma.district.count(),
    beneficiaries: await prisma.beneficiary.count(),
    houses: await prisma.house.count(),
    projects: await prisma.project.count(),
    payments: await prisma.beneficiaryPayment.count(),
  };
  console.log("Seed complete:", counts);
  console.log("\nLogin with any of: ADMIN001 / DM-RANGA / PM-001 / ENG-014 / CON-007 / ACC-002");
  console.log("Password: password123\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
