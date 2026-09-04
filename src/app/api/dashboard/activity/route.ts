import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";
import { scopeFilter } from "@/lib/rbac";

export const GET = route(
  async ({ user, req }) => {
    const take = Math.min(50, Number(req.nextUrl.searchParams.get("take") || 15));
    const scope = scopeFilter(user);
    const items = await prisma.activityLog.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take,
    });
    return NextResponse.json(items);
  },
  { feature: "dashboard" },
);
