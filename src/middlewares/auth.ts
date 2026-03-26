import { Request, Response, NextFunction } from "express";
import { TokenService, TokenPayload } from "../modules/auth/tokenService";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { message: "No token provided" },
      });
    }

    const token = authHeader.substring(7);
    const payload = TokenService.verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid token" },
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: { message: "Token expired" },
      });
    }

    return res.status(401).json({
      success: false,
      error: { message: "Authentication failed" },
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: "Access denied" },
      });
    }

    next();
  };
}
