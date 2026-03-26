import mongoose, { Schema, Document, Types } from "mongoose";

export type TremorStatus = "DETECTED" | "NOT_DETECTED";
export type Severity = "MILD" | "MODERATE" | "SEVERE";

export interface ITelemetry extends Document {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  status: TremorStatus;
  frequencyHz?: number;
  snr?: number;
  amplitude?: number;
  severity?: Severity;
  detectedAt: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  rawPayload?: any;
  createdAt: Date;
  updatedAt: Date;
}

const telemetrySchema = new Schema<ITelemetry>(
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
    status: {
      type: String,
      enum: ["DETECTED", "NOT_DETECTED"],
      required: [true, "Status is required"],
    },
    frequencyHz: {
      type: Number,
      min: 0,
    },
    snr: {
      type: Number,
    },
    amplitude: {
      type: Number,
      min: 0,
    },
    severity: {
      type: String,
      enum: ["MILD", "MODERATE", "SEVERE"],
    },
    detectedAt: {
      type: Date,
      required: [true, "Detection time is required"],
      index: true,
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    rawPayload: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

telemetrySchema.index({ patientId: 1, detectedAt: -1 });
telemetrySchema.index({ deviceId: 1, detectedAt: -1 });
telemetrySchema.index({ severity: 1, detectedAt: -1 });
telemetrySchema.index({ status: 1, detectedAt: -1 });

export const Telemetry = mongoose.model<ITelemetry>("Telemetry", telemetrySchema);
