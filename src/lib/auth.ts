import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "dev-access-secret",
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
);
const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL || 900);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL || 1209600);

export const ACCESS_COOKIE = "ii_at";
export const REFRESH_COOKIE = "ii_rt";

export type SessionUser = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  stateId: string | null;
  districtId: string | null;
  mandalId: string | null;
  projectIds: string[];
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    permissions: user.permissions,
    stateId: user.stateId,
    districtId: user.districtId,
    mandalId: user.mandalId,
    projectIds: user.projectIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(userId: string, family: string) {
  const jti = randomUUID();
  const token = await new SignJWT({ family })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(REFRESH_SECRET);
  return { token, jti };
}

export async function verifyAccessToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return {
      id: payload.sub as string,
      employeeId: payload.employeeId as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
      permissions: (payload.permissions as string[]) || [],
      stateId: (payload.stateId as string) ?? null,
      districtId: (payload.districtId as string) ?? null,
      mandalId: (payload.mandalId as string) ?? null,
      projectIds: (payload.projectIds as string[]) || [],
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function toSessionUser(u: {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
  stateId: string | null;
  districtId: string | null;
  mandalId: string | null;
  projectIds: string[];
}): SessionUser {
  return {
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    email: u.email,
    role: u.role,
    permissions: u.permissions,
    stateId: u.stateId,
    districtId: u.districtId,
    mandalId: u.mandalId,
    projectIds: u.projectIds,
  };
}

/** Issue a fresh access+refresh pair, persist the refresh token, set cookies. */
export async function establishSession(
  user: SessionUser,
  meta: { userAgent?: string; ip?: string },
  family?: string,
) {
  const tokenFamily = family ?? randomUUID();
  const access = await signAccessToken(user);
  const { token: refresh } = await signRefreshToken(user.id, tokenFamily);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refresh),
      family: tokenFamily,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
    },
  });

  const jar = await cookies();
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  jar.set(ACCESS_COOKIE, access, { ...common, maxAge: ACCESS_TTL });
  jar.set(REFRESH_COOKIE, refresh, { ...common, maxAge: REFRESH_TTL });
}

export async function clearSession() {
  const jar = await cookies();
  const rt = jar.get(REFRESH_COOKIE)?.value;
  if (rt) {
    await prisma.refreshToken
      .updateMany({ where: { tokenHash: hashToken(rt) }, data: { revoked: true } })
      .catch(() => {});
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** Read the current session from the access cookie (server components / route handlers). */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const at = jar.get(ACCESS_COOKIE)?.value;
  if (!at) return null;
  return verifyAccessToken(at);
}

export async function requireSession(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new AuthError("Not authenticated");
  return s;
}

export class AuthError extends Error {}
