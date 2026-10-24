import { Glaze, PotteryItem, PotteryRequest } from "../models/index.js";
import { parse, validationFail } from "../middleware/errors.js";
import { potteryNeededByError, potterySchema } from "../rules/validation.js";
import { findOwned, historyEntry, staleState, transition } from "./common.js";

export async function potteryOptions() {
  const [items, glazes] = await Promise.all([
    PotteryItem.find().sort({ seedId: 1 }).lean(),
    Glaze.find().sort({ seedId: 1 }).lean(),
  ]);
  return {
    items: items.map((i) => ({ id: i.seedId, name: i.name })),
    glazes: glazes.map((g) => ({ id: g.seedId, name: g.name })),
  };
}

// Validates everything, and copies item/glaze NAMES from the seeded documents (never from the client).
// There is deliberately NO price: the seed has none and we never invent one.
async function validatedRequest(body) {
  const input = parse(potterySchema, body ?? {});
  const [item, glaze] = await Promise.all([
    PotteryItem.findOne({ seedId: input.itemId }),
    Glaze.findOne({ seedId: input.glazeId }),
  ]);
  const problems = {};
  if (!item) problems.itemId = "Choose an item from the list.";
  if (!glaze) problems.glazeId = "Choose a glaze from the list.";
  const dateProblem = potteryNeededByError(input.neededBy);
  if (dateProblem) problems.neededBy = dateProblem;
  if (Object.keys(problems).length) throw validationFail(problems);
  return {
    itemId: item.seedId, itemName: item.name,
    glazeId: glaze.seedId, glazeName: glaze.name,
    quantity: input.quantity, neededBy: input.neededBy,
  };
}

export async function createRequest(customer, body) {
  const data = await validatedRequest(body);
  return PotteryRequest.create({ ...data, customer: customer._id, status: "requested", history: [historyEntry("requested", customer)] });
}

// Edit only while "requested". The status is in the filter, so an accept that lands first wins.
export async function editRequest(id, customer, body) {
  const existing = await findOwned(PotteryRequest, id, customer);
  if (existing.status !== "requested") throw staleState("pottery request", existing.status);
  const data = await validatedRequest(body);
  const updated = await PotteryRequest.findOneAndUpdate(
    { _id: existing._id, customer: customer._id, status: "requested" },
    { $set: data, $push: { history: historyEntry("requested", customer, "edited") } },
    { new: true }
  );
  if (!updated) {
    const fresh = await PotteryRequest.findById(existing._id).select("status");
    throw staleState("pottery request", fresh?.status ?? "changed");
  }
  return updated;
}

export async function cancelRequest(id, customer) {
  const existing = await findOwned(PotteryRequest, id, customer);
  if (existing.status !== "requested") throw staleState("pottery request", existing.status);
  const updated = await transition({
    Model: PotteryRequest, kind: "pottery", id: existing._id, from: ["requested"], to: "cancelled",
    actor: customer, extraFilter: { customer: customer._id },
  });
  if (!updated) throw staleState("pottery request", "changed");
  return updated;
}

export async function decideRequest(id, studio, to, note) {
  const existing = await findOwned(PotteryRequest, id, studio);
  const updated = await transition({
    Model: PotteryRequest, kind: "pottery", id: existing._id, from: ["requested"], to, actor: studio, note,
  });
  if (!updated) {
    const fresh = await PotteryRequest.findById(existing._id).select("status");
    throw staleState("pottery request", fresh?.status ?? "changed");
  }
  return updated;
}
