// `npm run verify:indexes` (add --test to check the test database instead)
if (process.argv.includes("--test")) process.env.NODE_ENV = "test";
const { connectDb, disconnectDb } = await import("../src/config/db.js");
const { env } = await import("../src/config/env.js");
const { initIndexes, models } = await import("../src/models/index.js");

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const REQUIRED = [
  { model: "User", keys: { email: 1 }, unique: true },
  { model: "Order", keys: { painting: 1 }, unique: true, partial: { status: "placed" } },
  { model: "WallBooking", keys: { date: 1 }, unique: true, partial: { status: { $in: ["requested", "confirmed"] } } },
  { model: "Order", keys: { customer: 1, createdAt: -1 } },
  { model: "WallBooking", keys: { customer: 1, createdAt: -1 } },
  { model: "WallBooking", keys: { status: 1, createdAt: -1 } },
  { model: "PotteryRequest", keys: { customer: 1, createdAt: -1 } },
  { model: "PotteryRequest", keys: { status: 1, createdAt: -1 } },
];

let failures = 0;
try {
  await connectDb();
  await initIndexes();
  console.log(`Database: ${env.MONGODB_DB_NAME}`);
  for (const req of REQUIRED) {
    const Model = models[req.model];
    const live = await Model.collection.indexes();
    const found = live.find((ix) => same(ix.key, req.keys));
    const ok = found && Boolean(found.unique) === Boolean(req.unique) && same(found.partialFilterExpression, req.partial);
    if (!ok) failures++;
    console.log(`${ok ? "OK  " : "FAIL"} ${Model.collection.name} ${found?.name ?? "(missing)"} keys=${JSON.stringify(req.keys)} unique=${Boolean(found?.unique)} partial=${JSON.stringify(found?.partialFilterExpression ?? null)}`);
  }
  await disconnectDb();
} catch (err) {
  console.error(`verify:indexes FAILED (${err.name}: ${err.message})`);
  process.exit(1);
}
if (failures) {
  console.error(`${failures} required index(es) missing or wrong.`);
  process.exit(1);
}
console.log("All required indexes verified.");
