/**
 * Check Device Patient ID
 * 
 * Quick script to check which patient the device is assigned to
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { Device } from "../models/Device";
import { User } from "../models/User";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://manikraj8433:manikmongodb@cluster0.ullbbo0.mongodb.net/neurofy";

async function checkDevicePatient() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const device = await Device.findOne({ deviceId: "ESP32-001" });
    
    if (!device) {
      console.log("✗ Device ESP32-001 not found");
      process.exit(1);
    }

    console.log("\n=== Device Info ===");
    console.log("Device ID:", device.deviceId);
    console.log("Patient ID:", device.patientId);
    console.log("Label:", device.label);
    console.log("Pairing Status:", device.pairingStatus);

    const patient = await User.findById(device.patientId);
    
    if (patient) {
      console.log("\n=== Patient Info ===");
      console.log("Name:", patient.name);
      console.log("Email:", patient.email);
      console.log("Role:", patient.role);
      console.log("User ID:", patient._id.toString());
    } else {
      console.log("\n✗ Patient not found for this device!");
    }

    console.log("\n=== All Patients ===");
    const allPatients = await User.find({ role: "patient" }).select("name email");
    allPatients.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.email}) - ID: ${p._id.toString()}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkDevicePatient();
