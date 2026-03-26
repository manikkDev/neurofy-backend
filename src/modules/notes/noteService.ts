import { DoctorNote } from "../../models";

export class NoteService {
  static async createNote(data: {
    patientId: string;
    doctorId: string;
    content: string;
    diagnosis?: string;
  }) {
    const note = await DoctorNote.create(data);
    return note.populate(["patientId", "doctorId"]);
  }

  static async getNotesByPatient(patientId: string) {
    return DoctorNote.find({ patientId })
      .populate("doctorId", "name email")
      .sort({ createdAt: -1 });
  }

  static async getPatientVisibleNotes(patientId: string) {
    return DoctorNote.find({ patientId, isPrivate: false })
      .populate("doctorId", "name email")
      .sort({ createdAt: -1 });
  }

  static async getNotesByDoctor(doctorId: string) {
    return DoctorNote.find({ doctorId })
      .populate("patientId", "name email")
      .sort({ createdAt: -1 });
  }

  static async getNoteById(id: string) {
    return DoctorNote.findById(id).populate(["patientId", "doctorId"]);
  }

  static async updateNote(id: string, data: { content?: string; diagnosis?: string }) {
    return DoctorNote.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate(["patientId", "doctorId"]);
  }

  static async deleteNote(id: string) {
    return DoctorNote.findByIdAndDelete(id);
  }
}
