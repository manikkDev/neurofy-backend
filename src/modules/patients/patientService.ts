import { User, PatientProfile, TremorEpisode } from "../../models";

export class PatientService {
  static async getPatientsList(doctorId?: string) {
    return User.find({ role: "patient", isActive: true })
      .select("name email createdAt")
      .sort({ name: 1 });
  }

  static async getPatientDetails(patientId: string) {
    const user = await User.findById(patientId).select("name email role createdAt");
    
    if (!user || user.role !== "patient") {
      throw new Error("Patient not found");
    }

    const profile = await PatientProfile.findOne({ userId: patientId });

    return {
      ...user.toObject(),
      profile,
    };
  }

  static async getPatientHistory(patientId: string, limit: number = 50) {
    return TremorEpisode.find({ patientId })
      .populate("deviceId", "label deviceId")
      .sort({ startedAt: -1 })
      .limit(limit);
  }

  static async getPatientStats(patientId: string) {
    const episodes = await TremorEpisode.find({ patientId });
    
    const totalEpisodes = episodes.length;
    const severeCount = episodes.filter(e => e.maxSeverity === "SEVERE").length;
    const moderateCount = episodes.filter(e => e.maxSeverity === "MODERATE").length;
    const mildCount = episodes.filter(e => e.maxSeverity === "MILD").length;

    const recentEpisodes = episodes.filter(e => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return e.startedAt >= dayAgo;
    });

    return {
      totalEpisodes,
      severityBreakdown: {
        severe: severeCount,
        moderate: moderateCount,
        mild: mildCount,
      },
      recentEpisodes: recentEpisodes.length,
    };
  }
}
