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
          { applicationNo: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
        ],
      });
    }
    for (const key of ["districtId", "mandalId", "villageId", "projectId", "status"] as const) {
      const v = sp.get(key);
      if (v) and.push({ [key]: v });
    }
    if (sp.get("fy")) and.push({ financialYear: sp.get("fy") });

    const where = { AND: and };
    const sortable = ["createdAt", "name", "beneficiaryCode", "status", "sanctionAmount"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where, orderBy: orderByClause, skip, take,
        select: {
          id: true, beneficiaryCode: true, applicationNo: true, name: true,
          guardianName: true, mobile: true, status: true, sanctionAmount: true,
          financialYear: true, createdAt: true,
          district: { select: { name: true } },
          mandal: { select: { name: true } },
          village: { select: { name: true } },
          house: { select: { id: true, houseCode: true, progressPct: true, status: true } },
        },
      }),
      prisma.beneficiary.count({ where }),
    ]);

    return paginated(rows, total, page, pageSize);
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
