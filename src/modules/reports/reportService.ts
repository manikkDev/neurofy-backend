import { Report } from "../../models";

export class ReportService {
  static async createReport(data: {
    patientId: string;
    doctorId: string;
    title: string;
    summary: string;
  }) {
    const report = await Report.create({
      ...data,
      generatedAt: new Date(),
    });

    return report.populate(["patientId", "doctorId"]);
  }

  static async getReportsByPatient(patientId: string) {
    return Report.find({ patientId })
      .populate("doctorId", "name email")
      .sort({ generatedAt: -1 });
  }

  static async getReportsByDoctor(doctorId: string) {
    return Report.find({ doctorId })
      .populate("patientId", "name email")
      .sort({ generatedAt: -1 });
  }

  static async getReportById(id: string) {
    return Report.findById(id).populate(["patientId", "doctorId"]);
  }

  static async updateReportStatus(id: string, status: string) {
    return Report.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate(["patientId", "doctorId"]);
  }
}
