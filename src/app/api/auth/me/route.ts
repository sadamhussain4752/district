import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowedFeatures } from "@/lib/rbac";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [district, unread] = await Promise.all([
    session.districtId
      ? prisma.district.findUnique({ where: { id: session.districtId } })
      : null,
    prisma.notification.count({
      where: {
        read: false,
        OR: [
          { userId: session.id },
          { role: session.role },
          session.districtId ? { districtId: session.districtId } : { id: "none" },
        ],
      },
    }),
  ]);

  return NextResponse.json({
    user: session,
    districtName: district?.name ?? null,
    features: [...allowedFeatures(session.role)],
    unreadNotifications: unread,
  });
}
