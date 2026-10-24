import { Order, Painting, PotteryRequest, WallBooking } from "../models/index.js";

async function countsByStatus(Model, statuses) {
  const rows = await Model.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  const out = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const r of rows) out[r._id] = r.count;
  return out;
}

// Real counts straight from the database. Nothing invented (no revenue, no analytics).
export async function adminSummary() {
  const [paintings, orders, bookings, pottery] = await Promise.all([
    countsByStatus(Painting, ["available", "sold"]),
    countsByStatus(Order, ["placed", "cancelled"]),
    countsByStatus(WallBooking, ["requested", "confirmed", "declined", "cancelled"]),
    countsByStatus(PotteryRequest, ["requested", "accepted", "declined", "cancelled"]),
  ]);
  return { paintings, orders, bookings, pottery };
}
