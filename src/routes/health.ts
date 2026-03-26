import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus[dbState] || "unknown",
      environment: process.env.NODE_ENV || "development",
    },
  });
});

export default router;
