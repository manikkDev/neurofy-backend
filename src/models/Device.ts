import mongoose, { Schema, Document, Types } from "mongoose";

export type DeviceStatus = "active" | "inactive" | "maintenance";
export type PairingStatus = "paired" | "unpaired" | "pending";

export interface IDevice extends Document {
  deviceId: string;
  patientId: Types.ObjectId;
  label: string;
  pairingStatus: PairingStatus;
  status: DeviceStatus;
  batteryLevel?: number;
  lastSyncAt?: Date;
  firmwareVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    deviceId: {
      type: String,
      required: [true, "Device ID is required"],
      unique: true,
      trim: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },
    label: {
      type: String,
      required: [true, "Device label is required"],
      trim: true,
      default: "My Tremor Monitor",
    },
    pairingStatus: {
      type: String,
      enum: ["paired", "unpaired", "pending"],
      default: "unpaired",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    lastSyncAt: {
      type: Date,
    },
    firmwareVersion: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for patient device queries
deviceSchema.index({ patientId: 1, status: 1 });
deviceSchema.index({ patientId: 1, lastSyncAt: -1 }); // Recent sync queries
// Note: deviceId already has unique index from schema definition

export const Device = mongoose.model<IDevice>("Device", deviceSchema);
