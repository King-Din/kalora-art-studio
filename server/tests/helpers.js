import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { DateTime } from "luxon";
import { createApp } from "../src/app.js";
import { connectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { Order, Painting, PotteryRequest, User, WallBooking, initIndexes, models } from "../src/models/index.js";
import { ZONE, addDays, setNow, todayIST } from "../src/rules/dates.js";
import { runSeed } from "../scripts/seed.js";

let counter = 0;
const uniq = () => `${Date.now()}${++counter}`;

export function assertTestDb() {
  if (!mongoose.connection.name?.endsWith("_test")) throw new Error("Refusing: not a *_test database");
}

// Fixed clock (2026-11-01 10:00 IST) so date rules are deterministic.
export const FIXED_NOW = DateTime.fromISO("2026-11-01T10:00:00", { zone: ZONE });

// Connect, build indexes, wipe the TEST database, re-seed, pin the clock, return the app.
export async function startFile(appOptions) {
  await connectDb();
  assertTestDb();
  await initIndexes();
  for (const m of Object.values(models)) await m.deleteMany({});
  await runSeed({ quiet: true });
  setNow(FIXED_NOW);
  return createApp(appOptions);
}

export async function createUser(role = "customer") {
  return User.create({ name: `Test ${role}`, email: `${uniq()}@test.local`, passwordHash: "not-used", role });
}

export const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: "1h" });

// Authenticated request helper. user=null means "not logged in".
export function call(app, user, method, url, body) {
  let req = request(app)[method](url);
  if (user) req = req.set("Cookie", `token=${tokenFor(user)}`);
  return body === undefined ? req : req.send(body);
}

let dateCounter = 0;
export const nextDate = () => addDays(todayIST(), 7 + (dateCounter++ % 80)); // 7..86 days away

export async function makePainting({ status = "available", price = 5000, style = "Warli" } = {}) {
  return Painting.create({ seedId: `t-${uniq()}`, title: "Test Painting", artist: "Tester", price, imageUrl: "/images/x.jpg", style, status });
}

export async function makeOrder(customer) {
  const painting = await makePainting({ status: "sold" });
  return Order.create({
    customer: customer._id, painting: painting._id, priceAtPurchase: painting.price, status: "placed",
    history: [{ status: "placed", by: customer._id, role: "customer" }],
  });
}

export async function makeBooking(customer, date = nextDate(), status = "requested") {
  return WallBooking.create({
    customer: customer._id, date, wallSqFt: 20, address: "1 Test Road", ratePerSqFt: 150, price: 3000, status,
    history: [{ status, by: customer._id, role: "customer" }],
  });
}

export async function makePottery(customer, status = "requested") {
  return PotteryRequest.create({
    customer: customer._id, itemId: "i-01", itemName: "Mug", glazeId: "g-01", glazeName: "Ocean Blue",
    quantity: 2, neededBy: addDays(todayIST(), 20), status,
    history: [{ status, by: customer._id, role: "customer" }],
  });
}

export const validPottery = () => ({ itemId: "i-01", glazeId: "g-01", quantity: 2, neededBy: addDays(todayIST(), 20) });
export const validBooking = (date = nextDate()) => ({ date, wallSqFt: 25, address: "12 Gallery Lane" });
