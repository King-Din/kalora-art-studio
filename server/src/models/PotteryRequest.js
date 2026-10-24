import mongoose from "mongoose";
import { historySchema } from "./history.js";

const potterySchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    glazeId: { type: String, required: true },
    glazeName: { type: String, required: true },
    quantity: { type: Number, required: true },
    neededBy: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, enum: ["requested", "accepted", "declined", "cancelled"], default: "requested" },
    history: [historySchema],
  },
  { timestamps: true }
);

potterySchema.index({ customer: 1, createdAt: -1 });
potterySchema.index({ status: 1, createdAt: -1 });

export const PotteryRequest = mongoose.model("PotteryRequest", potterySchema);
