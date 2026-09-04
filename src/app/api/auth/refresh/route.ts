import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  REFRESH_COOKIE,
  establishSession,
  hashToken,
  toSessionUser,
  verifyRefreshToken,
} from "@/lib/auth";
import { clientIp } from "@/lib/api";

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const rt = jar.get(REFRESH_COOKIE)?.value;
  if (!rt) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(rt);
  if (!payload?.sub) {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rt) },
  });

  // Reuse detection: token unknown or revoked => revoke the whole family.
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revoked: true },
      });
    }
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub as string } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  }

  // Rotate: revoke the used token, issue a new one in the same family.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  await establishSession(
    toSessionUser(user),
    { userAgent: req.headers.get("user-agent") ?? undefined, ip: clientIp(req) },
    stored.family,
  );

  return NextResponse.json({ ok: true });
}
