import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../config";
import { TokenService, type TokenPayload } from "../modules/auth/tokenService";
import { getAssignedPatients } from "../middlewares/access";
import type { NormalizedTelemetry, RawSerialLine } from "../modules/serial/types";

let io: SocketIOServer;

function getTokenFromSocket(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.substring(7);
  }

  return null;
}

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = getTokenFromSocket(socket);
    if (!token) {
      return next();
    }

    try {
      const payload = TokenService.verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    const user = socket.data.user as TokenPayload | undefined;

    if (user) {
      socket.join(`user:${user.userId}`);

      if (user.role === "patient") {
        socket.join(`patient:${user.userId}`);
      }

      if (user.role === "doctor") {
        try {
          const assignedPatients = await getAssignedPatients(user.userId);
          assignedPatients.forEach((patientId) => {
            socket.join(`patient:${patientId}`);
          });
        } catch (error) {
          console.error(`[Socket] Failed to join doctor rooms for ${socket.id}:`, error);
        }
      }
    }

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
    getIO().to(`patient:${patientId}`).emit(`telemetry:live:${patientId}`, data);
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
    getIO().to(`patient:${patientId}`).emit(`device:status:${patientId}`, data);
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
    getIO().to(`patient:${patientId}`).emit(`alert:severe:${patientId}`, alert);
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
