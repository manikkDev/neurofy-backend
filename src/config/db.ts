import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<void> {
  try {
    console.log("[DB] Attempting to connect to MongoDB Atlas...");
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[DB] ✓ Successfully connected to MongoDB Atlas!`);
    console.log(`[DB] Database: ${mongoose.connection.name}`);
  } catch (error: any) {
    console.error("[DB] ✗ MongoDB connection failed:", error.message);
    
    if (env.NODE_ENV === "development") {
      console.warn("[DB] Server will continue without database connection.");
      return;
    }
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[DB] MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected");
  });
}
