import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import {
  User,
  PatientProfile,
  DoctorProfile,
  Device,
  TremorEpisode,
  DoctorNote,
  Report,
  Appointment,
  Alert,
  Notification,
} from "../models";
import bcrypt from "bcrypt";

async function seedData() {
  try {
    console.log("[Seed] Starting data seeding...");

    await connectDatabase();

    console.log("[Seed] Clearing existing data...");
    await User.deleteMany({ email: { $regex: /seed/ } });
    await PatientProfile.deleteMany({});
    await DoctorProfile.deleteMany({});
    await Device.deleteMany({});
    await TremorEpisode.deleteMany({});
    await DoctorNote.deleteMany({});
    await Report.deleteMany({});
    await Appointment.deleteMany({});
    await Alert.deleteMany({});
    await Notification.deleteMany({});

    console.log("[Seed] Creating sample users...");
    const hashedPassword = await bcrypt.hash("seed123", 10);

    const samplePatient = await User.create({
      name: "John Seed Patient",
      email: "patient.seed@neurofy.com",
      password: hashedPassword,
      role: "patient",
    });

    const sampleDoctor = await User.create({
      name: "Dr. Sarah Seed",
      email: "doctor.seed@neurofy.com",
      password: hashedPassword,
      role: "doctor",
    });

    await PatientProfile.create({
      userId: samplePatient._id,
      dateOfBirth: new Date("1985-06-15"),
      phone: "+1234567890",
      address: "123 Health St, Medical City, MC 12345",
      medicalHistory: "Diagnosed with essential tremor in 2020",
      emergencyContact: {
        name: "Jane Doe",
        phone: "+1234567891",
        relationship: "Spouse",
      },
    });

    await DoctorProfile.create({
      userId: sampleDoctor._id,
      specialization: "Neurology",
      licenseNumber: "NEU-12345",
      phone: "+1234567892",
      hospital: "Central Medical Hospital",
      yearsOfExperience: 12,
    });

    console.log("[Seed] Creating sample device...");
    const sampleDevice = await Device.create({
      deviceId: "ESP32-001",
      patientId: samplePatient._id,
      label: "My Tremor Monitor",
      pairingStatus: "paired",
      status: "active",
      batteryLevel: 85,
      lastSyncAt: new Date(),
      firmwareVersion: "1.2.3",
    });

    console.log("[Seed] Creating sample tremor episodes...");
    const episodes = [];
    for (let i = 0; i < 15; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      startDate.setHours(Math.floor(Math.random() * 24));

      const severities = ["MILD", "MODERATE", "SEVERE"];
      const severity = severities[Math.floor(Math.random() * severities.length)] as any;

      episodes.push({
        patientId: samplePatient._id,
        deviceId: sampleDevice._id,
        startedAt: startDate,
        durationSec: Math.floor(Math.random() * 300) + 30,
        maxSeverity: severity,
        episodeCount: Math.floor(Math.random() * 5) + 1,
        avgFrequencyHz: 4 + Math.random() * 4,
        maxAmplitude: Math.random() * 10,
        summary: `${severity} tremor episode detected`,
      });
    }
    await TremorEpisode.insertMany(episodes);

    console.log("[Seed] Creating sample doctor notes...");
    await DoctorNote.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      content: "Patient shows consistent tremor patterns. Recommend continued monitoring and possible medication adjustment.",
      diagnosis: "Essential Tremor - Moderate",
      isPrivate: false,
    });

    await DoctorNote.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      content: "Follow-up: Patient reports improvement with current treatment plan. Tremor frequency reduced by approximately 30%.",
      diagnosis: "Essential Tremor - Improving",
      isPrivate: false,
    });

    console.log("[Seed] Creating sample reports...");
    await Report.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      title: "Monthly Tremor Analysis - December 2025",
      summary: "Patient experienced 15 tremor episodes this month. Majority were mild to moderate. Severe episodes decreased compared to previous month. Recommend continuing current treatment regimen.",
      status: "completed",
      generatedAt: new Date(),
    });

    await Report.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      title: "Quarterly Review - Q4 2025",
      summary: "Comprehensive analysis of tremor patterns over the past three months shows overall positive trend. Patient compliance with monitoring is excellent.",
      status: "draft",
      generatedAt: new Date(),
    });

    console.log("[Seed] Creating sample appointments...");
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 7);

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 14);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    await Appointment.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      scheduledAt: futureDate1,
      status: "confirmed",
      reason: "Regular check-up",
      notes: "Review recent tremor data and discuss treatment options",
    });

    await Appointment.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      scheduledAt: futureDate2,
      status: "scheduled",
      reason: "Follow-up consultation",
    });

    await Appointment.create({
      patientId: samplePatient._id,
      doctorId: sampleDoctor._id,
      scheduledAt: pastDate,
      status: "completed",
      reason: "Initial consultation",
      notes: "Discussed treatment plan and monitoring setup",
    });

    console.log("[Seed] Creating sample alerts...");
    await Alert.create({
      patientId: samplePatient._id,
      deviceId: sampleDevice._id,
      severity: "SEVERE",
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: "acknowledged",
      acknowledgedBy: sampleDoctor._id,
      acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      message: "Severe tremor episode detected - immediate attention recommended",
    });

    await Alert.create({
      patientId: samplePatient._id,
      deviceId: sampleDevice._id,
      severity: "MODERATE",
      triggeredAt: new Date(),
      status: "active",
      message: "Moderate tremor episode in progress",
    });

    console.log("[Seed] Creating sample notifications...");
    await Notification.create({
      userId: samplePatient._id,
      type: "appointment",
      title: "Upcoming Appointment",
      message: "You have an appointment with Dr. Sarah Seed in 7 days",
      isRead: false,
    });

    await Notification.create({
      userId: samplePatient._id,
      type: "report",
      title: "New Report Available",
      message: "Your monthly tremor analysis report is ready to view",
      isRead: false,
    });

    await Notification.create({
      userId: sampleDoctor._id,
      type: "alert",
      title: "Patient Alert",
      message: "Moderate tremor episode detected for John Seed Patient",
      isRead: false,
    });

    console.log("[Seed] ✅ Data seeding completed successfully!");
    console.log("[Seed] Sample accounts:");
    console.log("  Patient: patient.seed@neurofy.com / seed123");
    console.log("  Doctor: doctor.seed@neurofy.com / seed123");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("[Seed] ✗ Seeding failed:", error);
    process.exit(1);
  }
}

seedData();
