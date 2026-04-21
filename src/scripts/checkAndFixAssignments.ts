import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import { User, PatientProfile } from "../models";

async function checkAndFixAssignments() {
  try {
    console.log("[Check] Checking patient assignments...");

    await connectDatabase();

    // Find the current logged-in doctor
    const doctor = await User.findOne({ email: "doctor@gmail.com", role: "doctor" });
    
    if (!doctor) {
      console.log("ERROR: Doctor doctor@gmail.com not found!");
      process.exit(1);
    }
    
    console.log("Doctor found:", doctor._id.toString(), doctor.email);

    // Check current assignments
    const assignments = await PatientProfile.find({ assignedDoctorId: doctor._id }).lean();
    console.log("Current assignments:", assignments.length);
    
    if (assignments.length === 0) {
      console.log("No patients assigned! Reassigning patients...");
      
      // Find all patients
      const patients = await User.find({ role: "patient" }).select("_id email name").lean();
      console.log("Found patients:", patients.length);
      
      for (const patient of patients) {
        // Check if already has a profile
        let profile = await PatientProfile.findOne({ userId: patient._id }).lean();
        
        if (!profile) {
          // Create profile with assignment
          await PatientProfile.create({
            userId: patient._id,
            assignedDoctorId: doctor._id,
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
          });
          console.log(`Created profile and assigned: ${patient.email}`);
        } else {
          // Update assignment
          await PatientProfile.updateOne(
            { userId: patient._id },
            { 
              assignedDoctorId: doctor._id,
              assignedAt: new Date(),
            }
          );
          console.log(`Updated assignment: ${patient.email}`);
        }
      }
      
      console.log("\n✅ All patients reassigned to doctor@gmail.com");
    } else {
      console.log("\nPatients already assigned:");
      for (const assignment of assignments) {
        const patient = await User.findById(assignment.userId).select("email name").lean();
        console.log(`  - ${patient?.name} (${patient?.email})`);
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAndFixAssignments();
