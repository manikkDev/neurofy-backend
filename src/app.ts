import express from "express";
import cors from "cors";
import { env } from "./config";
import { errorHandler, notFoundHandler } from "./middlewares";
import apiRouter from "./routes";

const app = express();

// --- Core Middlewares ---
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use("/api", apiRouter);

// --- 404 Handler ---
app.use(notFoundHandler);

// --- Centralized Error Handler ---
app.use(errorHandler);

export default app;
