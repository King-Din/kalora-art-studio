import { env } from "../config/env.js";
import { AppError } from "./errors.js";

const UNSAFE = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Defence in depth next to SameSite=Lax: if a browser tells us where the request came from
// and it is not our own origin, refuse it. No Origin header (curl, Supertest) passes.
export function originCheck(req, _res, next) {
  const origin = req.get("origin");
  if (UNSAFE.has(req.method) && origin) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {
      /* malformed origin is refused below */
    }

    const reqHost = req.get("x-forwarded-host") || req.get("host");
    const isDev = env.NODE_ENV === "development";
    const isDevClient = isDev && (host === "localhost:5173" || host === "127.0.0.1:5173");

    if (host !== reqHost && !isDevClient) {
      throw new AppError(403, "FORBIDDEN", "Cross-site requests are not allowed.");
    }
  }
  next();
}
