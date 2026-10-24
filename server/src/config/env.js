import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, "../..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "..");

// Explicit path so every script works from the repo root. dotenv never overrides
// variables that are already set (the test setup relies on that).
dotenv.config({ path: path.join(SERVER_ROOT, ".env") });

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const raw = { ...process.env };
if (raw.NODE_ENV === "test") {
  // Tests may only ever touch the test database, and use cheap bcrypt.
  raw.MONGODB_DB_NAME = "artstudio_test";
  raw.BCRYPT_ROUNDS = "4";
}

const parsed = schema.safeParse(raw);
if (!parsed.success) {
  // Name the broken variables, never print their values.
  const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))];
  throw new Error(`Invalid or missing environment variables: ${names.join(", ")}. See .env.example.`);
}

export const env = parsed.data;

if (env.NODE_ENV === "test" && !env.MONGODB_DB_NAME.endsWith("_test")) {
  throw new Error("Refusing to run tests: MONGODB_DB_NAME must end with _test.");
}
