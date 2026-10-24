// `npm run race -- --n=20` : in-process race against the TEST database only.
process.env.NODE_ENV = "test";
process.env.MONGODB_DB_NAME = "artstudio_test";
const n = Number(process.argv.find((a) => a.startsWith("--n="))?.slice(4) ?? 20);

const { default: mongoose } = await import("mongoose");
const { disconnectDb } = await import("../src/config/db.js");
const { Order, Painting, WallBooking } = await import("../src/models/index.js");
const { addDays, todayIST } = await import("../src/rules/dates.js");
const { call, createUser, makePainting, startFile } = await import("../tests/helpers.js");

let violated = false;
try {
  const app = await startFile();
  if (!mongoose.connection.name.endsWith("_test")) throw new Error("not the test database");
  const customers = await Promise.all(Array.from({ length: n }, () => createUser("customer")));

  // --- purchase race ---
  const painting = await makePainting();
  const buys = await Promise.all(customers.map((u) => call(app, u, "post", `/api/paintings/${painting._id}/buy`)));
  const won = buys.filter((r) => r.status === 201).length;
  const sold = buys.filter((r) => r.status === 409 && r.body.error?.code === "PAINTING_ALREADY_SOLD").length;
  const other = buys.length - won - sold;
  const placed = await Order.countDocuments({ painting: painting._id, status: "placed" });
  const status = (await Painting.findById(painting._id)).status;
  console.log(`PURCHASE: ${won} succeeded (201), ${sold} rejected (409 PAINTING_ALREADY_SOLD), ${other} other; DB: painting=${status}, placed orders=${placed}`);
  if (won !== 1 || other !== 0 || placed !== 1 || status !== "sold") violated = true;

  // --- booking race ---
  const date = addDays(todayIST(), 20);
  const books = await Promise.all(customers.map((u) => call(app, u, "post", "/api/bookings", { date, wallSqFt: 40, address: "Race Street" })));
  const bWon = books.filter((r) => r.status === 201).length;
  const bTaken = books.filter((r) => r.status === 409 && r.body.error?.code === "DATE_TAKEN").length;
  const bOther = books.length - bWon - bTaken;
  const active = await WallBooking.countDocuments({ date, status: { $in: ["requested", "confirmed"] } });
  console.log(`BOOKING: ${bWon} succeeded (201), ${bTaken} rejected (409 DATE_TAKEN), ${bOther} other; DB: active bookings for ${date}=${active}`);
  if (bWon !== 1 || bOther !== 0 || active !== 1) violated = true;
} catch (err) {
  console.error("race failed to run:", err.message);
  violated = true;
}
await disconnectDb();
console.log(violated ? "RESULT: INVARIANT VIOLATED" : "RESULT: all invariants held");
process.exit(violated ? 1 : 0);
