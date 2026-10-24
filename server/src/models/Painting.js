import mongoose from "mongoose";

const paintingSchema = new mongoose.Schema(
  {
    seedId: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    artist: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 1500 },
    price: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    imageUrl: { type: String, required: true },
    style: { type: String, default: "", trim: true, maxlength: 80 },
    status: { type: String, enum: ["available", "sold"], default: "available" },
  },
  { timestamps: true }
);

export const Painting = mongoose.model("Painting", paintingSchema);
