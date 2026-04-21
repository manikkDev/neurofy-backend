import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPatientProfile extends Document {
  userId: Types.ObjectId;
  assignedDoctorId?: Types.ObjectId;
  assignedAt?: Date;
  dateOfBirth?: Date;
  phone?: string;
  address?: string;
  medicalHistory?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const patientProfileSchema = new Schema<IPatientProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    assignedDoctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    dateOfBirth: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    medicalHistory: {
      type: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  {
    timestamps: true,
  }
);

export const PatientProfile = mongoose.model<IPatientProfile>(
  "PatientProfile",
  patientProfileSchema
);
