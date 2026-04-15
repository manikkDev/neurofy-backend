import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";

/**
 * Shared validation schemas and middleware for common patterns
 */

// ObjectId validation
export const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: "Invalid ObjectId format" }
);

// Patient ID param validation
export const patientIdParamSchema = z.object({
  patientId: objectIdSchema,
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

// Note validation schemas
export const createNoteSchema = z.object({
  patientId: objectIdSchema,
  content: z.string().min(1, "Note content is required").max(5000),
  diagnosis: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  diagnosis: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
});

// Report validation schemas
export const createReportSchema = z.object({
  patientId: objectIdSchema,
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().min(1, "Summary is required").max(10000),
  status: z.enum(["draft", "completed", "archived"]).default("completed"),
});

// Appointment validation schemas
export const createAppointmentSchema = z.object({
  doctorId: objectIdSchema,
  scheduledAt: z.string().datetime("Invalid date format"),
  reason: z.string().max(500).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  newDate: z.string().datetime("Invalid date format"),
  responseNote: z.string().max(500).optional(),
});

/**
 * Generic validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to find the data ("body", "params", "query")
 */
export function validate(
  schema: z.ZodSchema,
  source: "body" | "params" | "query" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation failed",
            details: error.issues,
          },
        });
      }
      next(error);
    }
  };
}
