import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, HttpError } from "@/lib/api";

export const GET = route(
  async ({ params }) => {
    const p = await prisma.project.findUnique({ where: { id: params.id } });
    if (!p) throw new HttpError(404, "Project not found");

    const [district, mandal, pm, contractor, houses, expenses, funds] =
      await Promise.all([
        prisma.district.findUnique({ where: { id: p.districtId } }),
        p.mandalId ? prisma.mandal.findUnique({ where: { id: p.mandalId } }) : null,
        p.projectManagerId
          ? prisma.user.findUnique({
              where: { id: p.projectManagerId },
              select: { id: true, name: true, mobile: true, email: true },
            })
          : null,
        p.contractorId
          ? prisma.contractor.findUnique({ where: { id: p.contractorId } })
          : null,
        prisma.house.findMany({
          where: { projectId: p.id },
          include: { beneficiary: { select: { name: true, beneficiaryCode: true } } },
          orderBy: { houseCode: "asc" },
        }),
        prisma.expense.aggregate({
          where: { projectId: p.id, status: { in: ["ACCOUNTS_APPROVED", "PAID"] } },
          _sum: { amount: true },
        }),
        prisma.governmentFund.aggregate({
          where: { projectId: p.id },
          _sum: { amount: true },
        }),
      ]);

    const completed = houses.filter((h) =>
      ["COMPLETED", "HANDED_OVER"].includes(h.status),
    ).length;
    const delayed = houses.filter((h) =>
      ["DELAYED", "CRITICAL"].includes(h.scheduleHealth),
    ).length;

    return NextResponse.json({
      ...p,
      districtName: district?.name,
      mandalName: mandal?.name,
      projectManager: pm,
      contractor,
      houses,
      stats: {
        totalHouses: houses.length,
        completed,
        delayed,
        underConstruction: houses.filter((h) =>
          ["IN_PROGRESS", "UNDER_CONSTRUCTION"].includes(h.status),
        ).length,
        notStarted: houses.filter((h) => h.status === "NOT_STARTED").length,
        expenditure: expenses._sum.amount ?? 0,
        fundsReceived: funds._sum.amount ?? 0,
      },
    });
  },
  { feature: "projects" },
);
