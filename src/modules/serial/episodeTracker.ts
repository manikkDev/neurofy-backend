/**
 * Phase 3 – Episode tracker
 *
 * Lightweight state machine that tracks the lifecycle of a tremor episode
 * from serial events. Persists TremorEpisode documents to MongoDB when
 * an episode concludes.
 *
 * State transitions:
 *   idle  →  active  (on TREMOR_DETECTED or high-severity telemetry)
 *   active → idle    (on END / SKIP / gap timeout)
 *
 * This module is stateful because the firmware does not always emit a
 * clean START/END pair — we handle gaps gracefully.
 */

import { Types } from "mongoose";
import { TremorEpisode } from "../../models/TremorEpisode";
import type { NormalizedTelemetry, Severity } from "./types";

const EPISODE_GAP_MS = 30_000; // 30 s of silence closes the episode

interface ActiveEpisode {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  startedAt: Date;
  maxSeverity: Severity;
  samples: NormalizedTelemetry[];
  lastActivityAt: Date;
  gapTimer: ReturnType<typeof setTimeout> | null;
}

class EpisodeTracker {
  private active: ActiveEpisode | null = null;

  /**
   * Feed a normalised telemetry sample into the tracker.
   * Call this every time a pipe-row is parsed with status DETECTED.
   */
  async onTelemetry(
    telemetry: NormalizedTelemetry,
    patientId: Types.ObjectId,
    deviceId: Types.ObjectId
  ): Promise<void> {
    // Open/update episode on DETECTED or CHECKING (score accumulating)
    if (telemetry.status !== "DETECTED" && telemetry.status !== "CHECKING") {
      return;
    }

    this.resetGapTimer();

    if (!this.active) {
      // Open new episode
      this.active = {
        patientId,
        deviceId,
        startedAt: telemetry.detectedAt,
        maxSeverity: telemetry.severity ?? "MILD",
        samples: [telemetry],
        lastActivityAt: telemetry.detectedAt,
        gapTimer: null,
      };
      console.log("[EpisodeTracker] Episode opened");
    } else {
      // Update running episode
      this.active.samples.push(telemetry);
      this.active.lastActivityAt = telemetry.detectedAt;
      this.active.maxSeverity = this.maxOf(
        this.active.maxSeverity,
        telemetry.severity ?? "MILD"
      );
    }

    // Schedule gap close
    this.active.gapTimer = setTimeout(() => {
      console.log("[EpisodeTracker] Gap timeout — closing episode");
      this.closeEpisode().catch(console.error);
    }, EPISODE_GAP_MS);
  }

  /**
   * Explicitly close the episode (e.g. on END or SKIP events).
   */
  async onEpisodeEnd(): Promise<void> {
    if (!this.active) return;
    await this.closeEpisode();
  }

  // ------------------------------------------------------------------
  // Private
  // ------------------------------------------------------------------

  private resetGapTimer(): void {
    if (this.active?.gapTimer) {
      clearTimeout(this.active.gapTimer);
      this.active.gapTimer = null;
    }
  }

  private maxOf(a: Severity, b: Severity): Severity {
    const rank: Record<Severity, number> = { NONE: -1, MILD: 0, MODERATE: 1, SEVERE: 2 };
    return rank[a] >= rank[b] ? a : b;
  }

  private async closeEpisode(): Promise<void> {
    const ep = this.active;
    this.active = null;

    if (!ep) return;
    this.resetGapTimer();

    const endedAt = ep.lastActivityAt;
    const durationSec = (endedAt.getTime() - ep.startedAt.getTime()) / 1000;

    const freqSamples = ep.samples
      .map((s) => s.frequencyHz)
      .filter((f): f is number => f !== undefined);
    const avgFreq =
      freqSamples.length > 0
        ? freqSamples.reduce((a, b) => a + b, 0) / freqSamples.length
        : undefined;

    const ampSamples = ep.samples
      .map((s) => s.amplitude)
      .filter((a): a is number => a !== undefined);
    const maxAmp =
      ampSamples.length > 0 ? Math.max(...ampSamples) : undefined;

    try {
      await TremorEpisode.create({
        patientId: ep.patientId,
        deviceId: ep.deviceId,
        startedAt: ep.startedAt,
        endedAt,
        durationSec,
        maxSeverity: ep.maxSeverity,
        episodeCount: 1,
        avgFrequencyHz: avgFreq,
        maxAmplitude: maxAmp,
        summary: `Serial episode — ${ep.samples.length} samples — max ${ep.maxSeverity}`,
      });
      console.log(
        `[EpisodeTracker] Episode persisted (${durationSec.toFixed(1)}s, ${ep.maxSeverity})`
      );
    } catch (err) {
      console.error("[EpisodeTracker] Failed to persist episode:", err);
    }
  }
}

// Singleton — one tracker per process
export const episodeTracker = new EpisodeTracker();
