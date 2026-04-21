/**
 * Phase 5 – Doctor routes
 *
 * All routes require authentication + doctor role.
 * Mounted at /api/doctors
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { requirePatientAccess } from "../../middlewares/access";
import { validateObjectId, validatePagination, validateDateRange, strictLimiter } from "../../middlewares/security";
import * as DoctorService from "./doctorService";
import { getPatientLiveDeviceSnapshot } from "../serial/serialLiveState";

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
    console.log("[Route /patients GET] Doctor ID from token:", req.user!.userId);
    const patients = await DoctorService.getDoctorPatientList(req.user!.userId, q);
    res.json({ success: true, data: patients });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors/patients/search-by-email
router.post("/patients/search-by-email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, error: { message: "Email is required" } });
    }
    
    const patient = await DoctorService.searchPatientByEmail(email.trim(), req.user!.userId);
    if (!patient) {
      return res.status(404).json({ success: false, error: { message: "Patient not found" } });
    }
    
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

// POST /api/doctors/patients/add
router.post("/patients/add", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.body;
    console.log("[Route /patients/add] User:", req.user);
    console.log("[Route /patients/add] Doctor ID from token:", req.user!.userId);
    
    if (!patientId) {
      return res.status(400).json({ success: false, error: { message: "Patient ID is required" } });
    }
    
    const result = await DoctorService.addPatientToDoctor(req.user!.userId, patientId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === "Patient not found") {
      return res.status(404).json({ success: false, error: { message: err.message } });
    }
    if (err.message === "Patient already assigned") {
      return res.status(409).json({ success: false, error: { message: err.message } });
    }
    next(err);
  }
});

// ── Patient live telemetry snapshot ─────────────────────────────────
// GET /api/doctors/patients/:patientId/live
router.get(
  "/patients/:patientId/live",
  validateObjectId("patientId"),
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const live = await getPatientLiveDeviceSnapshot(req.params.patientId);
      res.json({ success: true, data: live });
    } catch (err) {
      next(err);
    }
  }
);

// ── Patient clinical detail ─────────────────────────────────────────
// GET /api/doctors/patients/:patientId/detail
router.get(
  "/patients/:patientId/detail",
  validateObjectId("patientId"),
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await DoctorService.getDoctorPatientDetail(req.params.patientId);
      res.json({ success: true, data: detail });
    } catch (err: any) {
      if (err.message === "Patient not found") {
        return res.status(404).json({ success: false, error: { message: err.message } });
      }
      next(err);
    }
  }
);

// ── Notes ────────────────────────────────────────────────────────────
// POST /api/doctors/patients/:patientId/notes
router.post(
  "/patients/:patientId/notes",
  validateObjectId("patientId"),
  strictLimiter,
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content, diagnosis, isPrivate } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ success: false, error: { message: "Note content is required" } });
      }
      if (content.length > 5000) {
        return res.status(400).json({ success: false, error: { message: "Note content too long (max 5000 chars)" } });
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
  }
);

// GET /api/doctors/patients/:patientId/notes
router.get(
  "/patients/:patientId/notes",
  validateObjectId("patientId"),
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notes = await DoctorService.getPatientNotes(req.params.patientId);
      res.json({ success: true, data: notes });
    } catch (err) {
      next(err);
    }
  }
);

// ── Reports ──────────────────────────────────────────────────────────
// GET /api/doctors/patients/:patientId/report-summary?period=daily|weekly
router.get(
  "/patients/:patientId/report-summary",
  validateObjectId("patientId"),
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = (req.query.period as "daily" | "weekly") || "weekly";
      if (!["daily", "weekly"].includes(period)) {
        return res.status(400).json({ success: false, error: { message: "Invalid period" } });
      }
      const summary = await DoctorService.computeReportPeriodSummary(
        req.params.patientId,
        period
      );
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/doctors/patients/:patientId/reports
router.post(
  "/patients/:patientId/reports",
  validateObjectId("patientId"),
  strictLimiter,
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, summary, status, period } = req.body;
      if (!title?.trim() || !summary?.trim()) {
        return res.status(400).json({ success: false, error: { message: "Title and summary are required" } });
      }
      if (title.length > 200) {
        return res.status(400).json({ success: false, error: { message: "Title too long (max 200 chars)" } });
      }
      if (summary.length > 10000) {
        return res.status(400).json({ success: false, error: { message: "Summary too long (max 10000 chars)" } });
      }

      // If period provided, compute stats and attach
      let stats: any;
      let reportPeriod: any;

      if (period === "daily" || period === "weekly") {
        const periodSummary = await DoctorService.computeReportPeriodSummary(
          req.params.patientId,
          period
        );
        stats = {
          totalEpisodes: periodSummary.totalEpisodes,
          severityBreakdown: periodSummary.severityBreakdown,
          totalDurationSeconds: periodSummary.totalDurationSeconds,
          averageFrequency: periodSummary.averageFrequency,
          dominantSeverity: periodSummary.dominantSeverity,
        };
        reportPeriod = {
          start: periodSummary.startDate,
          end: periodSummary.endDate,
          label: period === "daily" ? "Today" : "Past 7 Days",
        };
      }

      const report = await DoctorService.createReport({
        patientId: req.params.patientId,
        doctorId: req.user!.userId,
        title: title.trim(),
        summary: summary.trim(),
        status: status ?? "completed",
        stats,
        reportPeriod,
      });
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/doctors/patients/:patientId/reports
router.get(
  "/patients/:patientId/reports",
  validateObjectId("patientId"),
  requirePatientAccess("patientId"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reports = await DoctorService.getPatientReports(req.params.patientId);
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }
);

// ── Alerts ───────────────────────────────────────────────────────────
// GET /api/doctors/alerts/severe
router.get("/alerts/severe", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await DoctorService.getSevereAlerts(req.user!.userId);
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
