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
  latestTelemetry: NormalizedTelemetry | null
): LiveConnectionState {
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
      .select("deviceId label pairingStatus status batteryLevel lastSyncAt firmwareVersion")
      .lean(),
    Promise.resolve(serialDebugStore.getSnapshot()),
  ]);

  const deviceId = device?.deviceId ?? null;
  const latestTelemetry = telemetryMatchesDevice(snapshot.lastNormalized, deviceId)
    ? snapshot.lastNormalized
    : null;

  const recentEvents = snapshot.recentEvents.filter((event) => eventMatchesDevice(event, deviceId));

  return {
    device: {
      deviceId,
      label: device?.label ?? null,
      pairingStatus: device?.pairingStatus ?? null,
      status: device?.status ?? null,
      batteryLevel: device?.batteryLevel,
      lastSyncAt: device?.lastSyncAt ?? null,
      firmwareVersion: device?.firmwareVersion ?? null,
    },
    connection: {
      serialEnabled: env.SERIAL_ENABLED,
      connected: snapshot.connected,
      state: deriveConnectionState(snapshot, latestTelemetry),
      portPath: snapshot.portPath,
      baudRate: snapshot.baudRate,
      lastConnectedAt: snapshot.lastConnectedAt,
      lastDisconnectedAt: snapshot.lastDisconnectedAt,
      lastReceivedAt: snapshot.lastReceivedAt,
    },
    latestTelemetry,
    recentEvents,
    waveform: snapshot.waveform,
  };
}
