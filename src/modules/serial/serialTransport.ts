/**
 * Phase 3 – Serial transport layer
 *
 * Opens the COM port (or any configured serial port), reads line-by-line,
 * feeds each line through the parser and telemetry service.
 *
 * Design goals:
 *   - Never crashes on device disconnect — schedules reconnect instead
 *   - Can be fully disabled via SERIAL_ENABLED=false
 *   - All config comes from environment variables (no hardcoding)
 *   - Decoupled from MongoDB / Socket.IO — those concerns live in serialTelemetryService
 *   - Future wireless transports reuse the same downstream pipeline
 *
 * Architecture:
 *   SerialPort  →  ReadlineParser  →  parseLine()  →  handleNormalizedTelemetry()
 *                                                   →  handleDetectionEvent()
 *                                                   →  debug store (raw)
 */

import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { env } from "../../config";
import { parseLine } from "./lineParser";
import {
  handleNormalizedTelemetry,
  handleDetectionEvent,
  notifyDeviceConnectionChange,
} from "./serialTelemetryService";
import { serialDebugStore } from "./serialDebugStore";
import { broadcastDebugLine } from "../../sockets";

const RECONNECT_DELAY_MS = 5_000;

let port: SerialPort | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let shuttingDown = false;

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (shuttingDown) return;
  clearReconnectTimer();
  console.log(
    `[Serial] Reconnecting to ${env.SERIAL_PORT} in ${RECONNECT_DELAY_MS / 1000}s...`
  );
  reconnectTimer = setTimeout(() => {
    openPort();
  }, RECONNECT_DELAY_MS);
}

function openPort() {
  if (shuttingDown) return;

  clearReconnectTimer();
  console.log(
    `[Serial] Opening ${env.SERIAL_PORT} at ${env.SERIAL_BAUD_RATE} baud`
  );

  try {
    port = new SerialPort({
      path: env.SERIAL_PORT,
      baudRate: env.SERIAL_BAUD_RATE,
      autoOpen: false,
    });
  } catch (err) {
    console.error("[Serial] Failed to create SerialPort instance:", err);
    serialDebugStore.markDisconnected();
    scheduleReconnect();
    return;
  }

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  port.open((err) => {
    if (err) {
      console.error(
        `[Serial] Failed to open ${env.SERIAL_PORT}:`,
        err.message
      );
      serialDebugStore.markDisconnected();
      scheduleReconnect();
      return;
    }

    console.log(
      `[Serial] Port ${env.SERIAL_PORT} opened at ${env.SERIAL_BAUD_RATE} baud`
    );
    serialDebugStore.markConnected(env.SERIAL_PORT, env.SERIAL_BAUD_RATE);
    notifyDeviceConnectionChange(env.DEVICE_ID_DEFAULT, true);
  });

  parser.on("data", (rawLine: string) => {
    const line = rawLine.trimEnd();
    const ts = new Date();

    // Store raw line in debug store and broadcast to debug listeners
    const rawEntry = { rawLine: line, ts };
    serialDebugStore.pushRawLine(rawEntry);
    broadcastDebugLine(rawEntry);

    // Parse and route
    let parsed;
    try {
      parsed = parseLine(line, env.DEVICE_ID_DEFAULT);
    } catch (err: any) {
      serialDebugStore.pushError(line, String(err?.message ?? err));
      return;
    }

    if (parsed.kind === "telemetry") {
      handleNormalizedTelemetry(parsed.data).catch((e) =>
        console.error("[Serial] Telemetry handler error:", e)
      );
    } else if (parsed.kind === "event") {
      handleDetectionEvent(parsed.data).catch((e) =>
        console.error("[Serial] Event handler error:", e)
      );
    }
    // raw lines are already stored in debug store — nothing else to do
  });

  port.on("close", () => {
    console.warn(`[Serial] Port ${env.SERIAL_PORT} closed`);
    serialDebugStore.markDisconnected();
    notifyDeviceConnectionChange(env.DEVICE_ID_DEFAULT, false);
    scheduleReconnect();
  });

  port.on("error", (err) => {
    console.error(`[Serial] Port error on ${env.SERIAL_PORT}:`, err.message);
    serialDebugStore.markDisconnected();
    notifyDeviceConnectionChange(env.DEVICE_ID_DEFAULT, false);
    // port.on('close') will fire after error — reconnect is handled there
  });
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Start serial ingestion. Called once from server.ts after DB connects.
 * Safe to call unconditionally — checks SERIAL_ENABLED env flag internally.
 */
export function startSerialIngestion(): void {
  if (!env.SERIAL_ENABLED) {
    console.log("[Serial] SERIAL_ENABLED=false — serial ingestion disabled");
    return;
  }
  openPort();
}

/**
 * Gracefully close the port (e.g. on process SIGTERM).
 */
export function stopSerialIngestion(): void {
  shuttingDown = true;
  clearReconnectTimer();
  if (port?.isOpen) {
    port.close((err) => {
      if (err) console.error("[Serial] Error closing port:", err);
      else console.log("[Serial] Port closed cleanly");
    });
  }
}
