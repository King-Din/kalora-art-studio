import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { initIndexes } from "./models/index.js";

await connectDb();
await initIndexes();
createApp().listen(env.PORT, () => console.log(`Art Studio API listening on port ${env.PORT} (db: ${env.MONGODB_DB_NAME})`));
