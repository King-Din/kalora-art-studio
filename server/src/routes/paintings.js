import express from "express";
import { parse } from "../middleware/errors.js";
import { requireRole } from "../middleware/authenticate.js";
import { paintingCreateSchema, paintingQuerySchema, paintingUpdateSchema } from "../rules/validation.js";
import { buyPainting } from "../services/orders.js";
import { createPainting, getPainting, listPaintings, updatePainting } from "../services/paintings.js";

export const paintingRoutes = express.Router();

// Query is parsed with a .strict() schema, so ?q[$ne]=x (an unknown key) is a 400.
paintingRoutes.get("/", async (req, res) => {
  const query = parse(paintingQuerySchema, { ...req.query });
  res.json({ paintings: await listPaintings(query) });
});

paintingRoutes.get("/:id", async (req, res) => res.json({ painting: await getPainting(req.params.id) }));

paintingRoutes.post("/", requireRole("studio"), async (req, res) => {
  const data = parse(paintingCreateSchema, req.body ?? {});
  res.status(201).json({ painting: await createPainting(data) });
});

paintingRoutes.patch("/:id", requireRole("studio"), async (req, res) => {
  const data = parse(paintingUpdateSchema, req.body ?? {});
  res.json({ painting: await updatePainting(req.params.id, data) });
});

paintingRoutes.post("/:id/buy", requireRole("customer"), async (req, res) => {
  const { order, created } = await buyPainting(req.params.id, req.user);
  res.status(created ? 201 : 200).json({ order });
});
