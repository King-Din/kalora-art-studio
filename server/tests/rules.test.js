import { DateTime } from "luxon";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ZONE, addDays, daysUntil, isRealDate, resetNow, setNow, todayIST } from "../src/rules/dates.js";
import { bookingSchema, bookingWindowError, cancellationAllowed, potteryNeededByError, potterySchema } from "../src/rules/validation.js";
import { canTransition } from "../src/rules/transitions.js";

const TODAY = "2026-11-01";
beforeEach(() => setNow(DateTime.fromISO("2026-11-01T10:00:00", { zone: ZONE })));
afterAll(() => resetNow());

describe("booking window (7..90 days)", () => {
  it.each([[6, false], [7, true], [90, true], [91, false]])("%i days away -> allowed=%s", (n, ok) => {
    expect(bookingWindowError(addDays(TODAY, n)) === null).toBe(ok);
  });
});

describe("wall size 10..500 integer", () => {
  const base = { date: "2026-12-01", address: "x" };
  it.each([[9, false], [10, true], [500, true], [501, false], [10.5, false]])("%s sq ft -> valid=%s", (n, ok) => {
    expect(bookingSchema.safeParse({ ...base, wallSqFt: n }).success).toBe(ok);
  });
  it("rejects numbers sent as strings", () => {
    expect(bookingSchema.safeParse({ ...base, wallSqFt: "50" }).success).toBe(false);
  });
});

describe("pottery quantity 1..12 and needed-by >= 14 days", () => {
  const base = { itemId: "i-01", glazeId: "g-01", neededBy: "2026-12-01" };
  it.each([[0, false], [1, true], [12, true], [13, false]])("quantity %i -> valid=%s", (q, ok) => {
    expect(potterySchema.safeParse({ ...base, quantity: q }).success).toBe(ok);
  });
  it.each([[13, false], [14, true]])("needed-by %i days away -> allowed=%s", (n, ok) => {
    expect(potteryNeededByError(addDays(TODAY, n)) === null).toBe(ok);
  });
});

describe("cancellation cutoff", () => {
  it.each([[3, true], [2, false]])("%i days before -> cancel allowed=%s", (n, ok) => {
    expect(cancellationAllowed(addDays(TODAY, n))).toBe(ok);
  });
});

describe("date parsing", () => {
  it.each(["2026-02-30", "2026-13-01", "2026-1-5", "01-12-2026", "2026/12/01", "2026-12-01T00:00:00", ""])("rejects %s", (s) => {
    expect(isRealDate(s)).toBe(false);
  });
  it("accepts a real date", () => expect(isRealDate("2028-02-29")).toBe(true));
  it("rejects non-strings", () => expect(isRealDate(20261201)).toBe(false));
});

describe("IST calendar day boundary", () => {
  it("00:30 IST is already the new IST day (even though UTC is still the old day)", () => {
    setNow(DateTime.fromISO("2026-11-01T00:30:00", { zone: ZONE }));
    expect(todayIST()).toBe("2026-11-01");
    expect(daysUntil("2026-11-02")).toBe(1);
  });
  it("23:30 IST is still the same IST day", () => {
    setNow(DateTime.fromISO("2026-11-01T23:30:00", { zone: ZONE }));
    expect(todayIST()).toBe("2026-11-01");
    expect(daysUntil("2026-11-08")).toBe(7);
  });
});

describe("transition table", () => {
  it("allows only the documented moves", () => {
    expect(canTransition("order", "placed", "cancelled", "customer")).toBe(true);
    expect(canTransition("order", "placed", "cancelled", "studio")).toBe(false);
    expect(canTransition("booking", "requested", "confirmed", "studio")).toBe(true);
    expect(canTransition("booking", "confirmed", "cancelled", "customer")).toBe(true);
    expect(canTransition("booking", "declined", "confirmed", "studio")).toBe(false);
    expect(canTransition("pottery", "accepted", "cancelled", "customer")).toBe(false);
    expect(canTransition("pottery", "requested", "accepted", "customer")).toBe(false);
  });
});
