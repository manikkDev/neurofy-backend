/**
 * Phase 6 – Appointment service (completed)
 *
 * Adds doctor action methods (accept, reject, reschedule)
 * and notification firing on every status change.
 */
import { Appointment } from "../../models/Appointment";
import { NotificationService } from "../notifications/notificationService";

// ── Patient-facing ────────────────────────────────────────────────

export async function createAppointment(data: {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  reason?: string;
}) {
  const appt = await Appointment.create({
    ...data,
    scheduledAt: new Date(data.scheduledAt),
    status: "requested",
  });
  const populated = await appt.populate([
    { path: "patientId", select: "name email" },
    { path: "doctorId", select: "name email" },
  ]);

  // Notify doctor of new request
  await NotificationService.createNotification({
    userId: data.doctorId,
    type: "appointment",
    title: "New Appointment Request",
    message: `A patient has requested an appointment for ${new Date(data.scheduledAt).toLocaleString()}`,
    relatedId: (populated as any)._id.toString(),
  });

  // Confirm receipt to patient
  await NotificationService.createNotification({
    userId: data.patientId,
    type: "appointment",
    title: "Appointment Requested",
    message: `Your appointment request for ${new Date(data.scheduledAt).toLocaleString()} has been sent to the doctor.`,
    relatedId: (populated as any)._id.toString(),
  });

  return populated;
}

export async function getAppointmentsByPatient(patientId: string) {
  return Appointment.find({ patientId })
    .populate("doctorId", "name email")
    .sort({ scheduledAt: -1 });
}

export async function getAppointmentsByDoctor(doctorId: string) {
  return Appointment.find({ doctorId })
    .populate("patientId", "name email")
    .sort({ scheduledAt: -1 });
}

export async function getPendingAppointmentsByDoctor(doctorId: string) {
  return Appointment.find({ doctorId, status: "requested" })
    .populate("patientId", "name email")
    .sort({ scheduledAt: 1 });
}

export async function getAppointmentById(id: string) {
  return Appointment.findById(id).populate([
    { path: "patientId", select: "name email" },
    { path: "doctorId", select: "name email" },
  ]);
}

export async function cancelAppointment(id: string, userId: string) {
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, patientId: userId },
    { status: "cancelled" },
    { new: true }
  ).populate([
    { path: "patientId", select: "name email" },
    { path: "doctorId", select: "name email" },
  ]);
  if (appt) {
    await NotificationService.createNotification({
      userId: (appt.doctorId as any)._id?.toString() ?? appt.doctorId.toString(),
      type: "appointment",
      title: "Appointment Cancelled",
      message: "A patient has cancelled their appointment.",
      relatedId: id,
    });
  }
  return appt;
}

// ── Doctor-facing ─────────────────────────────────────────────────

export async function acceptAppointment(id: string, doctorId: string, responseNote?: string) {
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, doctorId },
    { status: "confirmed", responseNote },
    { new: true }
  ).populate([
    { path: "patientId", select: "name email _id" },
    { path: "doctorId", select: "name email" },
  ]);

  if (appt) {
    await NotificationService.createNotification({
      userId: (appt.patientId as any)._id?.toString() ?? appt.patientId.toString(),
      type: "appointment",
      title: "Appointment Confirmed ✓",
      message: `Your appointment on ${new Date(appt.scheduledAt).toLocaleString()} has been confirmed by the doctor.${responseNote ? ` Note: ${responseNote}` : ""}`,
      relatedId: id,
    });
  }
  return appt;
}

export async function rejectAppointment(id: string, doctorId: string, responseNote?: string) {
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, doctorId },
    { status: "rejected", responseNote },
    { new: true }
  ).populate([
    { path: "patientId", select: "name email _id" },
    { path: "doctorId", select: "name email" },
  ]);

  if (appt) {
    await NotificationService.createNotification({
      userId: (appt.patientId as any)._id?.toString() ?? appt.patientId.toString(),
      type: "appointment",
      title: "Appointment Declined",
      message: `Your appointment request for ${new Date(appt.scheduledAt).toLocaleString()} was declined.${responseNote ? ` Reason: ${responseNote}` : ""}`,
      relatedId: id,
    });
  }
  return appt;
}

export async function rescheduleAppointment(
  id: string,
  doctorId: string,
  newDate: string,
  responseNote?: string
) {
  const appt = await Appointment.findOneAndUpdate(
    { _id: id, doctorId },
    {
      status: "rescheduled",
      rescheduledAt: new Date(newDate),
      scheduledAt: new Date(newDate),
      responseNote,
    },
    { new: true }
  ).populate([
    { path: "patientId", select: "name email _id" },
    { path: "doctorId", select: "name email" },
  ]);

  if (appt) {
    await NotificationService.createNotification({
      userId: (appt.patientId as any)._id?.toString() ?? appt.patientId.toString(),
      type: "appointment",
      title: "Appointment Rescheduled",
      message: `Your appointment has been rescheduled to ${new Date(newDate).toLocaleString()}.${responseNote ? ` Note: ${responseNote}` : ""}`,
      relatedId: id,
    });
  }
  return appt;
}

export async function markAppointmentCompleted(id: string) {
  return Appointment.findByIdAndUpdate(
    id,
    { status: "completed" },
    { new: true }
  ).populate([
    { path: "patientId", select: "name email" },
    { path: "doctorId", select: "name email" },
  ]);
}
