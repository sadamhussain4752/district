import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

export const GET = route(async ({ user }) => {
  const where =
    ["SUPER_ADMIN", "STATE_ADMIN", "AUDITOR", "ACCOUNTS"].includes(user.role) ||
    !user.districtId
      ? {}
      : { id: user.districtId };

  const districts = await prisma.district.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, geoKey: true },
  });
  return NextResponse.json(districts);
});
