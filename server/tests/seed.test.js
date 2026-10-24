import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../src/config/env.js";
import { disconnectDb } from "../src/config/db.js";
import { Config, Glaze, Order, Painting, PotteryItem, User } from "../src/models/index.js";
import { runSeed } from "../scripts/seed.js";
import { call, createUser, makeOrder, startFile } from "./helpers.js";

const seed = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "seedData", "seed.json"), "utf8"));
let app;
beforeAll(async () => {
  app = await startFile(); // already seeded once
});
afterAll(disconnectDb);

const counts = async () => ({
  paintings: await Painting.countDocuments(), items: await PotteryItem.countDocuments(), glazes: await Glaze.countDocuments(),
  users: await User.countDocuments(), configs: await Config.countDocuments(),
});

describe("idempotent seed", () => {
  it("seeding twice creates no duplicates", async () => {
    const before = await counts();
    await runSeed({ quiet: true });
    expect(await counts()).toEqual(before);
    expect(before.paintings).toBe(seed.paintings.length);
    expect(await User.countDocuments({ role: "studio" })).toBe(1);
  });

  it("sold paintings stay sold, and styles come from the explicit map", async () => {
    await runSeed({ quiet: true });
    for (const id of ["p-004", "p-009"]) expect((await Painting.findOne({ seedId: id })).status).toBe("sold");
    expect((await Painting.findOne({ seedId: "p-001" })).style).toBe("Madhubani");
    expect((await Painting.findOne({ seedId: "p-012" })).style).toBe("Oil on Canvas");
  });

  it("a painting bought after the first seed stays sold after the second", async () => {
    const buyer = await createUser();
    const painting = await Painting.findOne({ seedId: "p-001", status: "available" });
    expect((await call(app, buyer, "post", `/api/paintings/${painting._id}/buy`)).status).toBe(201);
    await runSeed({ quiet: true });
    expect((await Painting.findById(painting._id)).status).toBe("sold");
  });

  it("re-seeding keeps customers, orders and history untouched", async () => {
    const customer = await createUser();
    const order = await makeOrder(customer);
    const usersBefore = await User.countDocuments();
    await runSeed({ quiet: true });
    expect(await User.countDocuments()).toBe(usersBefore);
    expect((await Order.findById(order._id)).history).toHaveLength(1);
  });

  it("studio password is hashed only on insert; image urls are normalised; Config is right", async () => {
    const studio = await User.findOne({ role: "studio" });
    const hash = studio.passwordHash;
    expect(hash).not.toBe(seed.studioAccount.password);
    await runSeed({ quiet: true });
    expect((await User.findById(studio._id)).passwordHash).toBe(hash);
    expect((await Painting.findOne({ seedId: "p-001" })).imageUrl).toBe("/images/p-001.jpg");
    expect((await Config.findOne({ key: "mural" })).muralRatePerSqFt).toBe(seed.mural.ratePerSqFt);
  });
});
