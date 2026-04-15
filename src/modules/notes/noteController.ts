import { Request, Response, NextFunction } from "express";
import { NoteService } from "./noteService";

export class NoteController {
  static async createNote(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await NoteService.createNote(req.body);

      res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.query;
      const userId = req.user?.userId;
      const role = req.user?.role;

      if (!userId || !role) {
        return res.status(401).json({
          success: false,
          error: { message: "Not authenticated" },
        });
      }

      let notes;
      if (role === "doctor") {
        if (patientId) {
          // Verify doctor is assigned to this patient
          const { isAssignedDoctor } = await import("../../middlewares/access");
          const isAssigned = await isAssignedDoctor(userId, patientId as string);
          if (!isAssigned) {
            return res.status(403).json({
              success: false,
              error: { message: "Access denied - patient not assigned to you" },
            });
          }
          notes = await NoteService.getNotesByPatient(patientId as string);
        } else {
          notes = await NoteService.getNotesByDoctor(userId);
        }
      } else {
        notes = await NoteService.getNotesByPatient(userId);
      }

      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNoteById(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await NoteService.getNoteById(req.params.id);

      if (!note) {
        return res.status(404).json({
          success: false,
          error: { message: "Note not found" },
        });
      }

      const userId = req.user?.userId;
      const role = req.user?.role;

      // Verify access: patient owns note OR doctor created note OR doctor is assigned
      if (role === "patient") {
        if (note.patientId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            error: { message: "Access denied" },
          });
        }
        // Patient can only see non-private notes
        if (note.isPrivate) {
          return res.status(403).json({
            success: false,
            error: { message: "This note is private" },
          });
        }
      } else if (role === "doctor") {
        // Doctor can see notes they created OR for assigned patients
        if (note.doctorId.toString() !== userId) {
          const { isAssignedDoctor } = await import("../../middlewares/access");
          const isAssigned = await isAssignedDoctor(userId!, note.patientId.toString());
          if (!isAssigned) {
            return res.status(403).json({
              success: false,
              error: { message: "Access denied - patient not assigned to you" },
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateNote(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await NoteService.updateNote(req.params.id, req.body);

      if (!note) {
        return res.status(404).json({
          success: false,
          error: { message: "Note not found" },
        });
      }

      res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNote(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await NoteService.deleteNote(req.params.id);

      if (!note) {
        return res.status(404).json({
          success: false,
          error: { message: "Note not found" },
        });
      }

      res.status(200).json({
        success: true,
        data: { message: "Note deleted successfully" },
      });
    } catch (error) {
      next(error);
    }
  }
}
