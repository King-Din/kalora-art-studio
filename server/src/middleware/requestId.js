import crypto from "node:crypto";

// Gives every request an id, returns it in errors, and writes a one-line log.
// The log never contains bodies, cookies or passwords.
export function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  const started = Date.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms ${req.id}`);
  });
  next();
}
