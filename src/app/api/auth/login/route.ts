import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  establishSession,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, writeAudit } from "@/lib/api";

const schema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  const { identifier, password } = parsed.data;
  const ip = clientIp(req);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { employeeId: identifier },
        { employeeId: identifier.toUpperCase() },
      ],
    },
  });

  const genericError = NextResponse.json(
    { error: "Invalid credentials" },
    { status: 401 },
  );

  if (!user) return genericError;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      {
        error: `Account locked due to failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString(
          "en-IN",
        )}.`,
      },
      { status: 423 },
    );
  }

  if (user.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is disabled. Contact your administrator." },
      { status: 403 },
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil:
          failed >= MAX_FAILED
            ? new Date(Date.now() + LOCK_MINUTES * 60_000)
            : null,
      },
    });
    return genericError;
  }

  const sessionUser = toSessionUser(user);
  await establishSession(sessionUser, {
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await writeAudit({
    user: sessionUser,
    action: "LOGIN",
    module: "auth",
    recordId: user.id,
    ip,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
    },
    requiresCaptcha: false,
  });
}
