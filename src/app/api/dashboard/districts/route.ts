import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { getDistrictStats } from "@/lib/dashboard";

export const GET = route(
  async ({ user }) => {
    const stats = await getDistrictStats(user);
    return NextResponse.json(stats);
  },
  { feature: "dashboard" },
);
