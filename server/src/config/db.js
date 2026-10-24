import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 10000,
    });
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("querySrv") || err.code === "ECONNREFUSED" || err.syscall === "querySrv")
    ) {
      // Fallback: system DNS resolver refused or failed SRV records.
      // Use standard public DNS resolvers (8.8.8.8 / 1.1.1.1) for SRV resolution.
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(env.MONGODB_URI, {
          dbName: env.MONGODB_DB_NAME,
          serverSelectionTimeoutMS: 10000,
        });
      } catch (retryErr) {
        throw retryErr;
      }
    } else {
      throw err;
    }
  }
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
