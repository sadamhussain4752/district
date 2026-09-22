import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, parsePagination, paginated, sortOrder, writeAudit, writeActivity, clientIp } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { expenseWhere, expenseSchema, resolveLocation } from "./filters";

export const GET = route(
  async ({ req }) => {
    const { page, pageSize, skip, take, q, sort, dir } = parsePagination(req);
    const where = expenseWhere(req, q);
    const sortable = ["date", "amount", "status", "category"];
    // Same-day entries: most recently entered first.
    const orderByClause = [
      sortOrder(sort, dir, sortable, "date"),
      { createdAt: "desc" as const },
      { expenseCode: "desc" as const },
    ];

    const [rows, total, districts, mandals] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: orderByClause, skip, take }),
      prisma.expense.count({ where }),
      prisma.district.findMany({ select: { id: true, name: true } }),
      prisma.mandal.findMany({ select: { id: true, name: true } }),
    ]);
    const dName = new Map(districts.map((d) => [d.id, d.name]));
    const mName = new Map(mandals.map((m) => [m.id, m.name]));
    return paginated(
      rows.map((r) => ({
        ...r,
        districtName: r.districtId ? dName.get(r.districtId) ?? null : null,
        mandalName: r.mandalId ? mName.get(r.mandalId) ?? null : null,
      })),
      total,
      page,
      pageSize,
    );
  },
  { feature: "expenses" },
);

/**
 * Manually entered expenses get EXM-xxxx codes — the workbook importer only
 * replaces PAY-/EXP- rows, so these survive a re-import.
 */
export const POST = route(
  async ({ req, user }) => {
    const body = expenseSchema.parse(await req.json());
    const location = await resolveLocation(body);

    for (let attempt = 0; ; attempt++) {
      const last = await prisma.expense.findFirst({
        where: { expenseCode: { startsWith: "EXM-" } },
        orderBy: { expenseCode: "desc" },
        select: { expenseCode: true },
      });
      const next = (last ? parseInt(last.expenseCode.slice(4), 10) : 0) + 1;
      const expenseCode = `EXM-${String(next).padStart(4, "0")}`;
      try {
        const created = await prisma.expense.create({
          data: { ...body, ...location, expenseCode, gst: 0, createdById: user.id },
        });
        await writeAudit({
          user, action: "CREATE", module: "expenses", recordId: expenseCode,
          newValue: created, ip: clientIp(req),
        });
        await writeActivity({
          user, verb: "added", districtId: created.districtId, link: "/expenses",
          summary: `Expense ${expenseCode} · ${created.category} · ${formatINR(created.amount)}`,
        });
        return NextResponse.json(created, { status: 201 });
      } catch (e: any) {
        // Two people saving at once can race to the same code — take the next one.
        if (e?.code === "P2002" && attempt < 4) continue;
        throw e;
      }
    }
  },
  { feature: "expenses", write: true },
);
