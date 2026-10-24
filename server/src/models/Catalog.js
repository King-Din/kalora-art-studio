import mongoose from "mongoose";

const namedSchema = () =>
  new mongoose.Schema(
    { seedId: { type: String, required: true, unique: true }, name: { type: String, required: true } },
    { timestamps: true }
  );

export const PotteryItem = mongoose.model("PotteryItem", namedSchema());
export const Glaze = mongoose.model("Glaze", namedSchema());

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    muralRatePerSqFt: { type: Number, required: true },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);
export const Config = mongoose.model("Config", configSchema);
