import mongoose, { Schema, Document, Types } from "mongoose";

export type ReportStatus = "draft" | "completed" | "archived";

export interface IReport extends Document {
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  title: string;
  summary: string;
  status: ReportStatus;
  fileUrl?: string;
  fileMetadata?: {
    filename: string;
    size: number;
    mimeType: string;
  };
  reportPeriod?: {
    start: Date;
    end: Date;
    label: string;
  };
  stats?: {
    totalEpisodes: number;
    severityBreakdown: { severe: number; moderate: number; mild: number };
    totalDurationSeconds: number;
    averageFrequency: number;
    dominantSeverity: string;
  };
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
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
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
    },
    summary: {
      type: String,
      required: [true, "Report summary is required"],
    },
    status: {
      type: String,
      enum: ["draft", "completed", "archived"],
      default: "draft",
    },
    fileUrl: {
      type: String,
    },
    fileMetadata: {
      filename: String,
      size: Number,
      mimeType: String,
    },
    reportPeriod: {
      start: Date,
      end: Date,
      label: String,
    },
    stats: {
      totalEpisodes: Number,
      severityBreakdown: {
        severe: Number,
        moderate: Number,
        mild: Number,
      },
      totalDurationSeconds: Number,
      averageFrequency: Number,
      dominantSeverity: String,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.index({ patientId: 1, generatedAt: -1 });
reportSchema.index({ doctorId: 1, generatedAt: -1 });
reportSchema.index({ status: 1 });

export const Report = mongoose.model<IReport>("Report", reportSchema);
