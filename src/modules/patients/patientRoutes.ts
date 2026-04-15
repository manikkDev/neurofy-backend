import { Router } from "express";
import { PatientController } from "./patientController";
import { authenticate, requireRole } from "../../middlewares/auth";
import { requirePatientAccess } from "../../middlewares/access";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("doctor"), PatientController.getPatientsList);
router.get("/:id", requirePatientAccess, PatientController.getPatientDetails);
router.get("/:id/history", requirePatientAccess, PatientController.getPatientHistory);
router.get("/:id/stats", requirePatientAccess, PatientController.getPatientStats);

export default router;
