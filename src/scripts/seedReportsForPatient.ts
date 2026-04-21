import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import { User, DoctorProfile, Report } from "../models";

async function seedReportsForPatient() {
  try {
    console.log("[Seed] Starting medical report seeding for patient@gmail.com...");

    await connectDatabase();

    // Find the patient
    const patient = await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!patient) {
      console.log("Patient patient@gmail.com not found. Creating user...");
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("patient123", 10);
      
      const newPatient = await User.create({
        name: "Alex Johnson",
        email: "patient@gmail.com",
        password: hashedPassword,
        role: "patient",
      });
      
      console.log("Created patient: patient@gmail.com / patient123");
    }

    // Find or create a doctor
    let doctor = await User.findOne({ email: "dr.smith@neurofy.com", role: "doctor" });
    
    if (!doctor) {
      console.log("Creating doctor...");
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("doctor123", 10);
      
      doctor = await User.create({
        name: "Dr. Emily Smith",
        email: "dr.smith@neurofy.com",
        password: hashedPassword,
        role: "doctor",
      });

      await DoctorProfile.create({
        userId: doctor._id,
        specialization: "Neurology",
        licenseNumber: "NEU-67890",
        phone: "+1987654321",
        hospital: "Neurology Medical Center",
        yearsOfExperience: 15,
      });
      
      console.log("Created doctor: dr.smith@neurofy.com / doctor123");
    }

    // Get the actual patient (either existing or newly created)
    const actualPatient = patient || await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!actualPatient) {
      throw new Error("Could not find or create patient@gmail.com");
    }
    
    // Clear existing reports for this patient
    await Report.deleteMany({ patientId: actualPatient._id });
    console.log("Cleared existing reports for patient@gmail.com");

    console.log("Creating medical reports...");

    // Report 1: Monthly Analysis
    await Report.create({
      patientId: actualPatient._id,
      doctorId: doctor._id,
      title: "Monthly Tremor Analysis - April 2025",
      summary: "Patient showed significant improvement this month with 12 recorded tremor episodes, all classified as mild to moderate. Average frequency stabilized at 5.8 Hz. The patient reports good response to current medication regimen. No severe episodes were recorded, which is a positive indicator of treatment effectiveness.",
      status: "completed",
      reportPeriod: {
        start: new Date("2025-04-01"),
        end: new Date("2025-04-30"),
        label: "April 2025"
      },
      stats: {
        totalEpisodes: 12,
        severityBreakdown: { severe: 0, moderate: 5, mild: 7 },
        totalDurationSeconds: 1847,
        averageFrequency: 5.8,
        dominantSeverity: "MILD"
      },
      generatedAt: new Date("2025-05-02"),
    });

    // Report 2: Quarterly Review
    await Report.create({
      patientId: actualPatient._id,
      doctorId: doctor._id,
      title: "Quarterly Neurological Assessment - Q1 2025",
      summary: "Comprehensive quarterly review showing overall positive trend. Patient compliance with monitoring protocol is excellent. Tremor frequency has decreased by 23% compared to Q4 2024. Quality of life indicators have improved based on patient feedback. Recommend continuing current treatment plan with follow-up in 3 months.",
      status: "completed",
      reportPeriod: {
        start: new Date("2025-01-01"),
        end: new Date("2025-03-31"),
        label: "Q1 2025"
      },
      stats: {
        totalEpisodes: 47,
        severityBreakdown: { severe: 2, moderate: 18, mild: 27 },
        totalDurationSeconds: 8934,
        averageFrequency: 6.2,
        dominantSeverity: "MODERATE"
      },
      generatedAt: new Date("2025-04-05"),
    });

    // Report 3: Initial Assessment (Draft)
    await Report.create({
      patientId: actualPatient._id,
      doctorId: doctor._id,
      title: "Initial Diagnostic Assessment - March 2025",
      summary: "Initial comprehensive evaluation following diagnosis of essential tremor. Baseline measurements established. Patient presents with bilateral upper extremity tremor, predominantly right-sided. No significant functional impairment observed at this time. Treatment plan initiated with beta-blockers.",
      status: "draft",
      reportPeriod: {
        start: new Date("2025-03-01"),
        end: new Date("2025-03-31"),
        label: "March 2025"
      },
      stats: {
        totalEpisodes: 28,
        severityBreakdown: { severe: 3, moderate: 12, mild: 13 },
        totalDurationSeconds: 5621,
        averageFrequency: 6.7,
        dominantSeverity: "MODERATE"
      },
      generatedAt: new Date("2025-04-01"),
    });

    // Report 4: Recent Progress Report
    await Report.create({
      patientId: actualPatient._id,
      doctorId: doctor._id,
      title: "Progress Report - May 2025",
      summary: "Patient continues to show positive response to treatment. Recent data indicates further reduction in tremor frequency and intensity. Patient reports improved ability to perform daily activities. No adverse effects from current medication noted. Recommend continuation of current therapeutic approach.",
      status: "completed",
      reportPeriod: {
        start: new Date("2025-05-01"),
        end: new Date("2025-05-15"),
        label: "Early May 2025"
      },
      stats: {
        totalEpisodes: 8,
        severityBreakdown: { severe: 0, moderate: 2, mild: 6 },
        totalDurationSeconds: 945,
        averageFrequency: 5.4,
        dominantSeverity: "MILD"
      },
      generatedAt: new Date("2025-05-16"),
    });

    console.log("Medical reports seeded successfully for patient@gmail.com");
    console.log("Reports created:");
    console.log("  1. Monthly Tremor Analysis - April 2025 (Completed)");
    console.log("  2. Quarterly Neurological Assessment - Q1 2025 (Completed)");
    console.log("  3. Initial Diagnostic Assessment - March 2025 (Draft)");
    console.log("  4. Progress Report - May 2025 (Completed)");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedReportsForPatient();
