/**
 * Phase 4.1 – Serial telemetry service (updated)
 *
 * Critical fix from Phase 3:
 *   Previously returned early if the device wasn't found in MongoDB,
 *   which silently dropped all socket broadcasts.
 *
 *   Now: socket events are emitted FIRST (always), persistence is
 *   attempted SECOND (best-effort, skipped if device not paired).
 *
 * This is the correct priority for the bridge milestone:
 *   1. Live UI must work immediately
 *   2. Persistence is desirable but not blocking
 *
 * Architecture (decoupled from transport layer):
 *   serialTransport → parseLine → handleNormalizedTelemetry (this file)
 *                                    ↓                 ↓
 *                              broadcastLiveTelemetry  tryPersist
 *
 * Future wireless transports call handleNormalizedTelemetry() identically.
 */

import { Types } from "mongoose";
import { Device } from "../../models/Device";
import { Telemetry } from "../../models/Telemetry";
import { Alert } from "../../models/Alert";
import { episodeTracker } from "./episodeTracker";
import { serialDebugStore } from "./serialDebugStore";
import {
  broadcastLiveTelemetry,
  broadcastDeviceStatus,
  broadcastSevereAlert,
} from "../../sockets";
import type { NormalizedTelemetry, DetectionEvent } from "./types";

// ------------------------------------------------------------------
// Device / patient resolution cache
// This is only needed for persistence — NOT for socket broadcasts.
// ------------------------------------------------------------------

interface DeviceContext {
  deviceObjectId: Types.ObjectId;
  patientId: Types.ObjectId;
}

const deviceCache = new Map<string, DeviceContext>();

async function tryResolveDevice(deviceId: string): Promise<DeviceContext | null> {
  if (deviceCache.has(deviceId)) {
    return deviceCache.get(deviceId)!;
  }
  try {
    const device = await Device.findOne({ deviceId }).lean();
    if (!device) return null;

    const ctx: DeviceContext = {
      deviceObjectId: device._id as Types.ObjectId,
      patientId: device.patientId as Types.ObjectId,
    };
    deviceCache.set(deviceId, ctx);
    return ctx;
  } catch {
    return null;
  }
}

export function clearDeviceCache(): void {
  deviceCache.clear();
}

// ------------------------------------------------------------------
// Main handlers
// ------------------------------------------------------------------

/**
 * Handle a normalised telemetry record.
 *
 * Priority:
 *   1. Always update debug store (no DB needed)
 *   2. Always broadcast socket events (no DB needed)
 *   3. Attempt persistence — best-effort, does not block or throw
 */
export async function handleNormalizedTelemetry(
  telemetry: NormalizedTelemetry
): Promise<void> {
  // 1. Update in-memory debug store (always, no DB needed)
  serialDebugStore.setLastNormalized(telemetry);

  // 2. Attempt device/patient resolution for patient-scoped broadcast + persistence
  const ctx = await tryResolveDevice(telemetry.deviceId);

  if (ctx) {
    const { deviceObjectId, patientId } = ctx;
    const patientIdStr = patientId.toString();

    // Broadcast to patient-scoped listeners only
    broadcastLiveTelemetry(patientIdStr, telemetry);

    try {
      await Device.updateOne(
        { _id: deviceObjectId },
        {
          $set: {
            lastSyncAt: telemetry.receivedAt,
          },
        }
      );
    } catch (err) {
      console.error("[SerialTelemetryService] Device sync update error:", err);
    }

    // Persist to Telemetry collection
    try {
      await Telemetry.create({
        patientId,
        deviceId: deviceObjectId,
        status: telemetry.status === "DETECTED" ? "DETECTED" : "NOT_DETECTED",
        frequencyHz: telemetry.frequencyHz,
        snr: telemetry.snr,
        amplitude: telemetry.amplitude,
        severity: telemetry.severity === "NONE" ? undefined : telemetry.severity,
        detectedAt: telemetry.detectedAt,
        rawPayload: { rawLine: telemetry.rawLine, source: telemetry.source },
      });
    } catch (err) {
      console.error("[SerialTelemetryService] Persist error:", err);
    }

    // Feed episode tracker
    try {
      await episodeTracker.onTelemetry(telemetry, patientId, deviceObjectId);
    } catch (err) {
      console.error("[SerialTelemetryService] Episode tracker error:", err);
    }

    // Create Alert for SEVERE events
    if (telemetry.severity === "SEVERE") {
      try {
        const alert = await Alert.create({
          patientId,
          deviceId: deviceObjectId,
          severity: "SEVERE",
          triggeredAt: telemetry.detectedAt,
          status: "active",
          message: `Severe tremor at ${telemetry.frequencyHz?.toFixed(2) ?? "?"} Hz`,
        });
        broadcastSevereAlert(patientIdStr, alert.toObject() as unknown as Record<string, unknown>);
      } catch (err) {
        console.error("[SerialTelemetryService] Alert creation error:", err);
      }
    }
  } else {
    // Device not in DB — log once per startup (cache miss only fires once)
    const warned = (globalThis as any).__serialDeviceWarnedOnce;
    if (!warned) {
      console.warn(
        `[SerialTelemetryService] Device '${telemetry.deviceId}' not in DB — broadcasting live only, no persistence.`
      );
      (globalThis as any).__serialDeviceWarnedOnce = true;
    }
  }
}

/**
 * Handle a detection event (keyword line from parser).
 */
export async function handleDetectionEvent(event: DetectionEvent): Promise<void> {
  serialDebugStore.pushEvent(event);

  if (event.type === "END" || event.type === "SKIP") {
    try {
      await episodeTracker.onEpisodeEnd();
    } catch (err) {
      console.error("[SerialTelemetryService] Episode close error:", err);
    }
  }
}

/**
 * Notify connected clients that the serial device went online/offline.
 * Phase 4.1: broadcasts to the global "all" channel so the frontend
 * always sees connection state regardless of DB pairing.
 */
export function notifyDeviceConnectionChange(
  deviceId: string,
  connected: boolean
): void {
  const payload = { connected, deviceId, ts: new Date() };

  // Also broadcast to patient-scoped channel if device is cached/paired
  const ctx = deviceCache.get(deviceId);
  if (ctx) {
    broadcastDeviceStatus(ctx.patientId.toString(), payload);
  }
}
