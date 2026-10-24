import mongoose from "mongoose";

// One entry per status change. Written ONLY by the server (see services/common.js).
export const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, maxlength: 300 },
  },
  { _id: false }
);
