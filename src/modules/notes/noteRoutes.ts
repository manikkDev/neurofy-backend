import { Router } from "express";
import { NoteController } from "./noteController";
import { authenticate, requireRole } from "../../middlewares/auth";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("doctor"), NoteController.createNote);
router.get("/", NoteController.getNotes);
router.get("/:id", NoteController.getNoteById);
router.put("/:id", requireRole("doctor"), NoteController.updateNote);
router.delete("/:id", requireRole("doctor"), NoteController.deleteNote);

export default router;
