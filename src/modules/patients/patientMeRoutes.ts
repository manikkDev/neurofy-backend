/**
 * Phase 4 – Patient self-service routes (/api/patients/me/*)
 *
 * These routes let the patient access their own data using their JWT identity.
 * No patient ID in the URL — always uses req.user.userId.
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { PatientService } from "./patientService";
import { NoteService } from "../notes/noteService";
import { Alert } from "../../models/Alert";
import { User } from "../../models/User";
import { getPatientLiveDeviceSnapshot } from "../serial/serialLiveState";

const router = Router();

router.use(authenticate);
router.use(requireRole("patient"));

// GET /api/patients/me/dashboard — aggregated dashboard summary
router.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [stats, history] = await Promise.all([
      PatientService.getPatientStats(userId),
      PatientService.getPatientHistory(userId, 5),
    ]);

    const activeAlerts = await Alert.countDocuments({
      patientId: userId,
      status: "active",
    });

    const lastEpisode = history.length > 0 ? history[0] : null;

    res.json({
      success: true,
      data: {
        ...stats,
        activeAlerts,
        lastEpisode,
        lastDetectedAt: lastEpisode?.startedAt ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/history — paginated episode history
router.get("/history", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const history = await PatientService.getPatientHistory(userId, limit);

    res.json({
      success: true,
      data: history,
      pagination: { page, limit, total: history.length },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/stats
router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await PatientService.getPatientStats(req.user!.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/live — current device connectivity + latest telemetry
router.get("/live", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const live = await getPatientLiveDeviceSnapshot(req.user!.userId);
    res.json({ success: true, data: live });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/notes — patient-visible notes only (isPrivate: false)
router.get("/notes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = await NoteService.getPatientVisibleNotes(req.user!.userId);
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/alerts — alert feed
router.get("/alerts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await Alert.find({ patientId: req.user!.userId })
      .sort({ triggeredAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/patients/me/alerts/:id/acknowledge
router.patch("/alerts/:id/acknowledge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, patientId: req.user!.userId, status: "active" },
      { status: "acknowledged", acknowledgedAt: new Date(), acknowledgedBy: req.user!.userId },
      { new: true }
    );
    if (!alert) {
      return res.status(404).json({ success: false, error: { message: "Alert not found" } });
    }
    res.json({ success: true, data: alert });
  } catch (error) {
    next(error);
  }
});

// GET /api/patients/me/doctors — list doctors for appointment booking
router.get("/doctors", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await User.find({ role: "doctor", isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
});

export default router;
