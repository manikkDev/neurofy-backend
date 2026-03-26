/**
 * Phase 5 – Doctor routes
 *
 * All routes require authentication + doctor role.
 * Mounted at /api/doctors
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import * as DoctorService from "./doctorService";

const router = Router();

router.use(authenticate);
router.use(requireRole("doctor"));

// ── Dashboard ────────────────────────────────────────────────────────
// GET /api/doctors/dashboard
router.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DoctorService.getDoctorDashboard(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── Patient list / search ────────────────────────────────────────────
// GET /api/doctors/patients?q=searchTerm
router.get("/patients", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const patients = await DoctorService.getDoctorPatientList(q);
    res.json({ success: true, data: patients });
  } catch (err) {
    next(err);
  }
});

// ── Patient clinical detail ─────────────────────────────────────────
// GET /api/doctors/patients/:patientId/detail
router.get("/patients/:patientId/detail", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await DoctorService.getDoctorPatientDetail(req.params.patientId);
    res.json({ success: true, data: detail });
  } catch (err: any) {
    if (err.message === "Patient not found") {
      return res.status(404).json({ success: false, error: { message: err.message } });
    }
    next(err);
  }
});

// ── Notes ────────────────────────────────────────────────────────────
// POST /api/doctors/patients/:patientId/notes
router.post("/patients/:patientId/notes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, diagnosis, isPrivate } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, error: { message: "Note content is required" } });
    }
    const note = await DoctorService.createNote({
      patientId: req.params.patientId,
      doctorId: req.user!.userId,
      content: content.trim(),
      diagnosis: diagnosis?.trim() || undefined,
      isPrivate: isPrivate ?? false,
    });
    res.status(201).json({ success: true, data: note });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/patients/:patientId/notes
router.get("/patients/:patientId/notes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = await DoctorService.getPatientNotes(req.params.patientId);
    res.json({ success: true, data: notes });
  } catch (err) {
    next(err);
  }
});

// ── Reports ──────────────────────────────────────────────────────────
// POST /api/doctors/patients/:patientId/reports
router.post("/patients/:patientId/reports", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, summary, status } = req.body;
    if (!title?.trim() || !summary?.trim()) {
      return res.status(400).json({ success: false, error: { message: "Title and summary are required" } });
    }
    const report = await DoctorService.createReport({
      patientId: req.params.patientId,
      doctorId: req.user!.userId,
      title: title.trim(),
      summary: summary.trim(),
      status: status ?? "completed",
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/doctors/patients/:patientId/reports
router.get("/patients/:patientId/reports", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await DoctorService.getPatientReports(req.params.patientId);
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// ── Alerts ───────────────────────────────────────────────────────────
// GET /api/doctors/alerts/severe
router.get("/alerts/severe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await DoctorService.getSevereAlerts();
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/doctors/alerts/:alertId/acknowledge
router.patch("/alerts/:alertId/acknowledge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await DoctorService.acknowledgeAlert(req.params.alertId, req.user!.userId);
    if (!alert) {
      return res.status(404).json({ success: false, error: { message: "Alert not found" } });
    }
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

export default router;
