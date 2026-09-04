/**
 * Zero-setup local MongoDB (single-node replica set) for development.
 * Persists data under .mongo-data so records survive restarts.
 * Prisma + MongoDB requires a replica set — this provides one on a fixed port.
 *
 * Usage: node scripts/mongo-dev.mjs   (kept running; Ctrl+C to stop)
 * For production, set DATABASE_URL to a real MongoDB / Atlas cluster instead.
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { mkdirSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.DEV_MONGO_PORT || 27017);
const DB_PATH = path.resolve(process.cwd(), ".mongo-data");
mkdirSync(DB_PATH, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: PORT, dbPath: DB_PATH, storageEngine: "wiredTiger" }],
});

const uri = replSet.getUri("indiramma_illu");
console.log("\n  MongoDB replica set ready");
console.log("  URI:", uri.replace(/\?.*$/, "?replicaSet=rs0"));
console.log("  Data dir:", DB_PATH);
console.log("\n  Leave this running. Start the app in another terminal: npm run dev\n");

const shutdown = async () => {
  console.log("\n  Stopping MongoDB...");
  await replSet.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
