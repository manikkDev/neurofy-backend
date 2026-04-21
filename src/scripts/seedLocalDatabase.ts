import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { User, PatientProfile, TremorEpisode, DoctorNote, Report, Device } from "../models";
import bcrypt from "bcrypt";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/neurofy";

async function seedLocalDatabase() {
  try {
    console.log("[Seed Local] Connecting to local MongoDB...");
    console.log("[Seed Local] URI:", MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log("[Seed Local] Connected successfully!");
    
    // Clear existing data (optional - remove if you want to keep existing data)
    console.log("[Seed Local] Clearing existing data...");
    await PatientProfile.deleteMany({});
    await TremorEpisode.deleteMany({});
    await DoctorNote.deleteMany({});
    await Report.deleteMany({});
    await Device.deleteMany({});
    await User.deleteMany({ role: { $in: ["doctor", "patient"] } });
    
    // Create Doctor
    console.log("[Seed Local] Creating doctor...");
    const doctorPassword = await bcrypt.hash("doctor123", 10);
    const doctor = await User.create({
      name: "Dr. Alex Johnson",
      email: "doctor@gmail.com",
      password: doctorPassword,
      role: "doctor",
    });
    console.log("[Seed Local] Doctor created:", doctor.email);
    
    // Create Patient with seeded data
    console.log("[Seed Local] Creating patient with data...");
    const patientPassword = await bcrypt.hash("patient123", 10);
    const patient = await User.create({
      name: "Alex Johnson",
      email: "patient@gmail.com",
      password: patientPassword,
      role: "patient",
    });
    console.log("[Seed Local] Patient created:", patient.email);
    
    // Create Patient Profile
    const patientProfile = await PatientProfile.create({
      userId: patient._id,
      assignedDoctorId: doctor._id,
      assignedAt: new Date(),
      dateOfBirth: new Date("1985-06-15"),
      phone: "+1234567890",
      address: "123 Health St, Medical City, MC 12345",
      medicalHistory: "Diagnosed with essential tremor in 2020. Family history of neurological conditions.",
      emergencyContact: {
        name: "Jane Doe",
        phone: "+1234567891",
        relationship: "Spouse",
      },
    });
    console.log("[Seed Local] Patient profile created");
    
    // Create Device
    const device = await Device.create({
      deviceId: "ESP32-001",
      patientId: patient._id,
      label: "Main Device",
      pairingStatus: "paired",
      status: "active",
      transportType: "wifi",
      wifiConnected: true,
      wifiIpAddress: "192.168.1.100",
      lastSyncAt: new Date(),
    });
    console.log("[Seed Local] Device created");
    
    // Create Tremor Episodes
    const episodes = await TremorEpisode.insertMany([
      {
        patientId: patient._id,
        deviceId: device._id,
        startedAt: new Date("2026-04-20T10:00:00Z"),
        endedAt: new Date("2026-04-20T10:05:00Z"),
        durationSec: 300,
        avgFrequencyHz: 4.2,
        maxAmplitude: 0.8,
        severity: "MODERATE",
        maxSeverity: "MODERATE",
        sampleCount: 150,
        location: { latitude: 40.7128, longitude: -74.0060 },
      },
      {
        patientId: patient._id,
        deviceId: device._id,
        startedAt: new Date("2026-04-19T14:30:00Z"),
        endedAt: new Date("2026-04-19T14:32:00Z"),
        durationSec: 120,
        avgFrequencyHz: 3.8,
        maxAmplitude: 0.5,
        severity: "MILD",
        maxSeverity: "MILD",
        sampleCount: 80,
        location: { latitude: 40.7128, longitude: -74.0060 },
      },
      {
        patientId: patient._id,
        deviceId: device._id,
        startedAt: new Date("2026-04-18T09:15:00Z"),
        endedAt: new Date("2026-04-18T09:20:00Z"),
        durationSec: 300,
        avgFrequencyHz: 5.1,
        maxAmplitude: 1.2,
        severity: "SEVERE",
        maxSeverity: "SEVERE",
        sampleCount: 200,
        location: { latitude: 40.7128, longitude: -74.0060 },
      },
    ]);
    console.log("[Seed Local] Created", episodes.length, "episodes");
    
    // Create Doctor Notes
    const notes = await DoctorNote.insertMany([
      {
        patientId: patient._id,
        doctorId: doctor._id,
        content: "Patient showing signs of essential tremor. Recommended starting with Propranolol 40mg twice daily. Monitor for side effects.",
        diagnosis: "Essential Tremor - Moderate",
        isPrivate: false,
        createdAt: new Date("2026-04-15T10:00:00Z"),
      },
      {
        patientId: patient._id,
        doctorId: doctor._id,
        content: "Follow-up visit shows 40% reduction in tremor frequency. Patient reports mild fatigue but otherwise tolerating medication well.",
        diagnosis: "Essential Tremor - Improving",
        isPrivate: false,
        createdAt: new Date("2026-04-18T14:00:00Z"),
      },
      {
        patientId: patient._id,
        doctorId: doctor._id,
        content: "Discussed device setup for remote monitoring. Patient understands how to use the ESP32 monitoring device.",
        diagnosis: "Essential Tremor - Monitored",
        isPrivate: false,
        createdAt: new Date("2026-04-20T09:00:00Z"),
      },
    ]);
    console.log("[Seed Local] Created", notes.length, "doctor notes");
    
    // Create Reports
    const reports = await Report.insertMany([
      {
        patientId: patient._id,
        doctorId: doctor._id,
        title: "Initial Consultation Report",
        summary: "Patient presented with bilateral upper extremity tremor, more pronounced in the right hand. Tremor frequency ranges from 3-5 Hz. Diagnosed with essential tremor. Started on Propranolol 40mg twice daily. Patient educated on lifestyle modifications including caffeine reduction and stress management.",
        status: "completed",
        reportPeriod: {
          start: new Date("2026-04-15"),
          end: new Date("2026-04-15"),
          label: "Initial Visit",
        },
        stats: {
          totalEpisodes: 0,
          severeEpisodes: 0,
          moderateEpisodes: 0,
          mildEpisodes: 0,
          averageFrequency: 0,
          dominantSeverity: "NONE",
        },
        createdAt: new Date("2026-04-15T16:00:00Z"),
      },
      {
        patientId: patient._id,
        doctorId: doctor._id,
        title: "Weekly Progress Report",
        summary: "Significant improvement observed over the past week. Tremor episodes reduced by 40% in frequency. Patient compliance is excellent. Mild side effects reported including slight fatigue. Continuing current medication regimen and scheduling follow-up in 2 weeks.",
        status: "completed",
        reportPeriod: {
          start: new Date("2026-04-13"),
          end: new Date("2026-04-20"),
          label: "Past 7 Days",
        },
        stats: {
          totalEpisodes: 3,
          severeEpisodes: 1,
          moderateEpisodes: 1,
          mildEpisodes: 1,
          averageFrequency: 4.4,
          dominantSeverity: "MODERATE",
        },
        createdAt: new Date("2026-04-20T16:00:00Z"),
      },
    ]);
    console.log("[Seed Local] Created", reports.length, "reports");
    
    console.log("\n✅ Local database seeded successfully!");
    console.log("\nTest Accounts:");
    console.log("  Doctor: doctor@gmail.com / doctor123");
    console.log("  Patient: patient@gmail.com / patient123");
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("[Seed Local] Error:", error);
    process.exit(1);
  }
}

seedLocalDatabase();
