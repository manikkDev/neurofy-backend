/**
 * Phase 6 – PDF Report Generator
 *
 * Generates a clinical PDF report using pdfkit with:
 * - Patient + doctor header
 * - Report period and metadata
 * - Summary statistics table
 * - Severity analysis breakdown
 * - Episode list
 */
import PDFDocument from "pdfkit";
import { TremorEpisode } from "../../models/TremorEpisode";

interface ReportPdfData {
  report: {
    _id: any;
    title: string;
    summary: string;
    generatedAt: Date;
    status: string;
    reportPeriod?: {
      start: Date;
      end: Date;
      label: string;
    };
  };
  patient: { name: string; email: string };
  doctor: { name: string; email: string };
  stats?: {
    totalEpisodes: number;
    severityBreakdown: { severe: number; moderate: number; mild: number };
    totalDurationSeconds: number;
    averageFrequency: number;
    dominantSeverity: string;
  };
  episodes?: Array<{
    startedAt: Date;
    maxSeverity: string;
    durationSec?: number;
    avgFrequencyHz?: number;
  }>;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: data.report.title,
          Author: `Dr. ${data.doctor.name}`,
          Subject: `Medical Report for ${data.patient.name}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ────────────────────────────────────────────────
      doc
        .fillColor("#0f172a")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("NEUROFY MEDICAL REPORT", { align: "center" });

      doc
        .moveDown(0.3)
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#64748b")
        .text("Tremor Monitoring & Clinical Analysis Platform", { align: "center" });

      doc.moveDown(1);

      // Divider
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      // ── Report Title ─────────────────────────────────────────
      doc
        .fillColor("#0f172a")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(data.report.title);

      doc.moveDown(0.4);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(`Generated: ${new Date(data.report.generatedAt).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`);

      if (data.report.reportPeriod) {
        doc.text(
          `Report Period: ${data.report.reportPeriod.label} (${new Date(
            data.report.reportPeriod.start
          ).toLocaleDateString()} – ${new Date(data.report.reportPeriod.end).toLocaleDateString()})`
        );
      }

      doc.text(`Status: ${data.report.status.toUpperCase()}`);

      doc.moveDown(1);

      // ── Patient & Doctor info ────────────────────────────────
      const infoStartY = doc.y;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("PATIENT", 50, infoStartY);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#334155")
        .text(data.patient.name, 50, infoStartY + 16)
        .text(data.patient.email, 50, infoStartY + 30);

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("ATTENDING PHYSICIAN", 300, infoStartY);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#334155")
        .text(`Dr. ${data.doctor.name}`, 300, infoStartY + 16)
        .text(data.doctor.email, 300, infoStartY + 30);

      doc.y = infoStartY + 60;
      doc.moveDown(0.5);

      // ── Summary Statistics ───────────────────────────────────
      if (data.stats) {
        doc
          .strokeColor("#e2e8f0")
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown(0.8);

        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("SUMMARY STATISTICS");

        doc.moveDown(0.5);

        const statsRows = [
          ["Total Tremor Episodes", String(data.stats.totalEpisodes)],
          ["Average Frequency", `${data.stats.averageFrequency.toFixed(2)} Hz`],
          ["Total Duration", formatDuration(data.stats.totalDurationSeconds)],
          ["Dominant Severity", data.stats.dominantSeverity],
        ];

        const tableX = 50;
        let rowY = doc.y;

        statsRows.forEach(([label, value]) => {
          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#64748b")
            .text(label, tableX, rowY, { width: 200 });

          doc
            .font("Helvetica-Bold")
            .fillColor("#0f172a")
            .text(value, tableX + 220, rowY);

          rowY += 20;
        });

        doc.y = rowY + 10;

        // ── Severity Analysis ──────────────────────────────────
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("SEVERITY ANALYSIS");

        doc.moveDown(0.5);

        const sev = data.stats.severityBreakdown;
        const total = sev.severe + sev.moderate + sev.mild;

        const severityLevels = [
          { label: "Severe (High)", count: sev.severe, color: "#dc2626" },
          { label: "Moderate (Medium)", count: sev.moderate, color: "#ca8a04" },
          { label: "Mild (Low)", count: sev.mild, color: "#16a34a" },
        ];

        severityLevels.forEach((level) => {
          const pct = total > 0 ? (level.count / total) * 100 : 0;
          const barY = doc.y;

          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#334155")
            .text(level.label, 50, barY, { width: 150 });

          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(level.color)
            .text(`${level.count} (${pct.toFixed(0)}%)`, 470, barY);

          // Bar background
          doc
            .rect(200, barY + 2, 250, 12)
            .fillColor("#f1f5f9")
            .fill();

          // Bar fill
          if (pct > 0) {
            doc
              .rect(200, barY + 2, (pct / 100) * 250, 12)
              .fillColor(level.color)
              .fill();
          }

          doc.y = barY + 22;
        });

        doc.moveDown(0.8);
      }

      // ── Clinical Summary ─────────────────────────────────────
      doc
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown(0.8);

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text("CLINICAL SUMMARY");

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#1e293b")
        .text(data.report.summary, { align: "justify", lineGap: 4 });

      doc.moveDown(1);

      // ── Episode List ─────────────────────────────────────────
      if (data.episodes && data.episodes.length > 0) {
        if (doc.y > 650) doc.addPage();

        doc
          .strokeColor("#e2e8f0")
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown(0.8);

        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#0f172a")
          .text("NOTABLE EPISODES");

        doc.moveDown(0.5);

        // Table header
        const colX = [50, 180, 280, 380, 480];
        let ey = doc.y;

        doc.fontSize(9).font("Helvetica-Bold").fillColor("#64748b");
        doc.text("Date/Time", colX[0], ey);
        doc.text("Severity", colX[1], ey);
        doc.text("Duration", colX[2], ey);
        doc.text("Avg Freq (Hz)", colX[3], ey);

        ey += 15;
        doc
          .strokeColor("#cbd5e1")
          .lineWidth(0.5)
          .moveTo(50, ey - 3)
          .lineTo(545, ey - 3)
          .stroke();

        doc.font("Helvetica").fillColor("#334155");

        const episodesToShow = data.episodes.slice(0, 20);
        episodesToShow.forEach((ep) => {
          if (ey > 750) {
            doc.addPage();
            ey = 50;
          }
          doc.fontSize(9);
          doc.text(new Date(ep.startedAt).toLocaleString(), colX[0], ey, { width: 125 });
          doc.text(ep.maxSeverity || "—", colX[1], ey);
          doc.text(ep.durationSec ? formatDuration(ep.durationSec) : "—", colX[2], ey);
          doc.text(ep.avgFrequencyHz ? ep.avgFrequencyHz.toFixed(2) : "—", colX[3], ey);
          ey += 18;
        });

        doc.y = ey + 5;

        if (data.episodes.length > 20) {
          doc
            .fontSize(9)
            .fillColor("#64748b")
            .font("Helvetica-Oblique")
            .text(`... and ${data.episodes.length - 20} more episodes`, 50, doc.y);
        }
      }

      // ── Footer ───────────────────────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .fillColor("#94a3b8")
          .font("Helvetica")
          .text(
            `Neurofy Healthcare Platform • Report ID: ${data.report._id} • Page ${i + 1} of ${pages.count}`,
            50,
            800,
            { align: "center", width: 495 }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fetch episodes for a report (scoped to report period if provided)
 */
export async function getReportEpisodes(
  patientId: string,
  start?: Date,
  end?: Date
) {
  const filter: any = { patientId };
  if (start || end) {
    filter.startedAt = {};
    if (start) filter.startedAt.$gte = start;
    if (end) filter.startedAt.$lte = end;
  }
  return TremorEpisode.find(filter).sort({ startedAt: -1 }).lean();
}
