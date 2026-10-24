import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import helmet from "helmet";
import { env, REPO_ROOT } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { originCheck } from "./middleware/originCheck.js";
import { requestId } from "./middleware/requestId.js";
import { buildApi } from "./routes/index.js";

// Exported separately from server.js so Supertest can use it without opening a port.
export function createApp({ enableRateLimit = env.NODE_ENV !== "test" } = {}) {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestId);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Admin-supplied image URLs may be any https site.
          "img-src": ["'self'", "data:", "https:"],
          // Plain-http local production runs must keep working.
          "upgrade-insecure-requests": null,
        },
      },
    })
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(originCheck);

  app.use("/images", express.static(path.join(REPO_ROOT, "seedData", "images")));
  app.use("/images", (_req, res) => res.status(404).end());
  app.use("/api", buildApi({ enableRateLimit }));

  // Production-style run: Express also serves the built React app.
  const dist = path.join(REPO_ROOT, "client", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
