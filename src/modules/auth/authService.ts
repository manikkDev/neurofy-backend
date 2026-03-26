import { User, PatientProfile, DoctorProfile, UserRole } from "../../models";
import { TokenService, TokenPayload } from "./tokenService";
import { SignupInput, LoginInput } from "./validation";

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async signup(data: SignupInput): Promise<AuthResponse> {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    if (data.role === "patient") {
      await PatientProfile.create({ userId: user._id });
    } else if (data.role === "doctor") {
      await DoctorProfile.create({ userId: user._id });
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: TokenService.generateAccessToken(tokenPayload),
      refreshToken: TokenService.generateRefreshToken(tokenPayload),
    };
  }

  static async login(data: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ email: data.email }).select("+password");

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken: TokenService.generateAccessToken(tokenPayload),
      refreshToken: TokenService.generateRefreshToken(tokenPayload),
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    let profile = null;
    if (user.role === "patient") {
      profile = await PatientProfile.findOne({ userId: user._id });
    } else if (user.role === "doctor") {
      profile = await DoctorProfile.findOne({ userId: user._id });
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      profile,
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = TokenService.verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new Error("Invalid refresh token");
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return TokenService.generateAccessToken(tokenPayload);
  }
}
