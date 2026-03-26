import { Request, Response, NextFunction } from "express";
import { PatientService } from "./patientService";

export class PatientController {
  static async getPatientsList(req: Request, res: Response, next: NextFunction) {
    try {
      const patients = await PatientService.getPatientsList();

      res.status(200).json({
        success: true,
        data: patients,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await PatientService.getPatientDetails(req.params.id);

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error: any) {
      if (error.message === "Patient not found") {
        return res.status(404).json({
          success: false,
          error: { message: error.message },
        });
      }
      next(error);
    }
  }

  static async getPatientHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const patientId = req.params.id || userId;

      if (role === "patient" && patientId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Access denied" },
        });
      }

      const history = await PatientService.getPatientHistory(patientId!);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const patientId = req.params.id || userId;

      if (role === "patient" && patientId !== userId) {
        return res.status(403).json({
          success: false,
          error: { message: "Access denied" },
        });
      }

      const stats = await PatientService.getPatientStats(patientId!);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
