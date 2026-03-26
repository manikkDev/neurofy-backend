/**
 * Phase 3 – Debug REST route
 *
 * GET /api/debug/serial
 *
 * Returns the current serial connection state, last N raw lines,
 * last normalized telemetry event, and recent parser errors.
 *
 * Useful during development because the ESP32 firmware currently
 * emits human-readable lines, not clean JSON.
 *
 * In production you may want to protect this route with auth middleware.
 */

import { Router, Request, Response } from "express";
import { serialDebugStore } from "./serialDebugStore";

const debugRouter = Router();

debugRouter.get("/serial", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    data: serialDebugStore.getSnapshot(),
  });
});

export default debugRouter;
