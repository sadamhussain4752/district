import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/api";

function scope(user: {
  id: string;
  role: string;
  districtId: string | null;
}) {
  const or: Record<string, unknown>[] = [{ userId: user.id }, { role: user.role }];
  if (user.districtId) or.push({ districtId: user.districtId });
  return { OR: or };
}

export const GET = route(async ({ user }) => {
  const where = scope(user);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return NextResponse.json({ items, unread });
});

export const PATCH = route(async ({ user, req }) => {
  const body = await req.json().catch(() => ({}));
  const where = scope(user);
  if (body.id) {
    await prisma.notification.updateMany({
      where: { ...where, id: body.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({ where, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
});
