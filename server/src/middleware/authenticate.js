import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/index.js";
import { AppError, isObjectIdString } from "./errors.js";

const unauth = () => new AppError(401, "UNAUTHENTICATED", "Please log in to continue.");

// Verifies the JWT from the httpOnly cookie, then loads the user from the DATABASE every time.
// So a deleted user, or a changed role, takes effect on the very next request.
export async function authenticate(req, _res, next) {
  const token = req.cookies?.token;
  if (!token) throw unauth();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw unauth();
  }
  if (!isObjectIdString(payload.sub)) throw unauth();
  const user = await User.findById(payload.sub);
  if (!user) throw unauth();
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user.role !== role) {
      throw new AppError(403, "FORBIDDEN", "Your account type is not allowed to do this.");
    }
    next();
  };
}
