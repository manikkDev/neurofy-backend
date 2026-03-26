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

// --- Root Welcome Route ---
app.get("/", (req, res) => {
  res.status(200).json({
    name: "Neurofy Platform API",
    version: "1.0.0",
    status: "online",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    message: "Welcome to the Neurofy Healthcare API. Please use a validated client application to interact with these endpoints.",
    links: {
      health: "/api/health",
      api: "/api"
    }
  });
});

// --- API Routes ---
app.use("/api", apiRouter);

// --- 404 Handler ---
app.use(notFoundHandler);

// --- Centralized Error Handler ---
app.use(errorHandler);

export default app;
