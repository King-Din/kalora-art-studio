import mongoose from "mongoose";
import { historySchema } from "./history.js";

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    wallSqFt: { type: Number, required: true },
    address: { type: String, required: true, maxlength: 300 },
    ratePerSqFt: { type: Number, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ["requested", "confirmed", "declined", "cancelled"], default: "requested" },
    history: [historySchema],
  },
  { timestamps: true }
);

// DATABASE GUARANTEE: a date is held while a booking is requested or confirmed.
// Declined/cancelled bookings fall out of the partial index, which frees the date.
// (Partial filters with $in need MongoDB 6.0+. verify-indexes fails loudly if Atlas rejects it.)
bookingSchema.index(
  { date: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["requested", "confirmed"] } },
    name: "one_active_booking_per_date",
  }
);
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ status: 1, createdAt: -1 });

export const WallBooking = mongoose.model("WallBooking", bookingSchema);
