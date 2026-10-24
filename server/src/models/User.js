import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "studio"], required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

// Never send passwordHash to a client.
export function publicUser(u) {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role };
}
