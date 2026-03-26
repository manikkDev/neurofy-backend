import { Router } from "express";
import { PatientController } from "./patientController";
import { authenticate, requireRole } from "../../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("doctor"), PatientController.getPatientsList);
router.get("/:id", PatientController.getPatientDetails);
router.get("/:id/history", PatientController.getPatientHistory);
router.get("/:id/stats", PatientController.getPatientStats);

export default router;
