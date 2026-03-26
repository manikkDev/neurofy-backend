import mongoose, { Schema, Document, Types } from "mongoose";
import { Severity } from "./Telemetry";

export interface ITremorEpisode extends Document {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  durationSec?: number;
  maxSeverity: Severity;
  episodeCount: number;
  avgFrequencyHz?: number;
  maxAmplitude?: number;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tremorEpisodeSchema = new Schema<ITremorEpisode>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: [true, "Device reference is required"],
      index: true,
    },
    startedAt: {
      type: Date,
      required: [true, "Start time is required"],
      index: true,
    },
    endedAt: {
      type: Date,
    },
    durationSec: {
      type: Number,
      min: 0,
    },
    maxSeverity: {
      type: String,
      enum: ["MILD", "MODERATE", "SEVERE"],
      required: [true, "Maximum severity is required"],
      index: true,
    },
    episodeCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    avgFrequencyHz: {
      type: Number,
      min: 0,
    },
    maxAmplitude: {
      type: Number,
      min: 0,
    },
    summary: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

tremorEpisodeSchema.index({ patientId: 1, startedAt: -1 });
tremorEpisodeSchema.index({ maxSeverity: 1, startedAt: -1 });

export const TremorEpisode = mongoose.model<ITremorEpisode>(
  "TremorEpisode",
  tremorEpisodeSchema
);
