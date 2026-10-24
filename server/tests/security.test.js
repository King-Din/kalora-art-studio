import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { disconnectDb } from "../src/config/db.js";
import { Config, Order, Painting, User, WallBooking } from "../src/models/index.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { call, createUser, makePainting, startFile, validBooking } from "./helpers.js";

let app, customer;
beforeAll(async () => {
  app = await startFile();
  customer = await createUser();
  await makePainting({ style: "Regex Test" });
});
afterAll(disconnectDb);

const signup = (body) => request(app).post("/api/auth/signup").send(body);

describe("signup and login", () => {
  it("signup with role:studio still creates a customer", async () => {
    const res = await signup({ name: "Eve", email: "eve@test.local", password: "password123", role: "studio" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("customer");
    expect((await User.findOne({ email: "eve@test.local" })).role).toBe("customer");
    expect(res.body.user.passwordHash).toBeUndefined();
  });
  it("duplicate email -> 409 EMAIL_TAKEN", async () => {
    const res = await signup({ name: "Eve 2", email: "EVE@test.local", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });
  it("password length is 8..72", async () => {
    expect((await signup({ name: "A", email: "short@test.local", password: "1234567" })).status).toBe(400);
    expect((await signup({ name: "A", email: "long@test.local", password: "x".repeat(73) })).status).toBe(400);
  });
  it("real login works, cookie is httpOnly, then /me works", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send({ email: "eve@test.local", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });
  it("wrong password and unknown email give the same generic answer", async () => {
    const a = await request(app).post("/api/auth/login").send({ email: "eve@test.local", password: "wrong-password" });
    const b = await request(app).post("/api/auth/login").send({ email: "nobody@test.local", password: "wrong-password" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(a.body.error.message).toBe(b.body.error.message);
  });
  it("operator injection in login -> 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("login is rate limited (10 per window) when the limiter is enabled", async () => {
    const limited = createApp({ enableRateLimit: true });
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await request(limited).post("/api/auth/login").send({ email: "x@test.local", password: "bad-password" })).status);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes[10]).toBe(429);
  });
});

describe("injection, size and origin", () => {
  it("?q[$ne]=x -> 400", async () => {
    expect((await call(app, customer, "get", "/api/paintings?q[$ne]=x")).status).toBe(400);
  });
  it("q is literal text: '.*' matches nothing", async () => {
    const res = await call(app, customer, "get", "/api/paintings?q=.*");
    expect(res.status).toBe(200);
    expect(res.body.paintings).toEqual([]);
  });
  it("q longer than 100 chars -> 400", async () => {
    expect((await call(app, customer, "get", `/api/paintings?q=${"a".repeat(101)}`)).status).toBe(400);
  });
  it("oversize body -> 413 in the error contract", async () => {
    const res = await request(app).post("/api/auth/signup").send({ name: "x".repeat(200000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
  it("malformed JSON -> 400", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.requestId).toBeTruthy();
  });
  it("cross-site Origin on a POST -> 403, same-origin passes", async () => {
    const bad = await request(app).post("/api/auth/login").set("Origin", "http://evil.example").send({ email: "a@b.co", password: "x" });
    expect(bad.status).toBe(403);
    const good = await request(app).post("/api/auth/login").set("Host", "localhost:4000").set("Origin", "http://localhost:4000").send({ email: "a@b.co", password: "x" });
    expect(good.status).toBe(401);
  });
});

describe("client cannot choose price, status, owner or history", () => {
  it("buying ignores a client-supplied price/customer/status", async () => {
    const painting = await makePainting({ price: 4321 });
    const other = await createUser();
    const res = await call(app, customer, "post", `/api/paintings/${painting._id}/buy`, { priceAtPurchase: 1, customer: String(other._id), status: "cancelled", history: [] });
    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.order._id);
    expect(order.priceAtPurchase).toBe(4321);
    expect(String(order.customer)).toBe(String(customer._id));
    expect(order.status).toBe("placed");
    expect(order.history).toHaveLength(1);
  });
  it("booking price/rate/status/history come from the server", async () => {
    const rate = (await Config.findOne({ key: "mural" })).muralRatePerSqFt;
    const res = await call(app, customer, "post", "/api/bookings", { ...validBooking(), price: 1, ratePerSqFt: 1, status: "confirmed", customer: "x", history: [1, 2, 3] });
    expect(res.status).toBe(201);
    const b = await WallBooking.findById(res.body.booking._id);
    expect(b.price).toBe(25 * rate);
    expect(b.ratePerSqFt).toBe(rate);
    expect(b.status).toBe("requested");
    expect(b.history).toHaveLength(1);
  });
  it("a studio cannot be sold a painting edit with status smuggled in", async () => {
    const studio = await createUser("studio");
    const p = await makePainting();
    const res = await call(app, studio, "patch", `/api/paintings/${p._id}`, { status: "sold", price: 5100 });
    expect(res.status).toBe(200);
    expect((await Painting.findById(p._id)).status).toBe("available");
  });
});

describe("error handler", () => {
  it("never leaks stack traces or internals on a 500", () => {
    const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    errorHandler(new Error("mongodb://user:secret@host failed at /srv/app.js:10"), { id: "req-1" }, res, () => {});
    expect(res.code).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/secret|mongodb|srv|stack/i);
    expect(res.body.error.requestId).toBe("req-1");
  });
});
