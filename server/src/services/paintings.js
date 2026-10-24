import { Painting } from "../models/index.js";
import { AppError, assertId, notFound } from "../middleware/errors.js";

// Treat user text as LITERAL text: escape every regex metacharacter.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listPaintings({ q, style, available, sort }) {
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: rx }, { artist: rx }, { description: rx }];
  }
  if (style) filter.style = style;
  if (available === "true") filter.status = "available";
  if (available === "false") filter.status = "sold";
  const sorts = {
    price_asc: { price: 1, _id: 1 },
    price_desc: { price: -1, _id: 1 },
    newest: { createdAt: -1, _id: -1 },
  };
  return Painting.find(filter).sort(sorts[sort] ?? sorts.newest);
}

export async function getPainting(id) {
  assertId(id, "Painting");
  const painting = await Painting.findById(id);
  if (!painting) throw notFound("Painting");
  return painting;
}

export async function createPainting(data) {
  return Painting.create({ ...data, status: "available" });
}

// Editing is allowed only while the painting is available: the status is part of the filter,
// so a painting sold a moment ago cannot be edited.
export async function updatePainting(id, data) {
  assertId(id, "Painting");
  const updated = await Painting.findOneAndUpdate({ _id: id, status: "available" }, { $set: data }, { new: true, runValidators: true });
  if (updated) return updated;
  const exists = await Painting.findById(id).select("status");
  if (!exists) throw notFound("Painting");
  throw new AppError(409, "INVALID_STATE", "Only available paintings can be edited. This one is sold.");
}
