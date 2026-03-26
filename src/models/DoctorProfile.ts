import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDoctorProfile extends Document {
  userId: Types.ObjectId;
  specialization?: string;
  licenseNumber?: string;
  phone?: string;
  hospital?: string;
  yearsOfExperience?: number;
  createdAt: Date;
  updatedAt: Date;
}

const doctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    hospital: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorProfile = mongoose.model<IDoctorProfile>(
  "DoctorProfile",
  doctorProfileSchema
);
