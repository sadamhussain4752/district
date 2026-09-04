import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const GET = route(async ({ req }) => {
  const mandalId = req.nextUrl.searchParams.get("mandalId") || undefined;
  const villages = await prisma.village.findMany({
    where: mandalId ? { mandalId } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, mandalId: true, isUrban: true },
  });
  return NextResponse.json(villages);
});
