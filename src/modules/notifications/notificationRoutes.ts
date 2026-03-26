/**
 * Phase 6 – Notification routes (fixed: PUT→PATCH, added DELETE)
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middlewares/auth";
import { NotificationService } from "./notificationService";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifs = await NotificationService.getNotificationsByUser(req.user!.userId);
    res.json({ success: true, data: notifs });
  } catch (err) { next(err); }
});

router.get("/unread-count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

router.patch("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notif = await NotificationService.markAsRead(req.params.id);
    res.json({ success: true, data: notif });
  } catch (err) { next(err); }
});

router.patch("/mark-all-read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.deleteNotification(req.params.id);
    res.json({ success: true, data: { message: "Notification deleted" } });
  } catch (err) { next(err); }
});

export default router;
