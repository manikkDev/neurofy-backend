/**
 * Phase 7 – Security middleware
 * 
 * Rate limiting, request validation, and security headers
 */
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

// Rate limiters for different route categories
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { success: false, error: { message: "Too many authentication attempts. Please try again later." } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, error: { message: "Too many requests. Please slow down." } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for sensitive operations
  message: { success: false, error: { message: "Rate limit exceeded for this operation." } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sanitize MongoDB query operators from user input
export function sanitizeQuery(req: Request, res: Response, next: NextFunction) {
  const sanitize = (obj: any): any => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (key.startsWith("$")) {
          delete obj[key];
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.query) req.query = sanitize(req.query);
  if (req.body) req.body = sanitize(req.body);
  if (req.params) req.params = sanitize(req.params);

  next();
}

// Validate pagination parameters
export function validatePagination(req: Request, res: Response, next: NextFunction) {
  const { limit, skip, page } = req.query;

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid limit parameter. Must be between 1 and 100." },
      });
    }
  }

  if (skip !== undefined) {
    const skipNum = parseInt(skip as string, 10);
    if (isNaN(skipNum) || skipNum < 0) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid skip parameter. Must be non-negative." },
      });
    }
  }

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid page parameter. Must be positive." },
      });
    }
  }

  next();
}

// Validate date range parameters
export function validateDateRange(req: Request, res: Response, next: NextFunction) {
  const { startDate, endDate, from, to } = req.query;

  const validateDate = (dateStr: string, fieldName: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return `Invalid ${fieldName}. Must be a valid ISO date string.`;
    }
    return null;
  };

  if (startDate) {
    const error = validateDate(startDate as string, "startDate");
    if (error) {
      return res.status(400).json({ success: false, error: { message: error } });
    }
  }

  if (endDate) {
    const error = validateDate(endDate as string, "endDate");
    if (error) {
      return res.status(400).json({ success: false, error: { message: error } });
    }
  }

  if (from) {
    const error = validateDate(from as string, "from");
    if (error) {
      return res.status(400).json({ success: false, error: { message: error } });
    }
  }

  if (to) {
    const error = validateDate(to as string, "to");
    if (error) {
      return res.status(400).json({ success: false, error: { message: error } });
    }
  }

  // Validate range logic
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: { message: "startDate must be before endDate." },
      });
    }
  }

  if (from && to) {
    const start = new Date(from as string);
    const end = new Date(to as string);
    if (start > end) {
      return res.status(400).json({
        success: false,
        error: { message: "from must be before to." },
      });
    }
  }

  next();
}

// Validate MongoDB ObjectId format
export function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid ${paramName}. Must be a valid MongoDB ObjectId.` },
      });
    }
    next();
  };
}
