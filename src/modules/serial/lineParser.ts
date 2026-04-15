/**
 * Phase 4.1 – Dual-path line parser (updated)
 *
 * Key changes from Phase 3:
 * - Status is now inferred from statusText, not just from severity
 * - "Checking..." in statusText → CHECKING (not DETECTED)
 * - confirmCount replaces episodeCount
 * - source: "SERIAL" added to all NormalizedTelemetry output
 * - Banner/header/separator lines explicitly swallowed as raw
 *
 * Path 1: Pipe-delimited data rows (current human-readable firmware)
 *   00:01:10|5.27|4.2|0.077|Y Y N Y N N Y Y Y Y Y Y|9|0|MODERATE|Checking... (9/12)
 *   fields:  time | Hz | SNR | Amp | rules | score | confirmCount | severity | statusText
 *
 * Path 2: Keyword/detection lines
 *   [DETECT] Potential tremor at 5.47 Hz — confirming...
 *   TREMOR DETECTED
 *   [SKIP] Score insufficient — not confirmed
 *   MONITORING STARTED, [CAL], [WiFi], [SCORE], [END]
 *
 * Path 3: Raw fallback — anything else, never throws.
 *
 * Path 4 (stub): JSON firmware — if line starts with '{', try JSON.parse.
 */

import type {
  ParsedLine,
  NormalizedTelemetry,
  DetectionEvent,
  RawSerialLine,
  Severity,
  TremorStatus,
} from "./types";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const PIPE_ROW_REGEX =
  /^(\d{2}:\d{2}:\d{2})\|([0-9.]+)\|([0-9.]+)\|([0-9.]+)\|([\sYN]+)\|(\d+)\|(\d+)\|([A-Z]+)\|(.*)$/;

function normalizeSeverity(raw: string): Severity | undefined {
  const u = raw.toUpperCase();
  if (u === "MILD") return "MILD";
  if (u === "MODERATE") return "MODERATE";
  if (u === "SEVERE") return "SEVERE";
  if (u === "NONE") return "NONE";
  return undefined;
}

/**
 * Infer TremorStatus from the statusText field.
 *
 * Current firmware statusText values observed:
 *   "Checking... (9/12)"  → CHECKING (score accumulating, not yet confirmed)
 *   "TREMOR CONFIRMED"    → DETECTED (hypothetical confirmed state)
 *   anything else         → UNKNOWN
 *
 * severity is used as a fallback cue only.
 */
function inferStatus(statusText: string, severity?: Severity): TremorStatus {
  const t = statusText.toLowerCase();
  if (t.includes("checking")) return "CHECKING";
  if (t.includes("confirmed") || t.includes("detected")) return "DETECTED";
  if (t.includes("skip") || t.includes("no tremor") || t.includes("none")) return "NOT_DETECTED";
  // If we have a severity that isn't NONE, assume at minimum something is happening
  if (severity && severity !== "NONE") return "CHECKING";
  return "UNKNOWN";
}

// Lines we want to swallow silently (banners, table headers, separators)
const NOISE_PATTERNS = [
  /^[╔╗╚╝║═\s]+$/, // box-drawing characters
  /^[-+\s]+$/, // separator lines
  /^Time\s*\|Hz/, // table header
  /^------/, // dashes
  /^\s*$/, // blank
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line));
}

// ------------------------------------------------------------------
// Path 1: Pipe-delimited data row
// ------------------------------------------------------------------

function parsePipeRow(
  line: string,
  deviceId: string,
  ts: Date
): NormalizedTelemetry | null {
  const m = line.match(PIPE_ROW_REGEX);
  if (!m) return null;

  const [, elapsed, freq, snr, amp, , score, confirmCount, severityRaw, statusText] = m;

  const severity = normalizeSeverity(severityRaw);
  const stText = statusText.trim();
  const status = inferStatus(stText, severity);

  return {
    deviceId,
    source: "SERIAL",
    detectedAt: ts,
    receivedAt: ts,
    status,
    frequencyHz: parseFloat(freq),
    snr: parseFloat(snr),
    amplitude: parseFloat(amp),
    severity,
    deviceElapsedTime: elapsed,
    score: parseInt(score, 10),
    confirmCount: parseInt(confirmCount, 10),
    statusText: stText,
    rawLine: line,
  };
}

