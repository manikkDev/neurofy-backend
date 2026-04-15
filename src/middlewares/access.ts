import { Request, Response, NextFunction } from "express";
import { PatientProfile } from "../models/PatientProfile";
import { Types } from "mongoose";

/**
 * Middleware to enforce patient data ownership or doctor assignment
 * 
 * Usage: Apply to routes that access patient-specific data
 * - Patients can only access their own data
 * - Doctors can only access data for patients assigned to them
 * 
 * Expects req.params.id or req.params.patientId to contain the patient user ID
 */
export function requirePatientAccess(paramName: "id" | "patientId" = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const targetPatientId = req.params[paramName];

      if (!userId || !role) {
        return res.status(401).json({
          success: false,
          error: { message: "Not authenticated" },
        });
      }

      if (!targetPatientId) {
        return res.status(400).json({
          success: false,
          error: { message: "Patient ID required" },
        });
      }

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(targetPatientId)) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid patient ID format" },
        });
      }

      // Patient accessing own data
      if (role === "patient") {
        if (targetPatientId !== userId) {
          return res.status(403).json({
            success: false,
            error: { message: "Access denied - cannot access other patient's data" },
          });
        }
        return next();
      }

      // Doctor accessing assigned patient data
      if (role === "doctor") {
        const patientProfile = await PatientProfile.findOne({ userId: targetPatientId });
        
        if (!patientProfile) {
          return res.status(404).json({
            success: false,
            error: { message: "Patient not found" },
          });
        }

        // Check if doctor is assigned to this patient
        if (
          !patientProfile.assignedDoctorId ||
          patientProfile.assignedDoctorId.toString() !== userId
        ) {
          return res.status(403).json({
            success: false,
            error: { message: "Access denied - patient not assigned to you" },
          });
        }

        return next();
      }

      // Unknown role
      return res.status(403).json({
        success: false,
        error: { message: "Access denied" },
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper function to check if a doctor is assigned to a patient
 * @param doctorId - The doctor's user ID
 * @param patientId - The patient's user ID
 * @returns true if doctor is assigned to patient, false otherwise
 */
export async function isAssignedDoctor(
  doctorId: string,
  patientId: string
): Promise<boolean> {
  try {
    const patientProfile = await PatientProfile.findOne({ userId: patientId });
    if (!patientProfile || !patientProfile.assignedDoctorId) {
      return false;
    }
    return patientProfile.assignedDoctorId.toString() === doctorId;
  } catch {
    return false;
  }
}

/**
 * Helper function to get all patients assigned to a doctor
 * @param doctorId - The doctor's user ID
 * @returns Array of patient user IDs
 */
export async function getAssignedPatients(doctorId: string): Promise<string[]> {
  try {
    const profiles = await PatientProfile.find({
      assignedDoctorId: doctorId,
    }).select("userId");
    
    return profiles.map((p) => p.userId.toString());
  } catch {
    return [];
  }
}
