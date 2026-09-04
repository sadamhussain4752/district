import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics. Open https://<your-app>/api/health after deploying to
 * see whether the database is configured and reachable. Safe to expose: it never
 * returns the connection string or any record data.
 */
export async function GET() {
  const started = Date.now();
  const url = process.env.DATABASE_URL || "";

  const env = {
    DATABASE_URL: url ? maskDbUrl(url) : "MISSING",
    JWT_ACCESS_SECRET: boolEnv("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: boolEnv("JWT_REFRESH_SECRET"),
    NEXT_PUBLIC_DEPLOY_STATE: process.env.NEXT_PUBLIC_DEPLOY_STATE || "(default TG)",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
  };

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        status: "DATABASE_URL not set",
        hint:
          "Add DATABASE_URL (a MongoDB Atlas SRV connection string, e.g. " +
          "mongodb+srv://user:pass@cluster.xxxx.mongodb.net/indiramma_illu?retryWrites=true&w=majority) " +
          "in Vercel → Project → Settings → Environment Variables, then redeploy.",
        env,
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$runCommandRaw({ ping: 1 });
    const [users, districts, beneficiaries, houses] = await Promise.all([
      prisma.user.count(),
      prisma.district.count(),
      prisma.beneficiary.count(),
      prisma.house.count(),
    ]);
    const seeded = users > 0 && districts > 0;
    return NextResponse.json({
      ok: true,
      status: seeded ? "healthy" : "connected but not seeded",
      latencyMs: Date.now() - started,
      counts: { users, districts, beneficiaries, houses },
      hint: seeded
        ? undefined
        : "Database is reachable but empty. Seed it: run `npm run db:push` then " +
          "`npm run seed` locally with DATABASE_URL pointed at this cluster, or " +
          "call POST /api/admin/bootstrap with header `x-bootstrap-key: <BOOTSTRAP_SECRET>`.",
      env,
    });
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return NextResponse.json(
      {
        ok: false,
        status: "database unreachable",
        error: message,
        hint: diagnose(message),
        env,
      },
      { status: 503 },
    );
  }
}

function boolEnv(name: string) {
  return process.env[name] ? "set" : "MISSING (using insecure fallback)";
}

function maskDbUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host;
    const db = u.pathname.replace("/", "") || "(none)";
    return `${u.protocol}//***:***@${host}/${db}`;
  } catch {
    return "set (unparseable)";
  }
}

function diagnose(message: string): string {
  if (/querySrv|ENOTFOUND|getaddrinfo/i.test(message))
    return "DNS lookup for the Atlas host failed — check the cluster hostname in DATABASE_URL.";
  if (/authentication failed|bad auth/i.test(message))
    return "Wrong database username or password in DATABASE_URL.";
  if (/Server selection timeout|connection timed out|ETIMEDOUT/i.test(message))
    return "Cannot reach the cluster — in Atlas → Network Access, allow 0.0.0.0/0 (Vercel has no fixed IPs).";
  if (/ECONNREFUSED|127\.0\.0\.1|localhost/i.test(message))
    return "DATABASE_URL points at localhost. Use a hosted MongoDB (Atlas), not the local dev database.";
  if (/replica set|Transactions are not supported|directConnection/i.test(message))
    return "MongoDB must be a replica set for Prisma. Atlas clusters already are — remove any directConnection flag.";
  return "Check the DATABASE_URL value and that the database allows connections from Vercel.";
}
