import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationType = 
  | "appointment" 
  | "alert" 
  | "report" 
  | "note" 
  | "system";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["appointment", "alert", "report", "note", "system"],
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
