import express from "express";
import { Order } from "../models/index.js";
import { parse } from "../middleware/errors.js";
import { requireRole } from "../middleware/authenticate.js";
import { statusQuery } from "../rules/validation.js";
import { findOwned, listFor } from "../services/common.js";
import { cancelOrder } from "../services/orders.js";

export const orderRoutes = express.Router();
const populate = [{ path: "painting", select: "title artist imageUrl style price status" }];

orderRoutes.get("/", async (req, res) => {
  const q = parse(statusQuery(["placed", "cancelled"]), { ...req.query });
  res.json({ orders: await listFor(Order, req.user, q, populate) });
});

orderRoutes.get("/:id", async (req, res) => {
  res.json({ order: await findOwned(Order, req.params.id, req.user, { populate }) });
});

orderRoutes.post("/:id/cancel", requireRole("customer"), async (req, res) => {
  res.json({ order: await cancelOrder(req.params.id, req.user) });
});
