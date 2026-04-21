import { env } from "../../config";
import { Device } from "../../models/Device";
import { serialDebugStore } from "./serialDebugStore";
import type {
  DetectionEvent,
  NormalizedTelemetry,
  SerialDebugSnapshot,
  WaveformAvailability,
} from "./types";

export type LiveConnectionState =
  | "connected_active"
  | "connected_idle"
  | "disconnected"
  | "no_data"
  | "serial_disabled";

export interface PatientLiveDeviceSnapshot {
  device: {
    deviceId: string | null;
    label: string | null;
    pairingStatus: string | null;
    status: string | null;
    transportType: string | null;
    batteryLevel?: number;
    lastSyncAt?: Date | null;
    firmwareVersion?: string | null;
  };
  connection: {
    serialEnabled: boolean;
    connected: boolean;
    state: LiveConnectionState;
    portPath: string;
    baudRate: number;
    lastConnectedAt?: Date;
    lastDisconnectedAt?: Date;
    lastReceivedAt?: Date;
    wifiConnected?: boolean;
    wifiLastConnectedAt?: Date;
    wifiIpAddress?: string;
  };
  latestTelemetry: NormalizedTelemetry | null;
  recentEvents: DetectionEvent[];
  waveform: WaveformAvailability;
}

function telemetryMatchesDevice(
  telemetry: NormalizedTelemetry | undefined,
  deviceId: string | null
): telemetry is NormalizedTelemetry {
  return Boolean(telemetry && deviceId && telemetry.deviceId === deviceId);
}

function eventMatchesDevice(event: DetectionEvent, deviceId: string | null): boolean {
  if (!deviceId) return false;
  return event.deviceId === deviceId;
}

function deriveConnectionState(
  snapshot: SerialDebugSnapshot,
  latestTelemetry: NormalizedTelemetry | null,
  wifiConnected?: boolean
): LiveConnectionState {
  // WiFi path: if device is connected via WiFi and has recent telemetry
  if (wifiConnected && latestTelemetry) {
    const lastReceivedAt = latestTelemetry.receivedAt;
    if (lastReceivedAt) {
      const ageMs = Date.now() - new Date(lastReceivedAt).getTime();
      return ageMs <= 15_000 ? "connected_active" : "connected_idle";
    }
    return "connected_active";
  }

  // Serial path
  if (!env.SERIAL_ENABLED) return "serial_disabled";
  if (!snapshot.connected) {
    return latestTelemetry ? "disconnected" : "no_data";
  }

  const lastReceivedAt = latestTelemetry?.receivedAt ?? snapshot.lastReceivedAt;
  if (!lastReceivedAt) {
    return "connected_idle";
  }

  const ageMs = Date.now() - new Date(lastReceivedAt).getTime();
  return ageMs <= 15_000 ? "connected_active" : "connected_idle";
}

export async function getPatientLiveDeviceSnapshot(
  patientId: string
): Promise<PatientLiveDeviceSnapshot> {
  const [device, snapshot] = await Promise.all([
    Device.findOne({ patientId })
      .select("deviceId label pairingStatus status transportType batteryLevel lastSyncAt firmwareVersion wifiConnected wifiLastConnectedAt wifiIpAddress")
      .lean(),
    Promise.resolve(serialDebugStore.getSnapshot()),
  ]);

  const deviceId = device?.deviceId ?? null;
  const isWifiActive = device?.wifiConnected === true && device?.transportType === "wifi";
  const latestTelemetry = telemetryMatchesDevice(snapshot.lastNormalized, deviceId)
    ? snapshot.lastNormalized
    : null;

  const recentEvents = snapshot.recentEvents.filter((event) => eventMatchesDevice(event, deviceId));
  const connectionState = deriveConnectionState(snapshot, latestTelemetry, isWifiActive ? true : undefined);

  return {
    device: {
      deviceId,
      label: device?.label ?? null,
      pairingStatus: device?.pairingStatus ?? null,
      status: device?.status ?? null,
      transportType: device?.transportType ?? null,
      batteryLevel: device?.batteryLevel,
      lastSyncAt: device?.lastSyncAt ?? null,
      firmwareVersion: device?.firmwareVersion ?? null,
    },
    connection: {
      serialEnabled: env.SERIAL_ENABLED,
      connected: isWifiActive ? true : snapshot.connected,
      state: connectionState,
      portPath: snapshot.portPath,
      baudRate: snapshot.baudRate,
      lastConnectedAt: snapshot.lastConnectedAt,
      lastDisconnectedAt: snapshot.lastDisconnectedAt,
      lastReceivedAt: isWifiActive ? (latestTelemetry?.receivedAt ?? snapshot.lastReceivedAt) : snapshot.lastReceivedAt,
      wifiConnected: device?.wifiConnected,
      wifiLastConnectedAt: device?.wifiLastConnectedAt,
      wifiIpAddress: device?.wifiIpAddress,
    },
    latestTelemetry,
    recentEvents,
    waveform: snapshot.waveform,
  };
}
