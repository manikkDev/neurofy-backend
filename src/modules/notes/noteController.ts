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
        notes = patientId
          ? await NoteService.getNotesByPatient(patientId as string)
          : await NoteService.getNotesByDoctor(userId);
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
