import jwt from "jsonwebtoken";
import { env } from "../../config";
import { UserRole } from "../../models";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export class TokenService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  }
}
