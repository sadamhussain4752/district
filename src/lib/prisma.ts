import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  // Fail loudly at cold start rather than with an opaque 500 on the first query.
  console.error(
    "[prisma] DATABASE_URL is not set. On Vercel add it under " +
      "Project → Settings → Environment Variables (a MongoDB Atlas SRV string), then redeploy.",
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Thrown by API routes when the database is unreachable / misconfigured. */
export class DatabaseUnavailableError extends Error {
  constructor(public cause?: unknown) {
    super("The database is not reachable. Check DATABASE_URL and network access.");
    this.name = "DatabaseUnavailableError";
  }
}

let warmed = false;

/**
 * Ensure the database is reachable before running a query. Converts Prisma
 * connection/initialisation failures into a typed error the route layer can
 * turn into a clean 503 instead of a bare 500.
 */
export async function assertDbReady() {
  if (warmed) return;
  if (!process.env.DATABASE_URL) throw new DatabaseUnavailableError();
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    warmed = true;
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  }
}
