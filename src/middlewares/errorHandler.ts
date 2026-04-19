import { Request, Response, NextFunction } from "express";
import { env } from "../config";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

// Structured logging helper
function logError(err: AppError, req: Request) {
  const timestamp = new Date().toISOString();
  const { method, originalUrl, ip, headers } = req;
  const userId = (req as any).user?.userId || "anonymous";

  const logEntry = {
    timestamp,
    level: err.statusCode && err.statusCode < 500 ? "warn" : "error",
    statusCode: err.statusCode || 500,
    message: err.message,
    code: err.code,
    method,
    url: originalUrl,
    ip,
    userId,
    userAgent: headers["user-agent"],
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  };

  console.error("[ERROR]", JSON.stringify(logEntry, null, 2));
}

// Safe error message for production
function getSafeErrorMessage(err: AppError): string {
  if (env.NODE_ENV === "development") {
    return err.message || "Internal Server Error";
  }

  // In production, only expose safe messages for client errors
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return err.message || "Bad Request";
  }

  // Generic message for server errors to prevent data leakage
  return "An unexpected error occurred. Please try again later.";
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const safeMessage = getSafeErrorMessage(err);

  logError(err, req);

  res.status(statusCode).json({
    success: false,
    error: {
      message: safeMessage,
      code: err.code,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}
