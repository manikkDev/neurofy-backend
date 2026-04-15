import { User, PatientProfile, TremorEpisode, Telemetry } from "../../models";

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

  static async getDailySummary(patientId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const [todayEpisodes, yesterdayEpisodes, todayTelemetry] = await Promise.all([
      TremorEpisode.find({ patientId, startedAt: { $gte: startOfToday } }),
      TremorEpisode.find({ patientId, startedAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      Telemetry.find({ patientId, detectedAt: { $gte: startOfToday } }).sort({ detectedAt: -1 }),
    ]);

    const todayCount = todayEpisodes.length;
    const yesterdayCount = yesterdayEpisodes.length;

    const todayDetections = todayTelemetry.filter(t => t.status === "DETECTED");
    const avgFrequency = todayDetections.length > 0
      ? todayDetections.reduce((sum, t) => sum + (t.frequencyHz || 0), 0) / todayDetections.length
      : 0;

    const severityCounts = {
      high: todayEpisodes.filter(e => e.maxSeverity === "SEVERE").length,
      medium: todayEpisodes.filter(e => e.maxSeverity === "MODERATE").length,
      low: todayEpisodes.filter(e => e.maxSeverity === "MILD").length,
    };

    const dominantSeverity = severityCounts.high > 0 ? "high" : severityCounts.medium > 0 ? "medium" : severityCounts.low > 0 ? "low" : "none";

    const totalDuration = todayEpisodes.reduce((sum, e) => sum + (e.durationSec || 0), 0);

    return {
      period: "today",
      episodeCount: todayCount,
      comparedToPrevious: yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : 0,
      averageFrequency: avgFrequency,
      dominantSeverity,
      severityCounts,
      totalDurationSeconds: totalDuration,
      detectionCount: todayDetections.length,
    };
  }

  static async getWeeklySummary(patientId: string) {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const [thisWeekEpisodes, lastWeekEpisodes, thisWeekTelemetry] = await Promise.all([
      TremorEpisode.find({ patientId, startedAt: { $gte: startOfThisWeek } }),
      TremorEpisode.find({ patientId, startedAt: { $gte: startOfLastWeek, $lt: startOfThisWeek } }),
      Telemetry.find({ patientId, detectedAt: { $gte: startOfThisWeek } }).sort({ detectedAt: -1 }),
    ]);

    const thisWeekCount = thisWeekEpisodes.length;
    const lastWeekCount = lastWeekEpisodes.length;

    const thisWeekDetections = thisWeekTelemetry.filter(t => t.status === "DETECTED");
    const avgFrequency = thisWeekDetections.length > 0
      ? thisWeekDetections.reduce((sum, t) => sum + (t.frequencyHz || 0), 0) / thisWeekDetections.length
      : 0;

    const severityCounts = {
      high: thisWeekEpisodes.filter(e => e.maxSeverity === "SEVERE").length,
      medium: thisWeekEpisodes.filter(e => e.maxSeverity === "MODERATE").length,
      low: thisWeekEpisodes.filter(e => e.maxSeverity === "MILD").length,
    };

    const dominantSeverity = severityCounts.high > 0 ? "high" : severityCounts.medium > 0 ? "medium" : severityCounts.low > 0 ? "low" : "none";

    const totalDuration = thisWeekEpisodes.reduce((sum, e) => sum + (e.durationSec || 0), 0);

    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfThisWeek);
      day.setDate(day.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = thisWeekEpisodes.filter(e => e.startedAt >= day && e.startedAt < nextDay).length;
      return {
        date: day.toISOString().split('T')[0],
        count,
      };
    });

    return {
      period: "this_week",
      episodeCount: thisWeekCount,
      comparedToPrevious: lastWeekCount > 0 ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 : 0,
      averageFrequency: avgFrequency,
      dominantSeverity,
      severityCounts,
      totalDurationSeconds: totalDuration,
      detectionCount: thisWeekDetections.length,
      dailyBreakdown,
    };
  }
}
