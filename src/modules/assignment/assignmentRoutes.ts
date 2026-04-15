/**
 * PROMPT 2 - Assignment management routes
 * 
 * Allows assigning patients to doctors
 * For MVP, admin can assign via these routes
 * Future: Add admin role middleware
 */
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../../middlewares/auth";
import { PatientProfile } from "../../models/PatientProfile";
import { User } from "../../models/User";
import { Types } from "mongoose";

const router = Router();

// For now, doctors can assign themselves to patients (simplified for MVP)
// In production, this should be admin-only or require patient consent
router.use(authenticate);

/**
 * POST /api/assignment/assign
 * Assign a doctor to a patient
 * Body: { patientId: string, doctorId: string }
 */
router.post("/assign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, doctorId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({
        success: false,
        error: { message: "patientId and doctorId are required" },
      });
    }

    // Validate IDs
    if (!Types.ObjectId.isValid(patientId) || !Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid patient or doctor ID" },
      });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== "patient") {
      return res.status(404).json({
        success: false,
        error: { message: "Patient not found" },
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({
        success: false,
        error: { message: "Doctor not found" },
      });
    }

    // Update patient profile with assigned doctor
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: patientId },
      { assignedDoctorId: doctorId },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { message: "Patient profile not found" },
      });
    }

    res.json({
      success: true,
      data: {
        patientId,
        doctorId,
        message: `Patient ${patient.name} assigned to Dr. ${doctor.name}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assignment/unassign
 * Remove doctor assignment from a patient
 * Body: { patientId: string }
 */
router.post("/unassign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: { message: "patientId is required" },
      });
    }

    if (!Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid patient ID" },
      });
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: patientId },
      { $unset: { assignedDoctorId: 1 } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { message: "Patient profile not found" },
      });
    }

    res.json({
      success: true,
      data: { message: "Doctor assignment removed" },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assignment/patient/:patientId
 * Get assignment info for a patient
 */
router.get("/patient/:patientId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    if (!Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid patient ID" },
      });
    }

    const profile = await PatientProfile.findOne({ userId: patientId })
      .populate("assignedDoctorId", "name email")
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { message: "Patient profile not found" },
      });
    }

    res.json({
      success: true,
      data: {
        patientId,
        assignedDoctor: profile.assignedDoctorId || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
