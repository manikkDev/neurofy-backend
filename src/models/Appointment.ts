import mongoose, { Schema, Document, Types } from "mongoose";

export type AppointmentStatus =
  | "requested"
  | "scheduled"
  | "confirmed"
  | "rejected"
  | "rescheduled"
  | "completed"
  | "cancelled";

export interface IAppointment extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  scheduledAt: Date;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  responseNote?: string;
  rescheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
      index: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled time is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["requested", "scheduled", "confirmed", "rejected", "rescheduled", "completed", "cancelled"],
      default: "requested",
      index: true,
    },
    reason: { type: String, trim: true },
    notes: { type: String },
    responseNote: { type: String },
    rescheduledAt: { type: Date },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, scheduledAt: -1 });
appointmentSchema.index({ doctorId: 1, scheduledAt: -1 });
appointmentSchema.index({ status: 1, scheduledAt: 1 });

export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);
