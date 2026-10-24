import mongoose from "mongoose";
import { historySchema } from "./history.js";

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    painting: { type: mongoose.Schema.Types.ObjectId, ref: "Painting", required: true },
    priceAtPurchase: { type: Number, required: true },
    status: { type: String, enum: ["placed", "cancelled"], default: "placed" },
    history: [historySchema],
  },
  { timestamps: true }
);

// DATABASE GUARANTEE: at most one "placed" order per painting, whatever the app code does.
orderSchema.index(
  { painting: 1 },
  { unique: true, partialFilterExpression: { status: "placed" }, name: "one_placed_order_per_painting" }
);
orderSchema.index({ customer: 1, createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
