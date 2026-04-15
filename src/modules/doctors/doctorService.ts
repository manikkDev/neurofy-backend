/**
 * Phase 5 – Doctor service layer
 *
 * All methods require the callsite to have already verified the doctor role.
 * No patient data is leaked — summaries are scoped to paired patients only.
 */

import { User } from "../../models/User";
import { Device } from "../../models/Device";
import { TremorEpisode } from "../../models/TremorEpisode";
import { DoctorNote } from "../../models/DoctorNote";
import { Report } from "../../models/Report";
import { Alert } from "../../models/Alert";
import { Appointment } from "../../models/Appointment";

// ------------------------------------------------------------------
// Dashboard summary
// ------------------------------------------------------------------

export async function getDoctorDashboard(doctorId: string) {
  const { PatientProfile } = await import("../../models/PatientProfile");
  
  const [
    totalPatients,
    activeAlerts,
    pendingAppointments,
    recentAlerts,
    recentPatients,
  ] = await Promise.all([
    // Total assigned patients only
    PatientProfile.countDocuments({ assignedDoctorId: doctorId }),

    // Active severe alerts
    Alert.countDocuments({ severity: "SEVERE", status: "active" }),

    // Pending appointments for this doctor
    Appointment.countDocuments({
      doctorId,
      status: { $in: ["scheduled", "confirmed"] },
      scheduledAt: { $gte: new Date() },
    }),

    // Last 5 severe alerts with patient info
    Alert.find({ severity: "SEVERE" })
      .sort({ triggeredAt: -1 })
      .limit(5)
      .populate("patientId", "name email")
      .lean(),

    // Last 5 patients with a recent episode
    TremorEpisode.aggregate([
      { $sort: { startedAt: -1 } },
      {
        $group: {
          _id: "$patientId",
          lastEpisode: { $first: "$$ROOT" },
        },
      },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          patientId: "$_id",
          patientName: "$patient.name",
          patientEmail: "$patient.email",
          lastSeverity: "$lastEpisode.maxSeverity",
          lastActivity: "$lastEpisode.startedAt",
        },
      },
    ]),
  ]);

  return {
    totalPatients,
    activeAlerts,
    pendingAppointments,
    recentAlerts,
    recentPatients,
  };
}

// ------------------------------------------------------------------
// Patient list with search
// ------------------------------------------------------------------

