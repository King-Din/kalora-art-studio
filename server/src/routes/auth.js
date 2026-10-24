import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, publicUser } from "../models/index.js";
import { AppError, parse } from "../middleware/errors.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginSchema, signupSchema } from "../rules/validation.js";

// Compared against when the email is unknown, so "no such user" costs the same time as "wrong password".
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", env.BCRYPT_ROUNDS);

const cookieBase = { httpOnly: true, sameSite: "lax", secure: env.COOKIE_SECURE, path: "/" };

function startSession(res, user) {
  // The token carries ONLY the user id. Role is read from the database on every request.
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: env.JWT_EXPIRES_IN });
  const { exp } = jwt.decode(token);
  res.cookie("token", token, { ...cookieBase, maxAge: exp * 1000 - Date.now() });
}

export function authRoutes({ enableRateLimit }) {
  const r = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !enableRateLimit,
    handler: (_req, _res, next) => next(new AppError(429, "TOO_MANY_REQUESTS", "Too many login attempts. Try again in a few minutes.")),
  });

  r.post("/signup", async (req, res) => {
    // `role` is not in the schema, so it is stripped: signup can only ever create a customer.
    const { name, email, password } = parse(signupSchema, req.body ?? {});
    if (await User.exists({ email })) throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: "customer" });
    startSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });

  r.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body ?? {});
    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    startSession(res, user);
    res.json({ user: publicUser(user) });
  });

  r.post("/logout", authenticate, (_req, res) => {
    res.clearCookie("token", cookieBase);
    res.json({ ok: true });
  });

  r.get("/me", authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

  return r;
}
