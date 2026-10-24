import jwt from "jsonwebtoken";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { User } from "../src/models/index.js";
import { addDays, todayIST } from "../src/rules/dates.js";
import { call, createUser, makeBooking, makeOrder, makePainting, makePottery, nextDate, startFile, validBooking, validPottery } from "./helpers.js";

let app, customer, other, studio;
beforeAll(async () => {
  app = await startFile();
  [customer, other, studio] = [await createUser(), await createUser(), await createUser("studio")];
});
afterAll(disconnectDb);

const newPainting = { title: "New", artist: "A", description: "d", price: 9000, imageUrl: "/images/new.jpg", style: "Warli" };
const range = () => `?from=${todayIST()}&to=${addDays(todayIST(), 30)}`;
const pid = async () => `/api/paintings/${(await makePainting())._id}`;
const oid = async (o) => `/api/orders/${(await makeOrder(o))._id}`;
const bid = async (o) => `/api/bookings/${(await makeBooking(o))._id}`;
const rid = async (o) => `/api/pottery/${(await makePottery(o))._id}`;
const same = (p) => async () => p;

// [method, path(owner), body(), expected status for anonymous / customer / studio]
const MATRIX = [
  ["get", same("/api/health"), null, 200, 200, 200],
  ["post", same("/api/auth/logout"), null, 401, 200, 200],
  ["get", same("/api/auth/me"), null, 401, 200, 200],
  ["get", same("/api/config"), null, 401, 200, 200],
  ["get", same("/api/paintings"), null, 401, 200, 200],
  ["get", pid, null, 401, 200, 200],
  ["post", same("/api/paintings"), () => newPainting, 401, 403, 201],
  ["patch", pid, () => ({ price: 7000 }), 401, 403, 200],
  ["post", async () => `${await pid()}/buy`, null, 401, 201, 403],
  ["get", same("/api/orders"), null, 401, 200, 200],
  ["get", oid, null, 401, 200, 200],
  ["post", async (o) => `${await oid(o)}/cancel`, null, 401, 200, 403],
  ["get", async () => `/api/bookings/availability${range()}`, null, 401, 200, 200],
  ["post", same("/api/bookings"), () => validBooking(), 401, 201, 403],
  ["get", same("/api/bookings"), null, 401, 200, 200],
  ["get", bid, null, 401, 200, 200],
  ["post", async (o) => `${await bid(o)}/cancel`, null, 401, 200, 403],
  ["post", async (o) => `${await bid(o)}/confirm`, null, 401, 403, 200],
  ["post", async (o) => `${await bid(o)}/decline`, null, 401, 403, 200],
  ["get", same("/api/pottery/options"), null, 401, 200, 200],
  ["post", same("/api/pottery"), () => validPottery(), 401, 201, 403],
  ["get", same("/api/pottery"), null, 401, 200, 200],
  ["get", rid, null, 401, 200, 200],
  ["patch", rid, () => validPottery(), 401, 200, 403],
  ["post", async (o) => `${await rid(o)}/cancel`, null, 401, 200, 403],
  ["post", async (o) => `${await rid(o)}/accept`, null, 401, 403, 200],
  ["post", async (o) => `${await rid(o)}/decline`, null, 401, 403, 200],
  ["get", same("/api/admin/summary"), null, 401, 403, 200],
];

describe("role x endpoint matrix", () => {
  for (const [method, pathFn, bodyFn, anon, cust, stud] of MATRIX) {
    for (const [label, getUser, expected] of [["anonymous", () => null, anon], ["customer", () => customer, cust], ["studio", () => studio, stud]]) {
      it(`${label} ${method.toUpperCase()} ${pathFn.name || "route"} -> ${expected}`, async () => {
        const path = await pathFn(customer); // fixtures are owned by the customer
        const res = await call(app, getUser(), method, path, bodyFn ? bodyFn() : undefined);
        expect(res.status, JSON.stringify(res.body)).toBe(expected);
      });
    }
  }
});

describe("ownership and malformed ids", () => {
  it("another customer gets 404 (not 403) for every kind of record", async () => {
    for (const path of [await oid(customer), await bid(customer), await rid(customer)]) {
      expect((await call(app, other, "get", path)).status).toBe(404);
      expect((await call(app, other, "post", `${path}/cancel`)).status).toBe(404);
    }
  });
  it("other customer's lists never contain someone else's records", async () => {
    await makeOrder(customer);
    const res = await call(app, other, "get", "/api/orders");
    expect(res.body.orders).toEqual([]);
  });
  it.each(["not-an-id", "123456789012", "%24where", "000000000000000000000000"])("id %s -> 404 JSON, never 500", async (id) => {
    for (const base of ["/api/orders", "/api/bookings", "/api/pottery", "/api/paintings"]) {
      const res = await call(app, customer, "get", `${base}/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("authentication edge cases", () => {
  it("a tampered cookie -> 401", async () => {
    const res = await call(app, null, "get", "/api/auth/me").set("Cookie", "token=abc.def.ghi");
    expect(res.status).toBe(401);
  });
  it("a token signed with the wrong secret -> 401", async () => {
    const bad = jwt.sign({ sub: String(customer._id) }, "x".repeat(40));
    expect((await call(app, null, "get", "/api/auth/me").set("Cookie", `token=${bad}`)).status).toBe(401);
  });
  it("a valid token for a deleted user -> 401", async () => {
    const ghost = await createUser();
    const token = jwt.sign({ sub: String(ghost._id) }, env.JWT_SECRET);
    await User.deleteOne({ _id: ghost._id });
    expect((await call(app, null, "get", "/api/auth/me").set("Cookie", `token=${token}`)).status).toBe(401);
  });
  it("a role change in the database takes effect immediately", async () => {
    const u = await createUser();
    await User.updateOne({ _id: u._id }, { role: "studio" });
    u.role = "studio"; // same token, new role read from DB
    expect((await call(app, u, "get", "/api/admin/summary")).status).toBe(200);
  });
  it("unknown API route -> JSON 404 (when logged in)", async () => {
    const res = await call(app, customer, "get", "/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
