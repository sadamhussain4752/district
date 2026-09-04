import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const GET = route(async ({ req }) => {
  const districtId = req.nextUrl.searchParams.get("districtId") || undefined;
  const mandals = await prisma.mandal.findMany({
    where: districtId ? { districtId } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, districtId: true },
  });
  return NextResponse.json(mandals);
});
