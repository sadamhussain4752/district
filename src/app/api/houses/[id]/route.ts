import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route, HttpError } from "@/lib/api";
import { healthBand } from "@/lib/progress";

export const GET = route(
  async ({ params }) => {
    const h = await prisma.house.findUnique({
      where: { id: params.id },
      include: {
        beneficiary: {
          include: { district: true, mandal: true, village: true },
        },
        stageProgress: { orderBy: { sequence: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!h) throw new HttpError(404, "House not found");

    const [contractor, pm, engineer, supervisor, inspections, issues, dprs, consumption, payments] =
      await Promise.all([
        h.contractorId
          ? prisma.contractor.findUnique({ where: { id: h.contractorId } })
          : null,
        h.projectManagerId
          ? prisma.user.findUnique({
              where: { id: h.projectManagerId },
              select: { id: true, name: true, mobile: true },
            })
          : null,
        h.engineerId
          ? prisma.user.findUnique({
              where: { id: h.engineerId },
              select: { id: true, name: true, mobile: true },
            })
          : null,
        h.supervisorId
          ? prisma.supervisor.findUnique({ where: { id: h.supervisorId } })
          : null,
        prisma.qualityInspection.findMany({
          where: { houseId: h.id },
          orderBy: { inspectionDate: "desc" },
        }),
        prisma.issue.findMany({
          where: { houseId: h.id },
          orderBy: { createdAt: "desc" },
        }),
        prisma.dailyProgressReport.findMany({
          where: { houseId: h.id },
          orderBy: { date: "desc" },
          take: 10,
        }),
        prisma.materialConsumption.findMany({ where: { houseId: h.id } }),
        prisma.beneficiaryPayment.findMany({
          where: { houseId: h.id },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    let materials: { name: string; unit: string }[] = [];
    if (consumption.length) {
      const mats = await prisma.material.findMany({
        where: { id: { in: [...new Set(consumption.map((c) => c.materialId))] } },
        select: { id: true, name: true, unit: true },
      });
      const mMap = new Map(mats.map((m) => [m.id, m]));
      materials = consumption.map((c) => ({
        ...c,
        name: mMap.get(c.materialId)?.name ?? "—",
        unit: mMap.get(c.materialId)?.unit ?? "",
      })) as never;
    }

    return NextResponse.json({
      ...h,
      healthBand: healthBand(h.healthScore),
      contractor,
      projectManager: pm,
      engineer,
      supervisor,
      inspections,
      issues,
      dprs,
      consumption: materials.length ? materials : consumption,
      payments,
    });
  },
  { feature: "construction" },
);
