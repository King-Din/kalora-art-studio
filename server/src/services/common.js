import mongoose from "mongoose";
import { AppError, isObjectIdString, notFound } from "../middleware/errors.js";
import { canTransition } from "../rules/transitions.js";

// History entries are built here, never from client input.
export function historyEntry(status, actor, note) {
  return { status, by: actor._id, role: actor.role, at: new Date(), ...(note ? { note } : {}) };
}

// Customers can only see their own records; the studio sees all.
// Missing, not-owned and malformed ids all give the SAME 404, so existence never leaks.
export async function findOwned(Model, id, user, { session, populate = [] } = {}) {
  if (!isObjectIdString(id)) throw notFound();
  const filter = user.role === "customer" ? { _id: id, customer: user._id } : { _id: id };
  let query = Model.findOne(filter);
  if (session) query = query.session(session);
  for (const p of populate) query = query.populate(p);
  if (user.role === "studio") query = query.populate("customer", "name email");
  const doc = await query;
  if (!doc) throw notFound();
  return doc;
}

export async function listFor(Model, user, { status } = {}, populate = []) {
  const filter = {};
  if (user.role === "customer") filter.customer = user._id;
  if (status) filter.status = status;
  let query = Model.find(filter).sort({ createdAt: -1, _id: -1 });
  for (const p of populate) query = query.populate(p);
  if (user.role === "studio") query = query.populate("customer", "name email");
  return query;
}

// THE state-machine helper. Every status change in the app goes through here.
// One conditional update: it only matches while the record is STILL in an allowed "from" state
// (and, for customers, still owned). If someone changed it first, it returns null -> caller says 409.
export async function transition({ Model, kind, id, from, to, actor, extraFilter = {}, set = {}, unset = {}, note, session }) {
  const allowedFrom = from.filter((f) => canTransition(kind, f, to, actor.role));
  if (allowedFrom.length === 0) {
    throw new AppError(409, "INVALID_STATE", `A ${kind} cannot move to "${to}" from that state.`);
  }
  const update = {
    $set: { status: to, ...set },
    $push: { history: historyEntry(to, actor, note) },
  };
  if (Object.keys(unset).length) update.$unset = unset;
  return Model.findOneAndUpdate({ _id: id, status: { $in: allowedFrom }, ...extraFilter }, update, { new: true, session });
}

export const staleState = (what, status) =>
  new AppError(409, "INVALID_STATE", `This ${what} is now "${status}", so that action is no longer possible.`, { currentStatus: status });

// Bounded transaction runner. Retries ONLY transient errors (e.g. a write conflict with another
// transaction touching the same document), at most `attempts` times, with a small random pause.
// The callback must have no side effects outside the database because it can run more than once.
export async function runTx(fn, attempts = 8) {
  for (let attempt = 1; ; attempt++) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction().catch(() => {});
      const transient =
        err?.code === 112 ||
        (typeof err?.hasErrorLabel === "function" &&
          (err.hasErrorLabel("TransientTransactionError") || err.hasErrorLabel("UnknownTransactionCommitResult")));
      if (!transient) throw err;
      if (attempt >= attempts) {
        const busy = new AppError(409, "INVALID_STATE", "The record changed at the same moment. Please refresh and retry.");
        busy.conflict = true;
        throw busy;
      }
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 40 * attempt));
    } finally {
      await session.endSession();
    }
  }
}
