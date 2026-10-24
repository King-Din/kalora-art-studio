import { connectDb, disconnectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../src/config/env.js";
import { Order, Painting, PotteryRequest, User, WallBooking } from "../src/models/index.js";

// npm run demo-reset -- --yes --db=<exact MONGODB_DB_NAME>
const args = process.argv.slice(2);
const typedDb = args.find((a) => a.startsWith("--db="))?.slice(5);
const refuse = (why) => {
  console.error(`demo-reset refused: ${why}`);
  process.exit(1);
};
if (!args.includes("--yes")) refuse("missing --yes");
if (!typedDb) refuse("missing --db=<database name>");
if (env.NODE_ENV === "production") refuse("NODE_ENV is production");
if (typedDb !== env.MONGODB_DB_NAME) refuse("the typed database name does not match MONGODB_DB_NAME");

await connectDb();
const seed = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seedData", "seed.json"), "utf8"));
const changed = {};
changed.customersDeleted = (await User.deleteMany({ role: "customer" })).deletedCount;
changed.ordersDeleted = (await Order.deleteMany({})).deletedCount;
changed.bookingsDeleted = (await WallBooking.deleteMany({})).deletedCount;
changed.potteryRequestsDeleted = (await PotteryRequest.deleteMany({})).deletedCount;
// Explicit restore of painting status to the seed state (ordinary seeding never does this).
let restored = 0;
for (const p of seed.paintings) {
  const r = await Painting.updateOne({ seedId: p.id ?? p.seedId }, { $set: { status: p.status === "sold" ? "sold" : "available" } });
  restored += r.modifiedCount;
}
changed.paintingsRestoredToSeedStatus = restored;
changed.studioUserKept = true;
console.log(`demo-reset on "${env.MONGODB_DB_NAME}":`, JSON.stringify(changed));
await disconnectDb();
