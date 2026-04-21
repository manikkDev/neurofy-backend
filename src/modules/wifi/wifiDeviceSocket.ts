/**
 * WiFi Device WebSocket Handler
 * 
 * Handles WebSocket connections from ESP32 devices over WiFi.
 * Uses plain WebSocket (ws library) for better Arduino compatibility.
 * Data is fed into the same processing pipeline as USB serial.
 */

import { Server as HttpServer } from "http";
import WebSocket from "ws";
import { Device } from "../../models/Device";
import { handleNormalizedTelemetry } from "../serial/serialTelemetryService";
import { broadcastDeviceStatus } from "../../sockets";
import type { NormalizedTelemetry } from "../serial/types";

interface DeviceAuthData {
  deviceId: string;
  wifiToken: string;
}

interface AuthenticatedSocket extends WebSocket {
  deviceId?: string;
  patientId?: string;
  isAuthenticated?: boolean;
}

const connectedDevices = new Map<string, AuthenticatedSocket>();
let wss: WebSocket.Server;

/**
 * Authenticate a WiFi device connection
 */
async function authenticateDevice(data: DeviceAuthData): Promise<{ success: boolean; patientId?: string; error?: string }> {
  try {
    const { deviceId, wifiToken } = data;

    if (!deviceId || !wifiToken) {
      return { success: false, error: "Missing deviceId or wifiToken" };
    }

    const device = await Device.findOne({ deviceId })
      .select("+wifiToken")
      .lean();

    if (!device) {
      return { success: false, error: "Device not found" };
    }

    if (device.transportType !== "wifi") {
      return { success: false, error: "Device not configured for WiFi" };
    }

    if (device.wifiToken !== wifiToken) {
      return { success: false, error: "Invalid WiFi token" };
    }

    return { success: true, patientId: device.patientId.toString() };
  } catch (error) {
    console.error("[WiFi Device] Auth error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Update device WiFi connection status in database
 */
async function updateDeviceConnectionStatus(deviceId: string, connected: boolean, ipAddress?: string): Promise<void> {
  try {
    const update: any = {
      wifiConnected: connected,
      lastSyncAt: new Date(),
    };

    if (connected) {
      update.wifiLastConnectedAt = new Date();
      if (ipAddress) {
        update.wifiIpAddress = ipAddress;
      }
    }

    await Device.updateOne({ deviceId }, update);
  } catch (error) {
    console.error(`[WiFi Device] Failed to update connection status for ${deviceId}:`, error);
  }
}

/**
 * Send JSON message to WebSocket client
 */
function sendMessage(ws: WebSocket, type: string, data: any): void {
  const msg = JSON.stringify({ type, data });
  ws.send(msg);
}

/**
 * Initialize plain WebSocket server for WiFi devices
 */
export function initializeWifiDeviceSocket(httpServer: HttpServer): void {
  wss = new WebSocket.Server({ 
    server: httpServer,
    path: "/device-ws"
  });

  wss.on("connection", async (ws: AuthenticatedSocket, req) => {
    const clientIp = req.socket.remoteAddress || "unknown";
    console.log(`[WiFi Device] Connection from ${clientIp}`);

    let isAuthenticated = false;
    let authTimeout: NodeJS.Timeout;

    // Device must authenticate within 10 seconds
    authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log(`[WiFi Device] Auth timeout for ${clientIp}`);
        sendMessage(ws, "auth_response", { success: false, error: "Authentication timeout" });
        ws.close();
      }
    }, 10000);

    ws.on("message", async (message: WebSocket.RawData) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "auth") {
          console.log(`[WiFi Device] Auth attempt:`, JSON.stringify(data.payload));
          
          const result = await authenticateDevice(data.payload);

          if (!result.success) {
            console.log(`[WiFi Device] Auth failed: ${result.error}`);
            sendMessage(ws, "auth_response", { success: false, error: result.error });
            ws.close();
            return;
          }

          clearTimeout(authTimeout);
          isAuthenticated = true;
          ws.isAuthenticated = true;
          ws.deviceId = data.payload.deviceId;
          ws.patientId = result.patientId;

          connectedDevices.set(data.payload.deviceId, ws);

          await updateDeviceConnectionStatus(data.payload.deviceId, true, clientIp);

          if (ws.patientId) {
            broadcastDeviceStatus(ws.patientId, {
              connected: true,
              deviceId: data.payload.deviceId,
              ts: new Date(),
            });
          }

          console.log(`[WiFi Device] Authenticated: ${data.payload.deviceId} (Patient: ${ws.patientId})`);
          sendMessage(ws, "auth_response", { success: true });
        }
        else if (data.type === "telemetry") {
          if (!isAuthenticated || !ws.deviceId || !ws.patientId) {
            return;
          }

          // Enrich telemetry with device metadata
          const enrichedData: NormalizedTelemetry = {
            ...data.payload,
            _deviceId: ws.deviceId,
            _patientId: ws.patientId,
          };

          // Feed into the same pipeline as USB serial
          await handleNormalizedTelemetry(enrichedData);
        }
      } catch (error) {
        console.error(`[WiFi Device] Message error from ${clientIp}:`, error);
      }
    });

    ws.on("close", async () => {
      console.log(`[WiFi Device] Disconnected: ${clientIp}`);
      
      if (ws.deviceId) {
        connectedDevices.delete(ws.deviceId);
        await updateDeviceConnectionStatus(ws.deviceId, false);

        if (ws.patientId) {
          broadcastDeviceStatus(ws.patientId, {
            connected: false,
            deviceId: ws.deviceId,
            ts: new Date(),
          });
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`[WiFi Device] WebSocket error from ${clientIp}:`, error);
    });
  });

  console.log("[WiFi Device] Plain WebSocket server initialized at /device-ws");
}

export function getWifiDeviceWSS(): WebSocket.Server {
  return wss;
}

/**
 * Get currently connected WiFi devices
 */
export function getConnectedWifiDevices(): string[] {
  return Array.from(connectedDevices.keys());
}

/**
 * Check if a specific device is connected via WiFi
 */
export function isDeviceConnectedViaWifi(deviceId: string): boolean {
  return connectedDevices.has(deviceId);
}
