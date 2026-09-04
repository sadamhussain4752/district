import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ req, user }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const sp = req.nextUrl.searchParams;

    // Scope payments through the beneficiary's district.
    const benScope = scopeFilter(user);
    const and: Record<string, unknown>[] = [];
    if (sp.get("status")) and.push({ status: sp.get("status") });
    if (sp.get("milestone")) and.push({ milestone: sp.get("milestone") });

    const where = {
      AND: [
        ...and,
        {
          beneficiary: benScope,
        },
      ],
    };

    const sortable = ["createdAt", "eligibleAmount", "releasedAmount", "status", "paymentDate"];
    const orderByClause = sortOrder(sort, dir, sortable, "createdAt");

    const [rows, total] = await Promise.all([
      prisma.beneficiaryPayment.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take,
        include: {
          beneficiary: {
            select: {
              name: true,
              beneficiaryCode: true,
              district: { select: { name: true } },
            },
          },
        },
      }),
      prisma.beneficiaryPayment.count({ where }),
    ]);

    const filtered = q
      ? rows.filter(
          (r) =>
            r.beneficiary.name.toLowerCase().includes(q.toLowerCase()) ||
            r.beneficiary.beneficiaryCode.toLowerCase().includes(q.toLowerCase()) ||
            (r.txnRef ?? "").toLowerCase().includes(q.toLowerCase()),
        )
      : rows;

    return paginated(filtered, total, page, pageSize);
  },
  { feature: "payments" },
);
