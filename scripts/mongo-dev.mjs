/**
 * Zero-setup local MongoDB (single-node replica set) for development.
 * Prisma + MongoDB requires a replica set — this provides one on a fixed port.
 *
 * Data is persisted under node_modules/.cache/indiramma-mongo (NOT the project
 * root) so MongoDB's constant journal writes don't trip the Next.js dev file
 * watcher and cause an HMR reload loop.
 *
 * Usage: node scripts/mongo-dev.mjs   (kept running; Ctrl+C to stop)
 * For production, set DATABASE_URL to a real MongoDB / Atlas cluster instead.
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { mkdirSync, existsSync, renameSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.DEV_MONGO_PORT || 27017);
const DB_PATH =
  process.env.DEV_MONGO_PATH ||
  path.resolve(process.cwd(), "node_modules", ".cache", "indiramma-mongo");

// One-time migration from the old ./.mongo-data location so existing seed data
// is not lost.
const LEGACY = path.resolve(process.cwd(), ".mongo-data");
if (existsSync(LEGACY) && !existsSync(DB_PATH)) {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  try {
    renameSync(LEGACY, DB_PATH);
    console.log("  Moved existing dev data ./.mongo-data ->", DB_PATH);
  } catch {
    mkdirSync(DB_PATH, { recursive: true });
  }
}
mkdirSync(DB_PATH, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: PORT, dbPath: DB_PATH, storageEngine: "wiredTiger" }],
});

const uri = replSet.getUri("indiramma_illu");
console.log("\n  MongoDB replica set ready");
console.log("  URI:", uri.replace(/\?.*$/, "?replicaSet=rs0"));
console.log("  Data dir:", DB_PATH);
console.log("\n  Leave this running. In another terminal: npm run dev:web (or just use npm run dev)\n");

const shutdown = async () => {
  console.log("\n  Stopping MongoDB...");
  await replSet.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
