/**
 * WiFi Device Test Script
 * 
 * Simulates an ESP32 device connecting via WiFi for testing purposes.
 * Use this to test the WiFi device functionality without physical hardware.
 * 
 * Usage:
 *   tsx src/scripts/testWifiDevice.ts <deviceId> <wifiToken>
 * 
 * Example:
 *   tsx src/scripts/testWifiDevice.ts ESP32-TEST-001 a1b2c3d4...
 */

import { io, Socket } from "socket.io-client";

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: tsx src/scripts/testWifiDevice.ts <deviceId> <wifiToken>");
  console.error("Example: tsx src/scripts/testWifiDevice.ts ESP32-TEST-001 abc123...");
  process.exit(1);
}

const DEVICE_ID = args[0];
const WIFI_TOKEN = args[1];
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

console.log("=".repeat(60));
console.log("Neurofy WiFi Device Test Simulator");
console.log("=".repeat(60));
console.log(`Device ID: ${DEVICE_ID}`);
console.log(`Server: ${SERVER_URL}`);
console.log(`WiFi Token: ${WIFI_TOKEN.substring(0, 16)}...`);
console.log("=".repeat(60));
console.log("");

// Initialize Socket.IO client
const socket: Socket = io(`${SERVER_URL}/device-ws`, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

let isAuthenticated = false;
let telemetryInterval: NodeJS.Timeout | null = null;

// Connection handlers
socket.on("connect", () => {
  console.log(`[${new Date().toISOString()}] ✓ Connected to server`);
  console.log(`[${new Date().toISOString()}]   Socket ID: ${socket.id}`);
  
  // Send authentication
  authenticateDevice();
});

socket.on("disconnect", (reason) => {
  console.log(`[${new Date().toISOString()}] ✗ Disconnected: ${reason}`);
  isAuthenticated = false;
  
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
});

socket.on("connect_error", (error) => {
  console.error(`[${new Date().toISOString()}] ✗ Connection error:`, error.message);
});

// Authentication
function authenticateDevice() {
  console.log(`[${new Date().toISOString()}] → Sending authentication...`);
  
  socket.emit("auth", {
    deviceId: DEVICE_ID,
    wifiToken: WIFI_TOKEN,
  });
}

// Handle authentication response
socket.on("auth_response", (data: { success: boolean; error?: string }) => {
  if (data.success) {
    console.log(`[${new Date().toISOString()}] ✓ Authentication successful!`);
    console.log("");
    isAuthenticated = true;
    
    // Start sending telemetry
    startSendingTelemetry();
  } else {
    console.error(`[${new Date().toISOString()}] ✗ Authentication failed: ${data.error}`);
    console.log("\nPossible issues:");
    console.log("  1. Invalid WiFi token");
    console.log("  2. Device not configured for WiFi in database");
    console.log("  3. Device ID mismatch");
    console.log("\nCheck the Neurofy dashboard device settings.");
    socket.disconnect();
    process.exit(1);
  }
});

// Handle errors from server
socket.on("error", (error: { message: string }) => {
  console.error(`[${new Date().toISOString()}] ✗ Server error: ${error.message}`);
});

// Simulated telemetry data
function generateTelemetryData() {
  const now = Date.now();
  const shouldDetectTremor = Math.random() < 0.3; // 30% chance of tremor
  
  if (shouldDetectTremor) {
    const frequency = 3.0 + Math.random() * 5.0; // 3-8 Hz
    const amplitude = 0.5 + Math.random() * 1.5; // 0.5-2.0
    
    let severity: "MILD" | "MODERATE" | "SEVERE";
    if (frequency > 7.0) {
      severity = "SEVERE";
    } else if (frequency > 5.0) {
      severity = "MODERATE";
    } else {
      severity = "MILD";
    }
    
    return {
      deviceId: DEVICE_ID,
      timestamp: now,
      frequency: parseFloat(frequency.toFixed(2)),
      amplitude: parseFloat(amplitude.toFixed(2)),
      severity,
      tremorDetected: true,
      receivedAt: new Date().toISOString(),
    };
  } else {
    return {
      deviceId: DEVICE_ID,
      timestamp: now,
      frequency: 0,
      amplitude: 0,
      severity: "NONE",
      tremorDetected: false,
      receivedAt: new Date().toISOString(),
    };
  }
}

// Send telemetry data
function sendTelemetry() {
  if (!isAuthenticated) {
    console.log(`[${new Date().toISOString()}] ⚠ Not authenticated, skipping telemetry`);
    return;
  }
  
  const telemetry = generateTelemetryData();
  socket.emit("telemetry", telemetry);
  
  const status = telemetry.tremorDetected 
    ? `🔴 TREMOR DETECTED (${telemetry.severity}) - ${telemetry.frequency}Hz, ${telemetry.amplitude}G`
    : `🟢 Normal`;
  
  console.log(`[${new Date().toISOString()}] → ${status}`);
}

// Start sending telemetry at regular intervals
function startSendingTelemetry() {
  console.log("Starting telemetry transmission (1 sample/second)");
  console.log("Press Ctrl+C to stop");
  console.log("");
  console.log("Telemetry Data:");
  console.log("-".repeat(60));
  
  // Send immediately
  sendTelemetry();
  
  // Then send every second
  telemetryInterval = setInterval(() => {
    sendTelemetry();
  }, 1000);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("");
  console.log("-".repeat(60));
  console.log(`[${new Date().toISOString()}] ⚠ Shutting down...`);
  
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
  }
  
  socket.disconnect();
  
  console.log(`[${new Date().toISOString()}] ✓ Disconnected`);
  process.exit(0);
});

// Keep the script running
console.log("Connecting to server...");
console.log("");
