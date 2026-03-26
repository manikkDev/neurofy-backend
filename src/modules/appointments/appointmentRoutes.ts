/**
 * Phase 6 – Appointment routes (completed)
 *
 * Patient: POST /, GET /, PATCH /:id/cancel
 * Doctor:  GET /doctor, PATCH /:id/accept, PATCH /:id/reject, PATCH /:id/reschedule
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import * as AppointmentService from "./appointmentService";

const router = Router();
router.use(authenticate);

// ── Patient: create ───────────────────────────────────────────────

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { doctorId, scheduledAt, reason } = req.body;
    if (!doctorId || !scheduledAt) {
      return res.status(400).json({ success: false, error: { message: "doctorId and scheduledAt are required" } });
    }
    const appt = await AppointmentService.createAppointment({
      patientId: req.user!.userId,
      doctorId,
      scheduledAt,
      reason,
    });
    res.status(201).json({ success: true, data: appt });
  } catch (err) { next(err); }
});

// ── Any role: list own appointments ──────────────────────────────

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const appts =
      role === "patient"
        ? await AppointmentService.getAppointmentsByPatient(userId)
        : await AppointmentService.getAppointmentsByDoctor(userId);
    res.json({ success: true, data: appts });
  } catch (err) { next(err); }
});

// ── Doctor: pending requests ─────────────────────────────────────

router.get(
  "/doctor/pending",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appts = await AppointmentService.getPendingAppointmentsByDoctor(req.user!.userId);
      res.json({ success: true, data: appts });
    } catch (err) { next(err); }
  }
);

// ── Get by ID ────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const appt = await AppointmentService.getAppointmentById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, error: { message: "Not found" } });
    res.json({ success: true, data: appt });
  } catch (err) { next(err); }
});

// ── Patient: cancel ───────────────────────────────────────────────

router.patch(
  "/:id/cancel",
  requireRole("patient"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await AppointmentService.cancelAppointment(req.params.id, req.user!.userId);
      if (!appt) return res.status(404).json({ success: false, error: { message: "Not found or not authorized" } });
      res.json({ success: true, data: appt });
    } catch (err) { next(err); }
  }
);

// ── Doctor: accept ────────────────────────────────────────────────

router.patch(
  "/:id/accept",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await AppointmentService.acceptAppointment(
        req.params.id,
        req.user!.userId,
        req.body.responseNote
      );
      if (!appt) return res.status(404).json({ success: false, error: { message: "Not found or not authorized" } });
      res.json({ success: true, data: appt });
    } catch (err) { next(err); }
  }
);

// ── Doctor: reject ────────────────────────────────────────────────

router.patch(
  "/:id/reject",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appt = await AppointmentService.rejectAppointment(
        req.params.id,
        req.user!.userId,
        req.body.responseNote
      );
      if (!appt) return res.status(404).json({ success: false, error: { message: "Not found or not authorized" } });
      res.json({ success: true, data: appt });
    } catch (err) { next(err); }
  }
);

// ── Doctor: reschedule ────────────────────────────────────────────

router.patch(
  "/:id/reschedule",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newDate, responseNote } = req.body;
      if (!newDate) return res.status(400).json({ success: false, error: { message: "newDate is required" } });
      const appt = await AppointmentService.rescheduleAppointment(
        req.params.id,
        req.user!.userId,
        newDate,
        responseNote
      );
      if (!appt) return res.status(404).json({ success: false, error: { message: "Not found or not authorized" } });
      res.json({ success: true, data: appt });
    } catch (err) { next(err); }
  }
);

export default router;
