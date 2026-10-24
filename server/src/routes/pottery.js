import express from "express";
import { PotteryRequest } from "../models/index.js";
import { parse } from "../middleware/errors.js";
import { requireRole } from "../middleware/authenticate.js";
import { noteSchema, statusQuery } from "../rules/validation.js";
import { findOwned, listFor } from "../services/common.js";
import { cancelRequest, createRequest, decideRequest, editRequest, potteryOptions } from "../services/pottery.js";

export const potteryRoutes = express.Router();

potteryRoutes.get("/options", async (_req, res) => res.json(await potteryOptions()));

potteryRoutes.post("/", requireRole("customer"), async (req, res) => {
  res.status(201).json({ request: await createRequest(req.user, req.body) });
});

potteryRoutes.get("/", async (req, res) => {
  const q = parse(statusQuery(["requested", "accepted", "declined", "cancelled"]), { ...req.query });
  res.json({ requests: await listFor(PotteryRequest, req.user, q) });
});

potteryRoutes.get("/:id", async (req, res) => {
  res.json({ request: await findOwned(PotteryRequest, req.params.id, req.user) });
});

potteryRoutes.patch("/:id", requireRole("customer"), async (req, res) => {
  res.json({ request: await editRequest(req.params.id, req.user, req.body) });
});

potteryRoutes.post("/:id/cancel", requireRole("customer"), async (req, res) => {
  res.json({ request: await cancelRequest(req.params.id, req.user) });
});

for (const [action, to] of [["accept", "accepted"], ["decline", "declined"]]) {
  potteryRoutes.post(`/:id/${action}`, requireRole("studio"), async (req, res) => {
    const { note } = parse(noteSchema, req.body ?? {});
    res.json({ request: await decideRequest(req.params.id, req.user, to, note) });
  });
}
