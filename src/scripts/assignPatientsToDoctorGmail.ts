import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import { User, PatientProfile } from "../models";

async function assignPatientsToDoctorGmail() {
  try {
    console.log("[Assign] Starting patient assignment for doctor@gmail.com...");

    await connectDatabase();

    // Find the doctor@gmail.com account
    const doctor = await User.findOne({ email: "doctor@gmail.com", role: "doctor" });
    
    if (!doctor) {
      console.log("Doctor doctor@gmail.com not found. Creating doctor...");
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("doctor123", 10);
      
      const newDoctor = await User.create({
        name: "Dr. Alex Johnson",
        email: "doctor@gmail.com",
        password: hashedPassword,
        role: "doctor",
      });
      
      console.log("Created doctor: doctor@gmail.com / doctor123");
    }

    // Find the patient@gmail.com account
    const patient = await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!patient) {
      console.log("Patient patient@gmail.com not found. Creating patient...");
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

    // Get the actual doctor and patient
    const actualDoctor = doctor || await User.findOne({ email: "doctor@gmail.com", role: "doctor" });
    const actualPatient = patient || await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!actualDoctor || !actualPatient) {
      throw new Error("Could not find or create doctor or patient");
    }

    // Check if already assigned
    const existingAssignment = await PatientProfile.findOne({
      userId: actualPatient._id,
      assignedDoctorId: actualDoctor._id,
    }).lean();
    
    if (existingAssignment) {
      console.log("Patient already assigned to this doctor");
    } else {
      // Create or update patient profile with doctor assignment
      const patientProfile = await PatientProfile.findOneAndUpdate(
        { userId: actualPatient._id },
        { 
          assignedDoctorId: actualDoctor._id,
          assignedAt: new Date(),
          dateOfBirth: new Date("1985-06-15"),
          phone: "+1234567890",
          address: "123 Health St, Medical City, MC 12345",
          medicalHistory: "Diagnosed with essential tremor in 2020",
          emergencyContact: {
            name: "Jane Doe",
            phone: "+1234567891",
            relationship: "Spouse",
          },
        },
        { 
          new: true, 
          upsert: true 
        }
      ).lean();
      
      console.log("Successfully assigned patient to doctor@gmail.com");
    }

    // Also create a few more test patients for the doctor
    const testPatients = [
      { name: "Sarah Wilson", email: "sarah.wilson@example.com" },
      { name: "Michael Chen", email: "michael.chen@example.com" },
      { name: "Emma Davis", email: "emma.davis@example.com" },
    ];

    for (const testPatient of testPatients) {
      let existingTestPatient = await User.findOne({ email: testPatient.email, role: "patient" });
      
      if (!existingTestPatient) {
        const bcrypt = require("bcrypt");
        const hashedPassword = await bcrypt.hash("patient123", 10);
        
        existingTestPatient = await User.create({
          name: testPatient.name,
          email: testPatient.email,
          password: hashedPassword,
          role: "patient",
        });
        
        console.log(`Created test patient: ${testPatient.email} / patient123`);
      }

      // Assign to doctor
      const existingTestAssignment = await PatientProfile.findOne({
        userId: existingTestPatient._id,
        assignedDoctorId: actualDoctor._id,
      }).lean();
      
      if (!existingTestAssignment) {
        await PatientProfile.findOneAndUpdate(
          { userId: existingTestPatient._id },
          { 
            assignedDoctorId: actualDoctor._id,
            assignedAt: new Date(),
            dateOfBirth: new Date("1990-01-15"),
            phone: "+1987654321",
            address: "456 Medical Ave, Health City, MC 67890",
            medicalHistory: "Patient with movement disorder symptoms",
            emergencyContact: {
              name: "Emergency Contact",
              phone: "+1987654322",
              relationship: "Family",
            },
          },
          { 
            new: true, 
            upsert: true 
          }
        );
        
        console.log(`Assigned ${testPatient.name} to doctor@gmail.com`);
      }
    }

    console.log("\nAssignment completed!");
    console.log("Doctor: doctor@gmail.com / doctor123");
    console.log("Patients assigned:");
    console.log("  - patient@gmail.com / patient123");
    console.log("  - sarah.wilson@example.com / patient123");
    console.log("  - michael.chen@example.com / patient123");
    console.log("  - emma.davis@example.com / patient123");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Assignment failed:", error);
    process.exit(1);
  }
}

assignPatientsToDoctorGmail();
