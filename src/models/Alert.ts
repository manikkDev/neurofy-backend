import mongoose, { Schema, Document, Types } from "mongoose";
import { Severity } from "./Telemetry";

export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface IAlert extends Document {
  patientId: Types.ObjectId;
  deviceId: Types.ObjectId;
  severity: Severity;
  triggeredAt: Date;
  status: AlertStatus;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
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
    severity: {
      type: String,
      enum: ["MILD", "MODERATE", "SEVERE"],
      required: [true, "Severity is required"],
      index: true,
    },
    triggeredAt: {
      type: Date,
      required: [true, "Trigger time is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "acknowledged", "resolved"],
      default: "active",
      index: true,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ patientId: 1, triggeredAt: -1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ status: 1, triggeredAt: -1 });

export const Alert = mongoose.model<IAlert>("Alert", alertSchema);
