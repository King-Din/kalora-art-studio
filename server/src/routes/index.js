import express from "express";
import mongoose from "mongoose";
import { Config } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";
import { AppError } from "../middleware/errors.js";
import { LIMITS } from "../rules/validation.js";
import { todayIST } from "../rules/dates.js";
import { adminSummary } from "../services/admin.js";
import { authRoutes } from "./auth.js";
import { bookingRoutes } from "./bookings.js";
import { orderRoutes } from "./orders.js";
import { paintingRoutes } from "./paintings.js";
import { potteryRoutes } from "./pottery.js";

export function buildApi({ enableRateLimit }) {
  const api = express.Router();

  // Public: health, signup, login. (logout and me authenticate inside the auth router.)
  api.get("/health", (_req, res) => res.json({ status: "ok", db: mongoose.connection.readyState === 1 }));
  api.use("/auth", authRoutes({ enableRateLimit }));

  // Everything below requires a logged-in user.
  api.use(authenticate);

  api.get("/config", async (_req, res) => {
    const cfg = await Config.findOne({ key: "mural" });
    res.json({ currency: "INR", muralRatePerSqFt: cfg?.muralRatePerSqFt ?? null, today: todayIST(), limits: LIMITS });
  });
  api.use("/paintings", paintingRoutes);
  api.use("/orders", orderRoutes);
  api.use("/bookings", bookingRoutes);
  api.use("/pottery", potteryRoutes);
  api.get("/admin/summary", requireRole("studio"), async (_req, res) => res.json(await adminSummary()));

  // Unknown /api paths get a JSON 404, never the SPA page.
  api.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "No such API route.")));
  return api;
}
