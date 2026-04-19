/**
 * Phase 6 – Report routes (completed)
 *
 * GET  /reports           → list by role (doctor or patient)
 * GET  /reports/:id       → single report
 * POST /reports           → doctor creates report (triggers patient notification)
 * GET  /reports/:id/download → stream report as JSON blob (PDF-ready structure)
 * PATCH /reports/:id/status  → update status (doctor only)
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { Report } from "../../models/Report";
import { NotificationService } from "../notifications/notificationService";
import { generateReportPdf, getReportEpisodes } from "./reportPdfGenerator";

const router = Router();
router.use(authenticate);

// List reports scoped to caller's role
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.user!;
    const filter = role === "patient" ? { patientId: userId } : { doctorId: userId };
    const reports = await Report.find(filter)
      .populate(role === "patient" ? "doctorId" : "patientId", "name email")
      .sort({ generatedAt: -1 });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

// Get report by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("patientId", "name email")
      .populate("doctorId", "name email");
    if (!report) return res.status(404).json({ success: false, error: { message: "Report not found" } });

    // Enforce access: patient sees their own, doctor sees theirs
    const { userId, role } = req.user!;
    const owns =
      role === "patient"
        ? report.patientId.toString() === userId
        : report.doctorId.toString() === userId;
    if (!owns) return res.status(403).json({ success: false, error: { message: "Access denied" } });

    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// Create report (doctor only) + notify patient
router.post(
  "/",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId, title, summary, status } = req.body;
      if (!patientId || !title || !summary) {
        return res.status(400).json({ success: false, error: { message: "patientId, title and summary are required" } });
      }
      const report = await Report.create({
        patientId,
        doctorId: req.user!.userId,
        title: title.trim(),
        summary: summary.trim(),
        status: status ?? "completed",
        generatedAt: new Date(),
      });
      await report.populate("doctorId", "name email");

      // Notify patient only if report is completed (visible to them)
      if (report.status === "completed") {
        await NotificationService.createNotification({
          userId: patientId,
          type: "report",
          title: "New Medical Report Available 📄",
          message: `Dr. ${(report.doctorId as any)?.name ?? "Your doctor"} has generated a new report: "${title}".`,
          relatedId: (report as any)._id.toString(),
        });
      }

      res.status(201).json({ success: true, data: report });
    } catch (err) { next(err); }
  }
);

// Download report as PDF
router.get("/:id/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("patientId", "name email")
      .populate("doctorId", "name email");
    if (!report) return res.status(404).json({ success: false, error: { message: "Report not found" } });

    const { userId, role } = req.user!;
    const owns =
      role === "patient"
        ? report.patientId.toString() === userId
        : report.doctorId.toString() === userId;
    if (!owns) return res.status(403).json({ success: false, error: { message: "Access denied" } });

    const patient = report.patientId as any;
    const doctor = report.doctorId as any;

    // Fetch episodes scoped to report period if available
    const periodStart = report.reportPeriod?.start;
    const periodEnd = report.reportPeriod?.end;
    const episodes = await getReportEpisodes(patient._id.toString(), periodStart, periodEnd);

    const pdfBuffer = await generateReportPdf({
      report: {
        _id: report._id,
        title: report.title,
        summary: report.summary,
        generatedAt: report.generatedAt,
        status: report.status,
        reportPeriod: report.reportPeriod,
      },
      patient: { name: patient?.name ?? "Unknown", email: patient?.email ?? "Unknown" },
      doctor: { name: doctor?.name ?? "Unknown", email: doctor?.email ?? "Unknown" },
      stats: report.stats,
      episodes,
    });

    const safeTitle = report.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const filename = `Neurofy_Report_${safeTitle}_${report._id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// Update report status (doctor only)
router.patch(
  "/:id/status",
  requireRole("doctor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      if (!["draft", "completed", "archived"].includes(status)) {
        return res.status(400).json({ success: false, error: { message: "Invalid status" } });
      }
      const report = await Report.findOneAndUpdate(
        { _id: req.params.id, doctorId: req.user!.userId },
        { status },
        { new: true }
      ).populate("patientId", "name email");
      if (!report) return res.status(404).json({ success: false, error: { message: "Not found or not authorized" } });

      // Notify patient when doctor publishes a previously-draft report
      if (status === "completed") {
        await NotificationService.createNotification({
          userId: (report.patientId as any)?._id?.toString() ?? report.patientId.toString(),
          type: "report",
          title: "Medical Report Now Available",
          message: `Your report "${report.title}" is now available to view.`,
          relatedId: (report as any)._id.toString(),
        });
      }
      res.json({ success: true, data: report });
    } catch (err) { next(err); }
  }
);

export default router;
