import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import { User, PatientProfile } from "../models";

async function assignPatientToDoctor() {
  try {
    console.log("[Assign] Starting patient-to-doctor assignment...");

    await connectDatabase();

    // Find the doctor
    const doctor = await User.findOne({ email: "dr.smith@neurofy.com", role: "doctor" });
    
    if (!doctor) {
      console.log("Doctor dr.smith@neurofy.com not found. Creating doctor...");
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("doctor123", 10);
      
      const newDoctor = await User.create({
        name: "Dr. Emily Smith",
        email: "dr.smith@neurofy.com",
        password: hashedPassword,
        role: "doctor",
      });
      
      console.log("Created doctor: dr.smith@neurofy.com / doctor123");
    }

    // Find the patient
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
    const actualDoctor = doctor || await User.findOne({ email: "dr.smith@neurofy.com", role: "doctor" });
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
      
      console.log("Successfully assigned patient to doctor");
    }

    console.log("Assignment completed!");
    console.log("Doctor: dr.smith@neurofy.com / doctor123");
    console.log("Patient: patient@gmail.com / patient123");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Assignment failed:", error);
    process.exit(1);
  }
}

assignPatientToDoctor();