// ------------------------------------------------------------------
// Path 2: Keyword / detection lines
// ------------------------------------------------------------------

 function parseKeywordLine(line: string, deviceId: string, ts: Date): DetectionEvent | null {
  const trimmed = line.trim();

  if (/^MONITORING STARTED/i.test(trimmed)) {
    return { type: "MONITORING_STARTED", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^TREMOR DETECTED/i.test(trimmed)) {
    return { type: "TREMOR_DETECTED", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[CAL\]/i.test(trimmed)) {
    return { type: "CALIBRATION", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[WiFi\]/i.test(trimmed)) {
    return { type: "WIFI_STATUS", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[DETECT\].*Potential tremor/i.test(trimmed)) {
    return { type: "POTENTIAL_TREMOR", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[SKIP\]/i.test(trimmed)) {
    return { type: "SKIP", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[END\]/i.test(trimmed) || /^END\s/i.test(trimmed)) {
    return { type: "END", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }
  if (/^\[SCORE\]/i.test(trimmed)) {
    return { type: "SCORE_UPDATE", deviceId, source: "SERIAL", message: trimmed, rawLine: line, ts };
  }

  return null;
}

// ------------------------------------------------------------------
// Path 3 (stub): JSON firmware line
// ------------------------------------------------------------------

function tryParseJsonLine(
  line: string,
  deviceId: string,
  ts: Date
): NormalizedTelemetry | null {
  if (!line.trimStart().startsWith("{")) return null;
  try {
    const obj = JSON.parse(line) as Record<string, unknown>;
    const severity = normalizeSeverity(String(obj.severity ?? ""));
    const statusText = typeof obj.statusText === "string" ? obj.statusText : "";
    return {
      deviceId: String(obj.deviceId ?? deviceId),
      source: "SERIAL",
      detectedAt: obj.detectedAt ? new Date(String(obj.detectedAt)) : ts,
      receivedAt: ts,
      status: (obj.status as TremorStatus) ?? inferStatus(statusText, severity),
      frequencyHz: typeof obj.frequencyHz === "number" ? obj.frequencyHz : undefined,
      snr: typeof obj.snr === "number" ? obj.snr : undefined,
      amplitude: typeof obj.amplitude === "number" ? obj.amplitude : undefined,
      severity,
      confirmCount: typeof obj.confirmCount === "number" ? obj.confirmCount : undefined,
      statusText,
      rawLine: line,
    };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Main export
// ------------------------------------------------------------------

/**
 * Parse a single serial line into a typed `ParsedLine`.
 * Never throws — worst case returns `{ kind: 'raw' }`.
 */
export function parseLine(line: string, deviceId: string): ParsedLine {
  const ts = new Date();

  // Swallow noise silently
  if (isNoiseLine(line)) {
    return { kind: "raw", data: { rawLine: line, ts } };
  }

  const trimmed = line.trim();

  // JSON path (future firmware)
  const jsonResult = tryParseJsonLine(trimmed, deviceId, ts);
  if (jsonResult) return { kind: "telemetry", data: jsonResult };

  // Pipe-delimited data row (current firmware)
  const pipeResult = parsePipeRow(trimmed, deviceId, ts);
  if (pipeResult) return { kind: "telemetry", data: pipeResult };

  // Keyword / detection line
  const keywordResult = parseKeywordLine(trimmed, deviceId, ts);
  if (keywordResult) return { kind: "event", data: keywordResult };

  // Raw fallback
  const raw: RawSerialLine = { rawLine: line, ts };
  return { kind: "raw", data: raw };
}
