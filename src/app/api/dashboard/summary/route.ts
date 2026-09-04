import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getDashboardKpis } from "@/lib/dashboard";

export const GET = route(
  async ({ req, user }) => {
    const districtId = req.nextUrl.searchParams.get("districtId");
    const fy = req.nextUrl.searchParams.get("fy");
    const kpis = await getDashboardKpis(user, { districtId, fy });
    return NextResponse.json(kpis);
  },
  { feature: "dashboard" },
);
