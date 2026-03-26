import { Notification } from "../../models";

export class NotificationService {
  static async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
  }) {
    return Notification.create(data);
  }

  static async getNotificationsByUser(userId: string, limit: number = 20) {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async getUnreadCount(userId: string) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  static async markAsRead(id: string) {
    return Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string) {
    return Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  static async deleteNotification(id: string) {
    return Notification.findByIdAndDelete(id);
  }
}
