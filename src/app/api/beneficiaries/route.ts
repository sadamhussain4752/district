import { prisma } from "@/lib/prisma";
import {
  route, parsePagination, paginated, writeAudit, writeActivity, clientIp, sortOrder,
} from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";
import { beneficiaryCreateSchema } from "@/lib/validators";
import { createBeneficiary } from "@/lib/beneficiary";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;

    const and: Record<string, unknown>[] = [scopeFilter(user)];
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { beneficiaryCode: { contains: q, mode: "insensitive" } },
          { astCode: { contains: q, mode: "insensitive" } },
          { applicationNo: { contains: q, mode: "insensitive" } },
          { applicationId: { contains: q, mode: "insensitive" } },
          { cardHolderName: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
        ],
      });
    }
    for (const key of ["districtId", "mandalId", "villageId", "projectId"] as const) {
      const v = sp.get(key);
      if (v) and.push({ [key]: v });
    }
    // Status filter is driven by the house's construction status (the beneficiary
    // record itself is APPROVED for the whole Astonic roster).
    const status = sp.get("status");
    if (status === "started") {
      and.push({
        house: {
          status: { in: ["IN_PROGRESS", "UNDER_CONSTRUCTION", "DELAYED", "COMPLETED", "HANDED_OVER"] },
        },
      });
    } else if (status === "not_started") {
      and.push({ OR: [{ house: { status: "NOT_STARTED" } }, { house: { is: null } }] });
    } else if (status === "under_construction") {
      and.push({ house: { status: "UNDER_CONSTRUCTION" } });
    } else if (status === "completed") {
      and.push({ house: { status: { in: ["COMPLETED", "HANDED_OVER"] } } });
    } else if (status === "delayed") {
      and.push({ house: { status: "DELAYED" } });
    } else if (status === "cancelled") {
      and.push({ status: { in: ["CANCELLED", "REJECTED"] } });
    } else if (status === "on_hold") {
      and.push({ OR: [{ status: "ON_HOLD" }, { house: { status: "ON_HOLD" } }] });
    } else if (status) {
      and.push({ status });
    }
    const stage = sp.get("stage");
    if (stage) and.push({ house: { currentStageKey: stage } });
    if (sp.get("fy")) and.push({ financialYear: sp.get("fy") });

    const where = { AND: and };
    const sortable = ["createdAt", "name", "beneficiaryCode", "status", "sanctionAmount"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where, orderBy: orderByClause, skip, take,
        select: {
          id: true, beneficiaryCode: true, applicationNo: true, applicationId: true,
          astCode: true, name: true, guardianName: true, mobile: true, status: true,
          sanctionAmount: true, financialYear: true, createdAt: true,
          sft: true, mouStatus: true, cmsAccountStatus: true, cardHolderName: true,
          district: { select: { name: true } },
          mandal: { select: { name: true } },
          village: { select: { name: true } },
          house: {
            select: {
              id: true, houseCode: true, progressPct: true, status: true,
              currentStageName: true, actualCost: true, estimatedCost: true,
            },
          },
        },
      }),
      prisma.beneficiary.count({ where }),
    ]);

    // Latest online status per beneficiary (from the most-advanced stage row).
    const houseIds = rows.map((r) => r.house?.id).filter(Boolean) as string[];
    const stages = houseIds.length
      ? await prisma.houseStageProgress.findMany({
          where: { houseId: { in: houseIds }, onlineStatus: { not: null } },
          select: { houseId: true, sequence: true, onlineStatus: true },
          orderBy: { sequence: "asc" },
        })
      : [];
    const onlineByHouse = new Map<string, string>();
    for (const s of stages) if (s.onlineStatus) onlineByHouse.set(s.houseId, s.onlineStatus);

    return paginated(
      rows.map((r) => ({
        ...r,
        onlineStatus: r.house?.id ? onlineByHouse.get(r.house.id) ?? null : null,
      })),
      total,
      page,
      pageSize,
    );
  },
  { feature: "beneficiaries" },
);

export const POST = route(
  async ({ req, user }) => {
    const body = await req.json();
    const input = beneficiaryCreateSchema.parse(body);
    const beneficiary = await createBeneficiary(input, user.id);

    await writeAudit({
      user, action: "CREATE", module: "beneficiaries",
      recordId: beneficiary.id, newValue: { name: beneficiary.name },
      ip: clientIp(req),
    });
    await writeActivity({
      user, verb: "created",
      summary: `Registered beneficiary ${beneficiary.name} (${beneficiary.beneficiaryCode})`,
      districtId: beneficiary.districtId,
      link: `/beneficiaries/${beneficiary.id}`,
    });

    return Response.json({ id: beneficiary.id }, { status: 201 });
  },
  { feature: "beneficiaries", write: true },
);
