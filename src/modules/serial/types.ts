/**
 * Phase 4.1 – Serial module type definitions (updated)
 *
 * Key changes from Phase 3:
 * - TremorStatus now includes CHECKING and UNKNOWN for the "confirming" state
 * - NormalizedTelemetry adds confirmCount (was misnamed episodeCount)
 * - source field added for future wireless extensibility
 */

export type TremorStatus = "DETECTED" | "NOT_DETECTED" | "CHECKING" | "UNKNOWN";
export type Severity = "MILD" | "MODERATE" | "SEVERE" | "NONE";

// ------------------------------------------------------------------
// Parsed output types from lineParser
// ------------------------------------------------------------------

/** A fully normalised telemetry record ready for persistence and broadcast */
export interface NormalizedTelemetry {
  /** Source device identifier (from env or parsed from line) */
  deviceId: string;

  /** Transport source — always SERIAL for this phase, WIRELESS later */
  source: "SERIAL" | "WIRELESS";

  /** UTC timestamp of the reading */
  detectedAt: Date;

  /** Backend receive time for the serial line */
  receivedAt: Date;

  /** Tremor detection state */
  status: TremorStatus;

  /** Dominant frequency in Hz */
  frequencyHz?: number;

  /** Signal-to-noise ratio */
  snr?: number;

  /** Tremor amplitude (g units) */
  amplitude?: number;

  /** Severity classification (undefined if not yet confirmed) */
  severity?: Severity;

  /** Device-side elapsed time string, e.g. "00:01:10" */
  deviceElapsedTime?: string;

  /** Validation score (how many of 12 rules passed) */
  score?: number;

  /**
   * Confirm count from device — the number of consecutive confirmations.
   * Field 7 in the pipe-delimited row (was misnamed episodeCount in Phase 3).
   */
  confirmCount?: number;

  /** Free-form status text from the device, e.g. "Checking... (9/12)" */
  statusText?: string;

  /** Original raw line for debugging */
  rawLine: string;
}

/** A detection-keyword line (e.g. [DETECT], TREMOR DETECTED) */
export interface DetectionEvent {
  type:
    | "POTENTIAL_TREMOR"
    | "TREMOR_DETECTED"
    | "SKIP"
    | "END"
    | "MONITORING_STARTED"
    | "CALIBRATION"
    | "WIFI_STATUS"
    | "SCORE_UPDATE";
  deviceId: string;
  source: "SERIAL" | "WIRELESS";
  message: string;
  rawLine: string;
  ts: Date;
}

/** Any line that could not be normalised */
export interface RawSerialLine {
  rawLine: string;
  ts: Date;
}

/** Union of all parsed line kinds */
export type ParsedLine =
  | { kind: "telemetry"; data: NormalizedTelemetry }
  | { kind: "event"; data: DetectionEvent }
  | { kind: "raw"; data: RawSerialLine };

// ------------------------------------------------------------------
// Debug snapshot (served via GET /api/debug/serial)
// ------------------------------------------------------------------

export interface ParserError {
  rawLine: string;
  error: string;
  ts: Date;
}

export interface WaveformAvailability {
  available: boolean;
  reason: string;
  source: "SERIAL" | "WIRELESS" | "NONE";
}

export interface SerialDebugSnapshot {
  connected: boolean;
  portPath: string;
  baudRate: number;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  lastReceivedAt?: Date;
  recentRawLines: RawSerialLine[];
  recentEvents: DetectionEvent[];
  lastNormalized?: NormalizedTelemetry;
  recentErrors: ParserError[];
  waveform: WaveformAvailability;
}
