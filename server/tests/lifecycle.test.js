import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDb } from "../src/config/db.js";
import { Config, Order, Painting, PotteryRequest, WallBooking } from "../src/models/index.js";
import { addDays, todayIST } from "../src/rules/dates.js";
import { call, createUser, makeBooking, makePainting, nextDate, startFile, validBooking, validPottery } from "./helpers.js";

let app, a, b, studio;
beforeAll(async () => {
  app = await startFile();
  [a, b, studio] = [await createUser(), await createUser(), await createUser("studio")];
});
afterAll(disconnectDb);

describe("paintings and orders", () => {
  it("buy -> sold -> cancel -> available -> another customer buys", async () => {
    const p = await makePainting();
    const buy = await call(app, a, "post", `/api/paintings/${p._id}/buy`);
    expect(buy.status).toBe(201);
    expect((await Painting.findById(p._id)).status).toBe("sold");

    // everyone sees it as sold (and it is still listed)
    const list = await call(app, b, "get", "/api/paintings?available=false");
    expect(list.body.paintings.some((x) => x._id === String(p._id))).toBe(true);
    expect((await call(app, b, "post", `/api/paintings/${p._id}/buy`)).body.error.code).toBe("PAINTING_ALREADY_SOLD");

    const cancel = await call(app, a, "post", `/api/orders/${buy.body.order._id}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.order.status).toBe("cancelled");
    expect((await Painting.findById(p._id)).status).toBe("available");

    expect((await call(app, b, "post", `/api/paintings/${p._id}/buy`)).status).toBe(201);
    expect(await Order.countDocuments({ painting: p._id, status: "placed" })).toBe(1);
  });

  it("p-004 and p-009 stay sold and cannot be bought", async () => {
    for (const seedId of ["p-004", "p-009"]) {
      const p = await Painting.findOne({ seedId });
      expect(p.status).toBe("sold");
      const res = await call(app, a, "post", `/api/paintings/${p._id}/buy`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("PAINTING_ALREADY_SOLD");
    }
  });

  it("the studio cannot edit a sold painting but can edit an available one", async () => {
    const sold = await Painting.findOne({ seedId: "p-004" });
    const res = await call(app, studio, "patch", `/api/paintings/${sold._id}`, { price: 1234 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE");
    const free = await makePainting();
    expect((await call(app, studio, "patch", `/api/paintings/${free._id}`, { price: 1234 })).body.painting.price).toBe(1234);
  });

  it("the same customer buying twice gets their existing order back", async () => {
    const p = await makePainting();
    const first = await call(app, a, "post", `/api/paintings/${p._id}/buy`);
    const second = await call(app, a, "post", `/api/paintings/${p._id}/buy`);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.order._id).toBe(first.body.order._id);
    expect(await Order.countDocuments({ painting: p._id })).toBe(1);
  });

  it("cancelling twice -> 409 INVALID_STATE and the painting is not reopened twice", async () => {
    const p = await makePainting();
    const o = (await call(app, a, "post", `/api/paintings/${p._id}/buy`)).body.order;
    expect((await call(app, a, "post", `/api/orders/${o._id}/cancel`)).status).toBe(200);
    await call(app, b, "post", `/api/paintings/${p._id}/buy`);
    const again = await call(app, a, "post", `/api/orders/${o._id}/cancel`);
    expect(again.status).toBe(409);
    expect((await Painting.findById(p._id)).status).toBe("sold"); // b's purchase is untouched
  });

  it("order history matches the transitions", async () => {
    const p = await makePainting();
    const o = (await call(app, a, "post", `/api/paintings/${p._id}/buy`)).body.order;
    await call(app, a, "post", `/api/orders/${o._id}/cancel`);
    const order = await Order.findById(o._id);
    expect(order.history.map((h) => h.status)).toEqual(["placed", "cancelled"]);
    expect(order.history.every((h) => String(h.by) === String(a._id) && h.role === "customer")).toBe(true);
  });
});

describe("wall bookings", () => {
  it("valid date accepted; 6 and 91 days rejected; wrong formats rejected", async () => {
    expect((await call(app, a, "post", "/api/bookings", validBooking(addDays(todayIST(), 7)))).status).toBe(201);
    for (const n of [6, 91]) {
      const res = await call(app, a, "post", "/api/bookings", validBooking(addDays(todayIST(), n)));
      expect(res.status).toBe(400);
      expect(res.body.error.details.date).toBeTruthy();
    }
    for (const date of ["2026-02-30", "01-12-2026", 20261201]) {
      expect((await call(app, a, "post", "/api/bookings", validBooking(date))).status).toBe(400);
    }
  });

  it("duplicate date -> 409 DATE_TAKEN; decline frees it; cancel frees it", async () => {
    const date = nextDate();
    const first = await call(app, a, "post", "/api/bookings", validBooking(date));
    expect(first.status).toBe(201);
    expect((await call(app, b, "post", "/api/bookings", validBooking(date))).body.error.code).toBe("DATE_TAKEN");

    expect((await call(app, studio, "post", `/api/bookings/${first.body.booking._id}/decline`, { note: "Not available" })).status).toBe(200);
    const second = await call(app, b, "post", "/api/bookings", validBooking(date));
    expect(second.status).toBe(201);

    expect((await call(app, b, "post", `/api/bookings/${second.body.booking._id}/cancel`)).status).toBe(200);
    expect((await call(app, a, "post", "/api/bookings", validBooking(date))).status).toBe(201);
  });

  it("availability lists taken dates only, no personal data", async () => {
    const date = nextDate();
    await call(app, a, "post", "/api/bookings", validBooking(date));
    const res = await call(app, b, "get", `/api/bookings/availability?from=${todayIST()}&to=${addDays(todayIST(), 90)}`);
    expect(res.status).toBe(200);
    expect(res.body.takenDates).toContain(date);
    expect(JSON.stringify(res.body)).not.toMatch(/address|customer|email/i);
  });

  it("availability validates its range", async () => {
    const bad = `/api/bookings/availability?from=${addDays(todayIST(), 10)}&to=${todayIST()}`;
    expect((await call(app, a, "get", bad)).status).toBe(400);
    expect((await call(app, a, "get", `/api/bookings/availability?from=${todayIST()}&to=${addDays(todayIST(), 121)}`)).status).toBe(400);
    expect((await call(app, a, "get", "/api/bookings/availability")).status).toBe(400);
  });

  it("cancellation cutoff: 3 days ok, 2 days -> 409 CANCELLATION_WINDOW_CLOSED", async () => {
    const ok = await makeBooking(a, addDays(todayIST(), 3));
    const late = await makeBooking(a, addDays(todayIST(), 2), "confirmed");
    expect((await call(app, a, "post", `/api/bookings/${ok._id}/cancel`)).status).toBe(200);
    const res = await call(app, a, "post", `/api/bookings/${late._id}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CANCELLATION_WINDOW_CLOSED");
    expect((await WallBooking.findById(late._id)).status).toBe("confirmed");
  });

  it("confirm/decline only from requested; history matches", async () => {
    const bk = (await call(app, a, "post", "/api/bookings", validBooking())).body.booking;
    expect((await call(app, studio, "post", `/api/bookings/${bk._id}/confirm`)).status).toBe(200);
    const again = await call(app, studio, "post", `/api/bookings/${bk._id}/decline`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVALID_STATE");
    const doc = await WallBooking.findById(bk._id);
    expect(doc.history.map((h) => h.status)).toEqual(["requested", "confirmed"]);
    expect(doc.history[1].role).toBe("studio");
  });

  it("price is wallSqFt x rate and stays a snapshot when the rate changes later", async () => {
    const cfg = await Config.findOne({ key: "mural" });
    const rate = cfg.muralRatePerSqFt;
    const bk = (await call(app, a, "post", "/api/bookings", validBooking())).body.booking;
    expect(bk.price).toBe(25 * rate);
    await Config.updateOne({ key: "mural" }, { muralRatePerSqFt: rate + 50 });
    try {
      expect((await WallBooking.findById(bk._id)).price).toBe(25 * rate);
    } finally {
      await Config.updateOne({ key: "mural" }, { muralRatePerSqFt: rate });
    }
  });
});

describe("pottery requests", () => {
  it("create -> edit -> cancel while requested; names come from the seed", async () => {
    const created = await call(app, a, "post", "/api/pottery", validPottery());
    expect(created.status).toBe(201);
    expect(created.body.request.itemName).toBeTruthy();
    expect(created.body.request.price).toBeUndefined(); // no pottery price exists
    const edited = await call(app, a, "patch", `/api/pottery/${created.body.request._id}`, { ...validPottery(), quantity: 5 });
    expect(edited.body.request.quantity).toBe(5);
    expect((await call(app, a, "post", `/api/pottery/${created.body.request._id}/cancel`)).status).toBe(200);
  });

  it("edit and cancel are refused after the studio accepts", async () => {
    const r = (await call(app, a, "post", "/api/pottery", validPottery())).body.request;
    expect((await call(app, studio, "post", `/api/pottery/${r._id}/accept`)).status).toBe(200);
    expect((await call(app, a, "patch", `/api/pottery/${r._id}`, validPottery())).status).toBe(409);
    const cancel = await call(app, a, "post", `/api/pottery/${r._id}/cancel`);
    expect(cancel.status).toBe(409);
    expect(cancel.body.error.code).toBe("INVALID_STATE");
    expect((await PotteryRequest.findById(r._id)).status).toBe("accepted");
  });

  it("invalid item/glaze ids, quantity and needed-by -> 400 with field details", async () => {
    const bad = await call(app, a, "post", "/api/pottery", { ...validPottery(), itemId: "nope", glazeId: "nope" });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(["itemId", "glazeId"]));
    expect((await call(app, a, "post", "/api/pottery", { ...validPottery(), quantity: 13 })).status).toBe(400);
    expect((await call(app, a, "post", "/api/pottery", { ...validPottery(), neededBy: addDays(todayIST(), 13) })).status).toBe(400);
    expect((await call(app, a, "post", "/api/pottery", { ...validPottery(), neededBy: addDays(todayIST(), 14) })).status).toBe(201);
  });
});

describe("admin summary", () => {
  it("returns real counts", async () => {
    const res = await call(app, studio, "get", "/api/admin/summary");
    expect(res.status).toBe(200);
    expect(res.body.paintings.sold).toBe(await Painting.countDocuments({ status: "sold" }));
    expect(res.body.orders.placed).toBe(await Order.countDocuments({ status: "placed" }));
  });
});
