import { DateTime } from "luxon";

// All "today" and day-difference logic uses Asia/Kolkata CALENDAR days.
// We never divide milliseconds by 24h (that breaks around midnight and DST-like shifts).
export const ZONE = "Asia/Kolkata";

let clock = () => DateTime.now().setZone(ZONE);

export function now() {
  return clock();
}

// Injectable clock, for tests only. It THROWS outside NODE_ENV=test so production can't be faked.
export function setNow(dt) {
  if (process.env.NODE_ENV !== "test") throw new Error("setNow is only available when NODE_ENV=test");
  clock = () => (dt ? dt.setZone(ZONE) : DateTime.now().setZone(ZONE));
}
export function resetNow() {
  setNow(null);
}

export function todayIST() {
  return now().toISODate();
}

// Strict YYYY-MM-DD that is also a REAL calendar date (rejects 2026-02-30).
export function parseDateOnly(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const dt = DateTime.fromISO(str, { zone: ZONE });
  if (!dt.isValid || dt.toISODate() !== str) return null;
  return dt;
}

export function isRealDate(str) {
  return parseDateOnly(str) !== null;
}

// Whole calendar days from today (IST) to `str`. Negative if in the past.
export function daysUntil(str) {
  const target = parseDateOnly(str);
  if (!target) throw new Error("daysUntil needs a valid YYYY-MM-DD date");
  return Math.round(target.startOf("day").diff(now().startOf("day"), "days").days);
}

export function daysBetween(fromStr, toStr) {
  return Math.round(parseDateOnly(toStr).diff(parseDateOnly(fromStr), "days").days);
}

export function addDays(str, n) {
  return parseDateOnly(str).plus({ days: n }).toISODate();
}