export async function getDoctorPatientList(doctorId: string, query?: string) {
  const { PatientProfile } = await import("../../models/PatientProfile");
  
  // First get assigned patient user IDs
  const assignedProfiles = await PatientProfile.find({
    assignedDoctorId: doctorId,
  }).select("userId").lean();
  
  if (assignedProfiles.length === 0) return [];
  
  const assignedPatientIds = assignedProfiles.map((p) => p.userId);
  
  // Build base user filter - only assigned patients
  const userFilter: any = { 
    _id: { $in: assignedPatientIds },
    role: "patient", 
    isActive: true 
  };
  
  if (query && query.trim()) {
    const q = query.trim();
    userFilter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const patients = await User.find(userFilter)
    .select("_id name email createdAt")
    .sort({ name: 1 })
    .lean();

  if (patients.length === 0) return [];

  const patientIds = patients.map((p) => p._id);

  // Aggregate latest episode per patient
  const latestEpisodes = await TremorEpisode.aggregate([
    { $match: { patientId: { $in: patientIds } } },
    { $sort: { startedAt: -1 } },
    {
      $group: {
        _id: "$patientId",
        maxSeverity: { $first: "$maxSeverity" },
        lastActivity: { $first: "$startedAt" },
        totalEpisodes: { $sum: 1 },
      },
    },
  ]);

  // Aggregate device status per patient
  const devices = await Device.find({ patientId: { $in: patientIds } })
    .select("patientId status pairingStatus lastSyncAt")
    .lean();

  // Aggregate active alert count per patient
  const alertCounts = await Alert.aggregate([
    {
      $match: {
        patientId: { $in: patientIds },
        severity: "SEVERE",
        status: "active",
      },
    },
    { $group: { _id: "$patientId", count: { $sum: 1 } } },
  ]);

  // Build lookup maps
  const episodeMap = new Map(
    latestEpisodes.map((e) => [e._id.toString(), e])
  );
  const deviceMap = new Map(
    devices.map((d) => [d.patientId.toString(), d])
  );
  const alertMap = new Map(
    alertCounts.map((a) => [a._id.toString(), a.count])
  );

  return patients.map((p) => {
    const id = p._id.toString();
    const ep = episodeMap.get(id);
    const dev = deviceMap.get(id);
    const alerts = alertMap.get(id) || 0;
    return {
      _id: p._id,
      name: p.name,
      email: p.email,
      createdAt: p.createdAt,
      lastSeverity: ep?.maxSeverity ?? null,
      lastActivity: ep?.lastActivity ?? null,
      totalEpisodes: ep?.totalEpisodes ?? 0,
      deviceStatus: dev?.status ?? null,
      devicePaired: dev?.pairingStatus === "paired",
      lastSyncAt: dev?.lastSyncAt ?? null,
      activeAlerts: alerts,
    };
  });
}

// ------------------------------------------------------------------
// Patient detail aggregate (doctor view — full clinical data)
// ------------------------------------------------------------------

export async function getDoctorPatientDetail(patientId: string) {
  const [patient, episodes, stats, notes, reports, device] = await Promise.all([
    User.findById(patientId).select("name email createdAt isActive").lean(),

    TremorEpisode.find({ patientId })
      .sort({ startedAt: -1 })
      .limit(30)
      .lean(),

    // Inline stats computation
    TremorEpisode.find({ patientId }).lean().then((eps) => {
      const total = eps.length;
      const severe = eps.filter((e) => e.maxSeverity === "SEVERE").length;
      const moderate = eps.filter((e) => e.maxSeverity === "MODERATE").length;
      const mild = eps.filter((e) => e.maxSeverity === "MILD").length;

      // Daily counts for the last 14 days
      const now = new Date();
      const dailyCounts: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dailyCounts[d.toISOString().slice(0, 10)] = 0;
      }
      eps.forEach((e) => {
        const key = new Date(e.startedAt).toISOString().slice(0, 10);
        if (key in dailyCounts) dailyCounts[key]++;
      });

      return {
        totalEpisodes: total,
        severityBreakdown: { severe, moderate, mild },
        recentEpisodes: eps.filter((e) => {
          const ago = new Date();
          ago.setDate(ago.getDate() - 1);
          return new Date(e.startedAt) >= ago;
        }).length,
        dailyCounts: Object.entries(dailyCounts).map(([date, count]) => ({
          date,
          count,
        })),
      };
    }),

    DoctorNote.find({ patientId })
      .populate("doctorId", "name email")
      .sort({ createdAt: -1 })
      .lean(),

    Report.find({ patientId })
      .populate("doctorId", "name email")
      .sort({ generatedAt: -1 })
      .lean(),

    Device.findOne({ patientId }).select("deviceId label status pairingStatus lastSyncAt batteryLevel").lean(),
  ]);

  if (!patient) throw new Error("Patient not found");

  return { patient, episodes, stats, notes, reports, device };
}

// ------------------------------------------------------------------
// Notes
// ------------------------------------------------------------------

export async function createNote(data: {
  patientId: string;
  doctorId: string;
  content: string;
  diagnosis?: string;
  isPrivate?: boolean;
}) {
  const note = await DoctorNote.create(data);
  return note.populate("doctorId", "name email");
}

export async function getPatientNotes(patientId: string) {
  return DoctorNote.find({ patientId })
    .populate("doctorId", "name email")
    .sort({ createdAt: -1 })
    .lean();
}

// ------------------------------------------------------------------
// Reports
// ------------------------------------------------------------------

export async function createReport(data: {
  patientId: string;
  doctorId: string;
  title: string;
  summary: string;
  status?: "draft" | "completed";
}) {
  const report = await Report.create({
    ...data,
    status: data.status ?? "completed",
    generatedAt: new Date(),
  });
  return report.populate("doctorId", "name email");
}

export async function getPatientReports(patientId: string) {
  return Report.find({ patientId })
    .populate("doctorId", "name email")
    .sort({ generatedAt: -1 })
    .lean();
}

// ------------------------------------------------------------------
// Severe Alerts
// ------------------------------------------------------------------

export async function getSevereAlerts(limit = 50) {
  return Alert.find({ severity: "SEVERE" })
    .populate("patientId", "name email")
    .sort({ triggeredAt: -1 })
    .limit(limit)
    .lean();
}

export async function acknowledgeAlert(alertId: string, doctorId: string) {
  return Alert.findByIdAndUpdate(
    alertId,
    {
      status: "acknowledged",
      acknowledgedBy: doctorId,
      acknowledgedAt: new Date(),
    },
    { new: true }
  ).lean();
}
