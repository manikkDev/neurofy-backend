import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../config";
import type { NormalizedTelemetry, RawSerialLine } from "../modules/serial/types";

let io: SocketIOServer;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} - ${reason}`);
    });

    socket.on("error", (error) => {
      console.error(`[Socket] Error on ${socket.id}:`, error);
    });
  });

  console.log("[Socket] Socket.IO server initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
}

// ------------------------------------------------------------------
// Phase 3 broadcast helpers
// Event naming convention: "<domain>:<scope>:<id>"
// ------------------------------------------------------------------

/**
 * Event: telemetry:live:{patientId}
 * Payload: NormalizedTelemetry
 * Consumers: Patient dashboard, Doctor patient detail
 */
export function broadcastLiveTelemetry(
  patientId: string,
  data: NormalizedTelemetry
): void {
  try {
    getIO().emit(`telemetry:live:${patientId}`, data);
  } catch {
    // io not ready yet (startup race) — ignore
  }
}

/**
 * Event: device:status:{patientId}
 * Payload: { connected: boolean; deviceId: string; ts: Date }
 * Consumers: Patient dashboard device card, Doctor patient detail
 */
export function broadcastDeviceStatus(
  patientId: string,
  data: { connected: boolean; deviceId: string; ts: Date }
): void {
  try {
    getIO().emit(`device:status:${patientId}`, data);
  } catch {
    // io not ready yet — ignore
  }
}

/**
 * Event: alert:severe:{patientId}
 * Payload: IAlert (plain object)
 * Consumers: Patient severe alert banner, Doctor severe alert queue
 */
export function broadcastSevereAlert(
  patientId: string,
  alert: Record<string, unknown>
): void {
  try {
    getIO().emit(`alert:severe:${patientId}`, alert);
  } catch {
    // io not ready yet — ignore
  }
}

/**
 * Event: debug:serial
 * Payload: RawSerialLine
 * Consumers: SerialDebugPanel (dev only)
 */
export function broadcastDebugLine(line: RawSerialLine): void {
  try {
    getIO().emit("debug:serial", line);
  } catch {
    // io not ready yet — ignore
  }
}
