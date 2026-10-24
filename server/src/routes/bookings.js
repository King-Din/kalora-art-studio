import express from "express";
import { WallBooking } from "../models/index.js";
import { parse } from "../middleware/errors.js";
import { requireRole } from "../middleware/authenticate.js";
import { noteSchema, statusQuery } from "../rules/validation.js";
import { findOwned, listFor } from "../services/common.js";
import { availability, cancelBooking, createBooking, decideBooking, presentBooking } from "../services/bookings.js";

export const bookingRoutes = express.Router();

// Must be registered before "/:id".
bookingRoutes.get("/availability", async (req, res) => res.json(await availability({ ...req.query })));

bookingRoutes.post("/", requireRole("customer"), async (req, res) => {
  res.status(201).json({ booking: presentBooking(await createBooking(req.user, req.body)) });
});

bookingRoutes.get("/", async (req, res) => {
  const q = parse(statusQuery(["requested", "confirmed", "declined", "cancelled"]), { ...req.query });
  const rows = await listFor(WallBooking, req.user, q);
  res.json({ bookings: rows.map(presentBooking) });
});

bookingRoutes.get("/:id", async (req, res) => {
  res.json({ booking: presentBooking(await findOwned(WallBooking, req.params.id, req.user)) });
});

bookingRoutes.post("/:id/cancel", requireRole("customer"), async (req, res) => {
  res.json({ booking: presentBooking(await cancelBooking(req.params.id, req.user)) });
});

for (const [action, to] of [["confirm", "confirmed"], ["decline", "declined"]]) {
  bookingRoutes.post(`/:id/${action}`, requireRole("studio"), async (req, res) => {
    const { note } = parse(noteSchema, req.body ?? {});
    res.json({ booking: presentBooking(await decideBooking(req.params.id, req.user, to, note)) });
  });
}
