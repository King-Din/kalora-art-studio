import { z } from "zod";
import { addDays, daysUntil, isRealDate } from "./dates.js";

// Business limits live here, in one place. /api/config exposes them to the UI.
export const LIMITS = {
  bookingMinDays: 7,
  bookingMaxDays: 90,
  wallMinSqFt: 10,
  wallMaxSqFt: 500,
  addressMax: 300,
  potteryMinDays: 14,
  quantityMin: 1,
  quantityMax: 12,
  cancelMinDays: 3,
  availabilityMaxRangeDays: 120,
};

const dateOnly = z
  .string({ invalid_type_error: "Must be a date string (YYYY-MM-DD)", required_error: "Required" })
  .refine(isRealDate, "Use a real calendar date in YYYY-MM-DD format");

const id = z.string({ invalid_type_error: "Must be a string", required_error: "Required" }).min(1).max(40);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(200),
});

export const bookingSchema = z.object({
  date: dateOnly,
  wallSqFt: z.number({ invalid_type_error: "Must be a number", required_error: "Required" })
    .int("Must be a whole number")
    .min(LIMITS.wallMinSqFt, `At least ${LIMITS.wallMinSqFt} sq ft`)
    .max(LIMITS.wallMaxSqFt, `At most ${LIMITS.wallMaxSqFt} sq ft`),
  address: z.string({ required_error: "Required" }).trim().min(1, "Address is required").max(LIMITS.addressMax),
});

export const potterySchema = z.object({
  itemId: id,
  glazeId: id,
  quantity: z.number({ invalid_type_error: "Must be a number", required_error: "Required" })
    .int("Must be a whole number")
    .min(LIMITS.quantityMin, `At least ${LIMITS.quantityMin}`)
    .max(LIMITS.quantityMax, `At most ${LIMITS.quantityMax}`),
  neededBy: dateOnly,
});

export const paintingCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1500).default(""),
  price: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  imageUrl: z.string().trim().max(500).refine((u) => /^\/images\/[\w.\-]+$/.test(u) || /^https?:\/\/\S+$/i.test(u), "Use /images/... or an http(s) URL"),
  style: z.string().trim().min(1).max(80),
});
export const paintingUpdateSchema = paintingCreateSchema.partial().refine((o) => Object.keys(o).length > 0, "Send at least one field to change");

export const noteSchema = z.object({ note: z.string().trim().max(300).optional() });

export const paintingQuerySchema = z.object({
  q: z.string().max(100).optional(),
  style: z.string().max(80).optional(),
  available: z.enum(["true", "false"]).optional(),
  sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
}).strict();

export const statusQuery = (statuses) => z.object({ status: z.enum(statuses).optional() }).strict();

export const availabilityQuerySchema = z.object({ from: dateOnly, to: dateOnly }).strict();

// ---- date-window rules (return an error message, or null when fine) ----
export function bookingWindowError(date) {
  const d = daysUntil(date);
  return d < LIMITS.bookingMinDays || d > LIMITS.bookingMaxDays
    ? `Pick a date between ${LIMITS.bookingMinDays} and ${LIMITS.bookingMaxDays} days from today.`
    : null;
}

export function potteryNeededByError(date) {
  return daysUntil(date) < LIMITS.potteryMinDays
    ? `The needed-by date must be at least ${LIMITS.potteryMinDays} days from today.`
    : null;
}

export function cancellationAllowed(date) {
  return daysUntil(date) >= LIMITS.cancelMinDays;
}

export function cancellationCutoff(date) {
  return addDays(date, -LIMITS.cancelMinDays);
}
