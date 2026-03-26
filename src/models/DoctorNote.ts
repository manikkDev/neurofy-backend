import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDoctorNote extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  content: string;
  diagnosis?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const doctorNoteSchema = new Schema<IDoctorNote>(
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
    content: {
      type: String,
      required: [true, "Note content is required"],
    },
    diagnosis: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

doctorNoteSchema.index({ patientId: 1, createdAt: -1 });
doctorNoteSchema.index({ doctorId: 1, createdAt: -1 });

export const DoctorNote = mongoose.model<IDoctorNote>("DoctorNote", doctorNoteSchema);
