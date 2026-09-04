import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, assertDbReady } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api";
import { CONSTRUCTION_STAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISTRICTS = [
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

const DEMO_USERS: {
  employeeId: string;
  name: string;
  role: string;
  districtCode?: string;
  permissions?: string[];
}[] = [
  { employeeId: "ADMIN001", name: "K. Prabhakar Rao", role: "SUPER_ADMIN", permissions: ["sensitive:view"] },
  { employeeId: "STATE001", name: "M. Dana Kishore", role: "STATE_ADMIN" },
  { employeeId: "DM-RANGA", name: "S. Harish", role: "DISTRICT_MANAGER", districtCode: "RNG" },
  { employeeId: "PM-001", name: "R. Anitha", role: "PROJECT_MANAGER", districtCode: "RNG" },
  { employeeId: "ENG-014", name: "Sudhakar Boda", role: "SITE_ENGINEER", districtCode: "RNG" },
  { employeeId: "CON-007", name: "Contractor Rep 7", role: "CONTRACTOR" },
  { employeeId: "ACC-002", name: "G. Sridevi", role: "ACCOUNTS" },
];

/**
 * One-time minimal seed so a fresh production database can be logged into.
 * Creates the state, districts, mandals/villages, construction stages and the
 * demo user accounts. Idempotent. Run the full `npm run seed` locally against
 * the same DATABASE_URL for the complete demo dataset.
 *
 *   curl -X POST https://<app>/api/admin/bootstrap -H "x-bootstrap-key: <BOOTSTRAP_SECRET>"
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.BOOTSTRAP_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Set BOOTSTRAP_SECRET in the environment to enable this endpoint." },
        { status: 403 },
      );
    }
    const provided =
      req.headers.get("x-bootstrap-key") ||
      req.nextUrl.searchParams.get("key");
    if (provided !== secret) {
      return NextResponse.json({ error: "Invalid bootstrap key" }, { status: 401 });
    }

    await assertDbReady();

    const passwordHash = await bcrypt.hash("password123", 12);

    // State
    const state =
      (await prisma.state.findFirst({ where: { code: "TG" } })) ??
      (await prisma.state.create({ data: { code: "TG", name: "Telangana" } }));

    // Districts
    const existingDistricts = await prisma.district.findMany({
      where: { code: { in: DISTRICTS.map((d) => d.code) } },
    });
    const haveCodes = new Set(existingDistricts.map((d) => d.code));
    const toCreate = DISTRICTS.filter((d) => !haveCodes.has(d.code));
    if (toCreate.length) {
      await prisma.district.createMany({
        data: toCreate.map((d) => ({
          code: d.code,
          name: d.name,
          geoKey: d.geoKey,
          headquarters: d.hq,
          stateId: state.id,
        })),
      });
    }
    const districts = await prisma.district.findMany({
      where: { code: { in: DISTRICTS.map((d) => d.code) } },
    });
    const districtByCode = new Map(districts.map((d) => [d.code, d]));

    // Mandals + villages (2 each) for districts that have none yet
    for (const d of districts) {
      const mandalCount = await prisma.mandal.count({ where: { districtId: d.id } });
      if (mandalCount > 0) continue;
      for (let i = 1; i <= 2; i++) {
        const mandal = await prisma.mandal.create({
          data: { code: `${d.code}-M${i}`, name: `${d.name} Mandal ${i}`, districtId: d.id },
        });
        await prisma.village.createMany({
          data: [1, 2].map((v) => ({
            code: `${d.code}-M${i}-V${v}`,
            name: `${d.name} Village ${i}${v}`,
            mandalId: mandal.id,
            pinCode: "500001",
          })),
        });
      }
    }

    // Construction stages
    const stageCount = await prisma.constructionStage.count();
    if (stageCount === 0) {
      await prisma.constructionStage.createMany({
        data: CONSTRUCTION_STAGES.map((s, idx) => ({
          key: s.key,
          sequence: idx + 1,
          name: s.name,
          isMandatory: s.mandatory,
          needsQC: s.qc,
          weightPct: s.weight,
          paymentMilestone: s.milestone ?? null,
        })),
      });
    }

    // Demo users
    const results = await Promise.all(
      DEMO_USERS.map((u) =>
        prisma.user.upsert({
          where: { employeeId: u.employeeId },
          update: {
            passwordHash,
            status: "ACTIVE",
            failedLogins: 0,
            lockedUntil: null,
          },
          create: {
            employeeId: u.employeeId,
            name: u.name,
            email: `${u.employeeId.toLowerCase()}@indirammailu.tg.gov.in`,
            passwordHash,
            role: u.role as never,
            status: "ACTIVE",
            permissions: u.permissions ?? [],
            stateId: state.id,
            districtId: u.districtCode
              ? (districtByCode.get(u.districtCode)?.id ?? null)
              : null,
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      created: {
        districts: districts.length,
        stages: await prisma.constructionStage.count(),
        users: results.map((r) => r.employeeId),
      },
      login: {
        url: "/login",
        accounts: DEMO_USERS.map((u) => u.employeeId),
        password: "password123",
      },
      note:
        "Minimal seed complete. For the full demo dataset run `npm run seed` locally " +
        "with DATABASE_URL set to this cluster.",
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
