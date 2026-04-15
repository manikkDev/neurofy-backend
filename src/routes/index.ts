import { Router } from "express";
import healthRouter from "./health";
import authRouter from "../modules/auth/authRoutes";
import appointmentRouter from "../modules/appointments/appointmentRoutes";
import reportRouter from "../modules/reports/reportRoutes";
import noteRouter from "../modules/notes/noteRoutes";
import notificationRouter from "../modules/notifications/notificationRoutes";
import patientMeRouter from "../modules/patients/patientMeRoutes";
import patientRouter from "../modules/patients/patientRoutes";
import doctorRouter from "../modules/doctors/doctorRoutes";
import serialDebugRouter from "../modules/serial/serialDebugRoutes";
import assignmentRouter from "../modules/assignment/assignmentRoutes";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/appointments", appointmentRouter);
router.use("/reports", reportRouter);
router.use("/notes", noteRouter);
router.use("/notifications", notificationRouter);
router.use("/patients/me", patientMeRouter);
router.use("/patients", patientRouter);
router.use("/doctors", doctorRouter);
router.use("/assignment", assignmentRouter);
router.use("/debug", serialDebugRouter);

export default router;
