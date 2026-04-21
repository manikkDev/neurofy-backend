/**
 * Device Management Routes
 * 
 * Handles device pairing, WiFi configuration, and transport selection
 */

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middlewares/auth";
import { Device } from "../../models/Device";
import { getIO } from "../../sockets";
import crypto from "crypto";

const router = Router();

/**
 * Device authentication via HTTP (for ESP32 WiFi HTTP mode)
 * No JWT required - authenticates with deviceId + wifiToken
 * POST /api/devices/auth
 */
router.post("/auth", async (req: Request, res: Response) => {
  try {
    const { deviceId, wifiToken } = req.body;

    if (!deviceId || !wifiToken) {
      return res.status(400).json({ success: false, error: "Missing deviceId or wifiToken" });
    }

    const device = await Device.findOne({ deviceId }).select("+wifiToken").lean();

    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }

    if (device.transportType !== "wifi") {
      return res.status(403).json({ success: false, error: "Device not configured for WiFi" });
    }

    if (device.wifiToken !== wifiToken) {
      return res.status(401).json({ success: false, error: "Invalid WiFi token" });
    }

    // Update connection status
    await Device.updateOne(
      { deviceId },
      {
        wifiConnected: true,
        wifiLastConnectedAt: new Date(),
        wifiIpAddress: req.ip,
        lastSyncAt: new Date(),
      }
    );

    // Broadcast device status
    try {
      const io = getIO();
      io.to(`patient:${device.patientId}`).emit("device_status", {
        connected: true,
        deviceId,
        ts: new Date(),
      });
    } catch (e) { /* Socket.IO may not be ready */ }

    console.log(`[HTTP Device] Authenticated: ${deviceId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
});

/**
 * Device telemetry via HTTP (for ESP32 WiFi HTTP mode)
 * No JWT required - validates via deviceId + transportType check
 * POST /api/devices/telemetry
 */
router.post("/telemetry", async (req: Request, res: Response) => {
  try {
    const { deviceId, frequency, amplitude, severity, tremorDetected, snr, score, confirmCount, statusText } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: "Missing deviceId" });
    }

    const device = await Device.findOne({ deviceId });

    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }

    if (device.transportType !== "wifi") {
      return res.status(403).json({ success: false, error: "Device not configured for WiFi" });
    }

    // Map ESP32 severity to valid enum values
    // ESP32 sends: NORMAL, MILD, MODERATE, SEVERE
    // Backend accepts: NONE, MILD, MODERATE, SEVERE
    let mappedSeverity: "NONE" | "MILD" | "MODERATE" | "SEVERE" | undefined;
    if (severity === "NORMAL" || severity === "NONE" || !severity) {
      mappedSeverity = "NONE";
    } else {
      mappedSeverity = severity;
    }

    const now = new Date();

    // Build proper NormalizedTelemetry object
    const telemetryData = {
      deviceId,
      source: "WIRELESS" as const,
      detectedAt: now,
      receivedAt: now,
      status: tremorDetected ? "DETECTED" as const : "NOT_DETECTED" as const,
      frequencyHz: frequency || 0,
      amplitude: amplitude || 0,
      snr: snr || 0,
      severity: mappedSeverity,
      score: score || 0,
      confirmCount: confirmCount || 0,
      statusText: statusText || "",
      rawLine: JSON.stringify(req.body),
    };

    // Feed into the same pipeline as USB serial
    const { handleNormalizedTelemetry } = await import("../serial/serialTelemetryService");
    await handleNormalizedTelemetry(telemetryData as any);

    res.json({ success: true });
  } catch (err) {
    console.error("[HTTP Device] Telemetry error:", err);
    res.status(500).json({ success: false, error: "Failed to process telemetry" });
  }
});

// All routes below require JWT authentication
router.use(authenticate);

/**
 * Get devices for authenticated user
 * GET /api/devices
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const devices = await Device.find({ patientId: userId })
      .select("-wifiToken")
      .sort({ createdAt: -1 });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.json({ success: true, data: devices });
  } catch (err) {
    next(err);
  }
});

/**
 * Update device transport type
 * PATCH /api/devices/:id/transport
 */
router.patch("/:id/transport", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { transportType } = req.body;
    const userId = req.user!.userId;

    if (!["usb_serial", "wifi"].includes(transportType)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid transport type. Must be 'usb_serial' or 'wifi'" },
      });
    }

    const device = await Device.findOne({ _id: id, patientId: userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: { message: "Device not found" },
      });
    }

    device.transportType = transportType;

    // Generate WiFi token if switching to WiFi and none exists
    if (transportType === "wifi" && !device.wifiToken) {
      device.wifiToken = crypto.randomBytes(32).toString("hex");
    }

    await device.save();

    const response = device.toObject();
    if (transportType === "wifi") {
      response.wifiToken = device.wifiToken;
    } else {
      delete response.wifiToken;
    }

    res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
});

/**
 * Get WiFi configuration for device
 * GET /api/devices/:id/wifi-config
 */
router.get("/:id/wifi-config", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const device = await Device.findOne({ _id: id, patientId: userId })
      .select("+wifiToken");

    if (!device) {
      return res.status(404).json({
        success: false,
        error: { message: "Device not found" },
      });
    }

    if (device.transportType !== "wifi") {
      return res.status(400).json({
        success: false,
        error: { message: "Device is not configured for WiFi" },
      });
    }

    if (!device.wifiToken) {
      device.wifiToken = crypto.randomBytes(32).toString("hex");
      await device.save();
    }

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        wifiToken: device.wifiToken,
        serverUrl: process.env.SERVER_URL || "http://localhost:5000",
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Regenerate WiFi token for device
 * POST /api/devices/:id/regenerate-wifi-token
 */
router.post("/:id/regenerate-wifi-token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const device = await Device.findOne({ _id: id, patientId: userId })
      .select("+wifiToken");

    if (!device) {
      return res.status(404).json({
        success: false,
        error: { message: "Device not found" },
      });
    }

    if (device.transportType !== "wifi") {
      return res.status(400).json({
        success: false,
        error: { message: "Device is not configured for WiFi" },
      });
    }

    device.wifiToken = crypto.randomBytes(32).toString("hex");
    device.wifiConnected = false;
    await device.save();

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        wifiToken: device.wifiToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
