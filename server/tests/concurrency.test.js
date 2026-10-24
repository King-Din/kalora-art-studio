import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDb } from "../src/config/db.js";
import { Order, Painting, PotteryRequest, WallBooking } from "../src/models/index.js";
import { addDays, todayIST } from "../src/rules/dates.js";
import { call, createUser, makeBooking, makePainting, makePottery, startFile, validBooking } from "./helpers.js";

const N = 20;
let app, studio, customers;
beforeAll(async () => {
  app = await startFile();
  studio = await createUser("studio");
  customers = await Promise.all(Array.from({ length: N }, () => createUser()));
});
afterAll(disconnectDb);

const noServerErrors = (responses) => expect(responses.filter((r) => r.status >= 500).map((r) => r.body)).toEqual([]);

describe("real simultaneous requests", () => {
  it("20 customers buy one painting: exactly one 201, nineteen 409 PAINTING_ALREADY_SOLD", async () => {
    const p = await makePainting();
    const res = await Promise.all(customers.map((u) => call(app, u, "post", `/api/paintings/${p._id}/buy`)));
    noServerErrors(res);
    expect(res.filter((r) => r.status === 201)).toHaveLength(1);
    const losers = res.filter((r) => r.status === 409);
    expect(losers).toHaveLength(N - 1);
    expect(losers.every((r) => r.body.error.code === "PAINTING_ALREADY_SOLD")).toBe(true);
    expect(await Order.countDocuments({ painting: p._id, status: "placed" })).toBe(1);
    expect(await Order.countDocuments({ painting: p._id })).toBe(1);
    expect((await Painting.findById(p._id)).status).toBe("sold");
  });

  it("20 customers book one date: exactly one 201, nineteen 409 DATE_TAKEN; freeing the date allows a rebook", async () => {
    const date = addDays(todayIST(), 30);
    const res = await Promise.all(customers.map((u) => call(app, u, "post", "/api/bookings", validBooking(date))));
    noServerErrors(res);
    const winner = res.find((r) => r.status === 201);
    expect(res.filter((r) => r.status === 201)).toHaveLength(1);
    const losers = res.filter((r) => r.status === 409);
    expect(losers).toHaveLength(N - 1);
    expect(losers.every((r) => r.body.error.code === "DATE_TAKEN")).toBe(true);
    expect(await WallBooking.countDocuments({ date, status: { $in: ["requested", "confirmed"] } })).toBe(1);

    await call(app, studio, "post", `/api/bookings/${winner.body.booking._id}/decline`);
    expect((await call(app, customers[0], "post", "/api/bookings", validBooking(date))).status).toBe(201);
  });

  it("pottery accept vs owner cancel: exactly one legal winner and the record agrees", async () => {
    const owner = customers[0];
    const r = await makePottery(owner);
    const [accept, cancel] = await Promise.all([
      call(app, studio, "post", `/api/pottery/${r._id}/accept`),
      call(app, owner, "post", `/api/pottery/${r._id}/cancel`),
    ]);
    noServerErrors([accept, cancel]);
    const wins = [accept, cancel].filter((x) => x.status === 200);
    const losses = [accept, cancel].filter((x) => x.status === 409);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect(losses[0].body.error.code).toBe("INVALID_STATE");

    const doc = await PotteryRequest.findById(r._id);
    const expected = accept.status === 200 ? "accepted" : "cancelled";
    expect(doc.status).toBe(expected);
    expect(doc.history.map((h) => h.status)).toEqual(["requested", expected]);
  });

  it("booking confirm vs customer cancel: final state, responses and history are consistent", async () => {
    const owner = customers[1];
    const bk = await makeBooking(owner, addDays(todayIST(), 40));
    const [confirm, cancel] = await Promise.all([
      call(app, studio, "post", `/api/bookings/${bk._id}/confirm`),
      call(app, owner, "post", `/api/bookings/${bk._id}/cancel`),
    ]);
    noServerErrors([confirm, cancel]);

    // The customer's cancel is legal from requested AND confirmed, so it always succeeds.
    expect(cancel.status).toBe(200);
    const doc = await WallBooking.findById(bk._id);
    expect(doc.status).toBe("cancelled");
    if (confirm.status === 200) {
      expect(doc.history.map((h) => h.status)).toEqual(["requested", "confirmed", "cancelled"]); // confirm ran first
    } else {
      expect(confirm.status).toBe(409);
      expect(doc.history.map((h) => h.status)).toEqual(["requested", "cancelled"]); // cancel ran first
    }
    // The reservation is released either way: the date can be booked again.
    expect(await WallBooking.countDocuments({ date: bk.date, status: { $in: ["requested", "confirmed"] } })).toBe(0);
    expect((await call(app, customers[2], "post", "/api/bookings", validBooking(bk.date))).status).toBe(201);
  });
});
