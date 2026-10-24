import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";

// Connect, ping, and COMMIT a trivial transaction. Prints sanitized output only.
try {
  await connectDb();
  const db = mongoose.connection.db;
  await db.admin().ping();
  const info = await db.admin().serverInfo();
  console.log(`Connected. database=${env.MONGODB_DB_NAME} mongoVersion=${info.version}`);

  await db.createCollection("_dbcheck").catch(() => {}); // exists already is fine
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const col = db.collection("_dbcheck");
      const { insertedId } = await col.insertOne({ at: new Date() }, { session });
      await col.deleteOne({ _id: insertedId }, { session });
    });
  } finally {
    await session.endSession();
  }
  console.log("Transaction committed. db:check OK");
  await disconnectDb();
} catch (err) {
  console.error(`db:check FAILED (${err.name}). Check the connection string, database user and Atlas Network Access.`);
  process.exit(1);
}
