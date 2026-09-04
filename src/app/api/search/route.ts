import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(async ({ req, user }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json([]);

  const rx = { contains: q, mode: "insensitive" as const };
  const districtScope = scopeFilter(user);

  const [beneficiaries, houses, projects, contractors] = await Promise.all([
    prisma.beneficiary.findMany({
      where: {
        AND: [
          districtScope,
          {
            OR: [
              { name: rx },
              { beneficiaryCode: rx },
              { applicationNo: rx },
              { mobile: rx },
            ],
          },
        ],
      },
      take: 5,
      select: { id: true, name: true, beneficiaryCode: true, applicationNo: true },
    }),
    prisma.house.findMany({
      where: { AND: [districtScope, { houseCode: rx }] },
      take: 5,
      select: { id: true, houseCode: true, currentStageName: true, status: true },
    }),
    prisma.project.findMany({
      where: {
        AND: [
          districtScope,
          { OR: [{ name: rx }, { code: rx }] },
        ],
      },
      take: 5,
      select: { id: true, name: true, code: true },
    }),
    prisma.contractor.findMany({
      where: { OR: [{ companyName: rx }, { contractorCode: rx }, { gstin: rx }] },
      take: 5,
      select: { id: true, companyName: true, contractorCode: true },
    }),
  ]);

  const groups = [];
  if (beneficiaries.length)
    groups.push({
      category: "Beneficiaries",
      items: beneficiaries.map((b) => ({
        label: b.name,
        sub: b.beneficiaryCode,
        href: `/beneficiaries/${b.id}`,
      })),
    });
  if (houses.length)
    groups.push({
      category: "Houses",
      items: houses.map((h) => ({
        label: h.houseCode,
        sub: h.currentStageName || h.status,
        href: `/construction/${h.id}`,
      })),
    });
  if (projects.length)
    groups.push({
      category: "Projects",
      items: projects.map((p) => ({
        label: p.name,
        sub: p.code,
        href: `/projects/${p.id}`,
      })),
    });
  if (contractors.length)
    groups.push({
      category: "Contractors",
      items: contractors.map((c) => ({
        label: c.companyName,
        sub: c.contractorCode,
        href: `/contractors?highlight=${c.id}`,
      })),
    });

  return NextResponse.json(groups);
});
