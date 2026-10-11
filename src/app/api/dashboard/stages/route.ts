import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";
import { CONSTRUCTION_STAGES, STAGE_STATUS_GROUPS } from "@/lib/constants";

/** Per-stage house counts: done ✅ / work started / not started. */
export const GET = route(
  async ({ req, user }) => {
    const districtId = req.nextUrl.searchParams.get("districtId");
    const houseWhere = {
      AND: [scopeFilter(user), ...(districtId ? [{ districtId }] : [])],
    };

    const [grouped, bills, totalHouses] = await Promise.all([
      prisma.houseStageProgress.groupBy({
        by: ["stageKey", "status"],
        where: { house: houseWhere },
        _count: true,
      }),
      prisma.houseStageProgress.groupBy({
        by: ["stageKey"],
        where: { house: houseWhere },
        _sum: { billValue: true, receivedAmount: true },
      }),
      prisma.house.count({ where: houseWhere }),
    ]);

    const billByStage = new Map(bills.map((b) => [b.stageKey, b._sum]));
    const stages = CONSTRUCTION_STAGES.map((s) => {
      const rows = grouped.filter((g) => g.stageKey === s.key);
      const count = (group: readonly string[]) =>
        rows.filter((r) => group.includes(r.status)).reduce((a, r) => a + r._count, 0);
      const done = count(STAGE_STATUS_GROUPS.done);
      const inProgress = count(STAGE_STATUS_GROUPS.started);
      // "Started" = the stage has been reached at all, i.e. it has a row in the
      // TSHCL register — done plus still in progress, as the workbook counts it.
      const started = done + inProgress;
      const total = rows.reduce((a, r) => a + r._count, 0) || totalHouses;
      return {
        key: s.key,
        name: s.name,
        shortName: s.shortName,
        done,
        inProgress,
        started,
        notStarted: Math.max(0, total - started),
        total,
        donePct: total ? Math.round((done / total) * 1000) / 10 : 0,
        billValue: billByStage.get(s.key)?.billValue ?? 0,
        receivedAmount: billByStage.get(s.key)?.receivedAmount ?? 0,
      };
    });

    return NextResponse.json({ totalHouses, stages });
  },
  { feature: "dashboard" },
);
