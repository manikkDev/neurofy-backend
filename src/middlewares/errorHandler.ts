import { Request, Response, NextFunction } from "express";
import { env } from "../config";

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}
