import { Order, Painting } from "../models/index.js";
import { AppError, assertId, notFound } from "../middleware/errors.js";
import { findOwned, historyEntry, runTx, staleState, transition } from "./common.js";

const soldError = () => new AppError(409, "PAINTING_ALREADY_SOLD", "Someone bought this painting a moment ago.");

// S1: IMPOSSIBLE-TO-DOUBLE-SELL PURCHASE.
// Layer 1: a conditional update (status must still be "available") claims the painting atomically.
// Layer 2: it all runs in a transaction, so the claim and the order commit together or not at all.
// Layer 3: the unique partial index on orders.painting (status "placed") is the final backstop.
export async function buyPainting(paintingId, customer) {
  assertId(paintingId, "Painting");
  try {
    return await runTx(async (session) => {
      const painting = await Painting.findOneAndUpdate(
        { _id: paintingId, status: "available" },
        { $set: { status: "sold" } },
        { new: true, session }
      );

      if (!painting) {
        // Find out WHY it failed: missing, or sold?
        const existing = await Painting.findById(paintingId).session(session);
        if (!existing) throw notFound("Painting");
        // Double click / retry by the same customer: return their order instead of an error.
        const mine = await Order.findOne({ painting: paintingId, customer: customer._id, status: "placed" }).session(session);
        if (mine) return { order: mine, created: false };
        throw soldError();
      }

      // The price comes from the painting document we just claimed, never from the client.
      const [order] = await Order.create(
        [{
          customer: customer._id,
          painting: painting._id,
          priceAtPurchase: painting.price,
          status: "placed",
          history: [historyEntry("placed", customer)],
        }],
        { session }
      );
      return { order, created: true };
    });
  } catch (err) {
    // Transaction kept conflicting with other buyers: someone else is taking it. Report it as sold.
    if (err?.conflict) throw soldError();
    throw err;
  }
}

// Cancel: order placed -> cancelled AND painting sold -> available, in one transaction.
// If either condition fails, nothing is committed.
export async function cancelOrder(orderId, customer) {
  const order = await findOwned(Order, orderId, customer); // 404 if missing / not yours
  if (order.status !== "placed") throw staleState("order", order.status);

  try {
    return await runTx(async (session) => {
      const cancelled = await transition({
        Model: Order, kind: "order", id: order._id, from: ["placed"], to: "cancelled",
        actor: customer, extraFilter: { customer: customer._id }, session,
      });
      if (!cancelled) throw staleState("order", "changed");

      const reopened = await Painting.findOneAndUpdate(
        { _id: order.painting, status: "sold" },
        { $set: { status: "available" } },
        { new: true, session }
      );
      if (!reopened) throw new AppError(409, "INVALID_STATE", "The painting is not in a sold state, so nothing was changed.");
      return cancelled;
    });
  } catch (err) {
    if (err?.conflict) throw new AppError(409, "INVALID_STATE", "This order changed at the same moment. Please refresh.");
    throw err;
  }
}
