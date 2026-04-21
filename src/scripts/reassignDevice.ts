/**
 * Reassign Device to Different Patient
 * 
 * Reassigns ESP32-001 to patient@gmail.com
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { Device } from "../models/Device";
import { User } from "../models/User";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://manikraj8433:manikmongodb@cluster0.ullbbo0.mongodb.net/neurofy";

async function reassignDevice() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Find the new patient
    const newPatient = await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!newPatient) {
      console.log("✗ Patient patient@gmail.com not found");
      process.exit(1);
    }

    console.log("\n=== New Patient ===");
    console.log("Name:", newPatient.name);
    console.log("Email:", newPatient.email);
    console.log("User ID:", newPatient._id.toString());

    // Find and update the device
    const device = await Device.findOne({ deviceId: "ESP32-001" });
    
    if (!device) {
      console.log("\n✗ Device ESP32-001 not found");
      process.exit(1);
    }

    console.log("\n=== Device Before ===");
    console.log("Device ID:", device.deviceId);
    console.log("Old Patient ID:", device.patientId.toString());

    // Update the device
    device.patientId = newPatient._id;
    await device.save();

    console.log("\n=== Device After ===");
    console.log("Device ID:", device.deviceId);
    console.log("New Patient ID:", device.patientId.toString());

    console.log("\n✓ Device successfully reassigned to patient@gmail.com");
    console.log("\nYou can now:");
    console.log("1. Login to Neurofy with patient@gmail.com / patient123");
    console.log("2. Go to Device Settings");
    console.log("3. Configure WiFi for ESP32-001");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

reassignDevice();
