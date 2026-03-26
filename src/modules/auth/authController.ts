import { Request, Response, NextFunction } from "express";
import { AuthService } from "./authService";
import { signupSchema, loginSchema } from "./validation";
import { ZodError } from "zod";

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = signupSchema.parse(req.body);
      const result = await AuthService.signup(validatedData);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            details: error.errors,
          },
        });
      }

      if (error.message === "Email already registered") {
        return res.status(409).json({
          success: false,
          error: { message: error.message },
        });
      }

      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await AuthService.login(validatedData);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            details: error.errors,
          },
        });
      }

      if (
        error.message === "Invalid email or password" ||
        error.message === "Account is deactivated"
      ) {
        return res.status(401).json({
          success: false,
          error: { message: error.message },
        });
      }

      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: "Not authenticated" },
        });
      }

      const user = await AuthService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      if (error.message === "User not found") {
        return res.status(404).json({
          success: false,
          error: { message: error.message },
        });
      }

      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: "Refresh token is required" },
        });
      }

      const accessToken = await AuthService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error: any) {
      if (error.message === "Invalid refresh token" || error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: { message: "Invalid or expired refresh token" },
        });
      }

      next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      data: { message: "Logged out successfully" },
    });
  }
}
