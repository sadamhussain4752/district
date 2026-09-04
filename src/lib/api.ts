import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionUser } from "./auth";
import { isReadOnly, canAccess, type FeatureKey } from "./rbac";
import { prisma } from "./prisma";
import type { AuditAction } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Handler = (ctx: {
  req: NextRequest;
  user: SessionUser;
  params: Record<string, string>;
}) => Promise<NextResponse | Response> | NextResponse | Response;

/** Wrap a route handler with auth + (optional) feature gate + error handling. */
export function route(
  handler: Handler,
  opts: { feature?: FeatureKey; write?: boolean } = {},
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const user = await getSession();
      if (!user) throw new HttpError(401, "Not authenticated");
      if (opts.feature && !canAccess(user.role, opts.feature)) {
        throw new HttpError(403, "You do not have access to this area");
      }
      if (opts.write && isReadOnly(user.role)) {
        throw new HttpError(403, "Your role has read-only access");
      }
      const params = (await context.params) ?? {};
      return await handler({ req, user, params });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", issues: err.flatten() },
          { status: 422 },
        );
      }
      console.error("[api]", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

export type SortDir = "asc" | "desc";

export function parsePagination(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || 20)));
  const q = sp.get("q")?.trim() || "";
  const sort = sp.get("sort") || "createdAt";
  const dir: SortDir = sp.get("dir") === "asc" ? "asc" : "desc";
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, q, sort, dir };
}

/**
 * Build a Prisma `orderBy` from a user-supplied sort key + direction, constrained
 * to an allowlist. Returns `any` because the field name is dynamic — callers pass
 * a vetted allowlist so the value is always a valid single-field ordering.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortOrder(
  sort: string,
  dir: SortDir,
  allowed: string[],
  fallback = "createdAt",
): any {
  return { [allowed.includes(sort) ? sort : fallback]: dir };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function writeAudit(input: {
  user: SessionUser;
  action: AuditAction;
  module: string;
  recordId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ip?: string;
}) {
  await prisma.auditLog
    .create({
      data: {
        userId: input.user.id,
        userName: input.user.name,
        role: input.user.role,
        action: input.action,
        module: input.module,
        recordId: input.recordId,
        oldValue: (input.oldValue as object) ?? undefined,
        newValue: (input.newValue as object) ?? undefined,
        reason: input.reason,
        ip: input.ip,
      },
    })
    .catch((e) => console.error("[audit]", e));
}

export async function writeActivity(input: {
  user: SessionUser;
  verb: string;
  summary: string;
  districtId?: string | null;
  link?: string;
}) {
  await prisma.activityLog
    .create({
      data: {
        actorName: input.user.name,
        actorRole: input.user.role,
        verb: input.verb,
        summary: input.summary,
        districtId: input.districtId ?? undefined,
        link: input.link,
      },
    })
    .catch((e) => console.error("[activity]", e));
}

export function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
