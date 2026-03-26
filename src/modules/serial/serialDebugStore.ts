/**
 * Phase 3 – In-memory serial debug store
 *
 * Holds the last N raw lines, parser errors, last normalized telemetry
 * event, and the current serial connection state.
 *
 * This store does NOT depend on MongoDB — it is intentionally in-memory
 * so it remains useful even when the database connection is unavailable.
 */

import type {
  RawSerialLine,
  NormalizedTelemetry,
  ParserError,
  SerialDebugSnapshot,
} from "./types";

const MAX_RAW_LINES = 50;
const MAX_ERRORS = 20;

class SerialDebugStore {
  private _connected = false;
  private _portPath = "";
  private _baudRate = 0;
  private _lastConnectedAt?: Date;
  private _lastDisconnectedAt?: Date;
  private _rawLines: RawSerialLine[] = [];
  private _errors: ParserError[] = [];
  private _lastNormalized?: NormalizedTelemetry;

  // ------------------------------------------------------------------
  // State setters (called by serialTransport)
  // ------------------------------------------------------------------

  markConnected(portPath: string, baudRate: number): void {
    this._connected = true;
    this._portPath = portPath;
    this._baudRate = baudRate;
    this._lastConnectedAt = new Date();
  }

  markDisconnected(): void {
    this._connected = false;
    this._lastDisconnectedAt = new Date();
  }

  pushRawLine(line: RawSerialLine): void {
    this._rawLines.push(line);
    if (this._rawLines.length > MAX_RAW_LINES) {
      this._rawLines.shift();
    }
  }

  pushError(rawLine: string, error: string): void {
    this._errors.push({ rawLine, error, ts: new Date() });
    if (this._errors.length > MAX_ERRORS) {
      this._errors.shift();
    }
  }

  setLastNormalized(telemetry: NormalizedTelemetry): void {
    this._lastNormalized = telemetry;
  }

  // ------------------------------------------------------------------
  // Snapshot (served by debug route)
  // ------------------------------------------------------------------

  getSnapshot(): SerialDebugSnapshot {
    return {
      connected: this._connected,
      portPath: this._portPath,
      baudRate: this._baudRate,
      lastConnectedAt: this._lastConnectedAt,
      lastDisconnectedAt: this._lastDisconnectedAt,
      recentRawLines: [...this._rawLines].reverse(), // newest first
      lastNormalized: this._lastNormalized,
      recentErrors: [...this._errors].reverse(),
    };
  }
}

// Singleton
export const serialDebugStore = new SerialDebugStore();
