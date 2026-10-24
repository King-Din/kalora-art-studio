import { Config, WallBooking } from "../models/index.js";
import { AppError, parse, validationFail } from "../middleware/errors.js";
import { addDays, daysBetween, daysUntil } from "../rules/dates.js";
import {
  LIMITS, availabilityQuerySchema, bookingSchema, bookingWindowError, cancellationAllowed, cancellationCutoff,
} from "../rules/validation.js";
import { findOwned, historyEntry, staleState, transition } from "./common.js";

// Adds server-computed helper fields the UI needs (so the browser never does timezone maths).
export function presentBooking(doc) {
  const b = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  const open = ["requested", "confirmed"].includes(b.status);
  return { ...b, cancelCutoff: cancellationCutoff(b.date), canCancel: open && cancellationAllowed(b.date) };
}

// S2: RACE-SAFE CALENDAR. We validate, price on the server, then simply INSERT.
// If two people insert the same date, the unique partial index rejects the loser (11000),
// which the central error handler turns into 409 DATE_TAKEN.
export async function createBooking(customer, body) {
  const input = parse(bookingSchema, body ?? {});
  const windowError = bookingWindowError(input.date);
  if (windowError) throw validationFail({ date: windowError });

  const config = await Config.findOne({ key: "mural" });
  if (!config) throw new AppError(500, "INTERNAL_ERROR", "Studio pricing is not configured. Please run the seed.");
  const price = input.wallSqFt * config.muralRatePerSqFt;
  if (!Number.isSafeInteger(price)) throw validationFail({ wallSqFt: "Price is out of range." });

  return WallBooking.create({
    customer: customer._id,
    date: input.date,
    wallSqFt: input.wallSqFt,
    address: input.address,
    ratePerSqFt: config.muralRatePerSqFt, // snapshots: later rate changes don't touch this booking
    price,
    status: "requested",
    history: [historyEntry("requested", customer)],
  });
}

// Taken dates only, no personal data.
export async function availability(query) {
  const { from, to } = parse(availabilityQuerySchema, query);
  if (from > to) throw validationFail({ to: "'to' must not be before 'from'." });
  if (daysBetween(from, to) > LIMITS.availabilityMaxRangeDays) {
    throw validationFail({ to: `The range can be at most ${LIMITS.availabilityMaxRangeDays} days.` });
  }
  const rows = await WallBooking.find({ date: { $gte: from, $lte: to }, status: { $in: ["requested", "confirmed"] } })
    .select("date -_id")
    .sort({ date: 1 })
    .lean();
  return { from, to, takenDates: rows.map((r) => r.date) };
}

export async function cancelBooking(id, customer) {
  const booking = await findOwned(WallBooking, id, customer);
  if (!["requested", "confirmed"].includes(booking.status)) throw staleState("booking", booking.status);
  if (daysUntil(booking.date) < LIMITS.cancelMinDays) {
    throw new AppError(409, "CANCELLATION_WINDOW_CLOSED", `Cancellation closed on ${addDays(booking.date, -LIMITS.cancelMinDays + 1)}: bookings can be cancelled up to ${LIMITS.cancelMinDays} days before the date.`);
  }
  const updated = await transition({
    Model: WallBooking, kind: "booking", id: booking._id, from: ["requested", "confirmed"], to: "cancelled",
    actor: customer, extraFilter: { customer: customer._id },
  });
  if (!updated) throw staleState("booking", "changed");
  return updated;
}

export async function decideBooking(id, studio, to, note) {
  const booking = await findOwned(WallBooking, id, studio);
  const updated = await transition({
    Model: WallBooking, kind: "booking", id: booking._id, from: ["requested"], to, actor: studio, note,
  });
  if (!updated) {
    const fresh = await WallBooking.findById(booking._id).select("status");
    throw staleState("booking", fresh?.status ?? "changed");
  }
  return updated;
}
