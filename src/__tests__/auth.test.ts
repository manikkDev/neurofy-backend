/**
 * Phase 7 – Auth & RBAC Tests
 * 
 * Tests authentication flows and role-based access control
 */
import request from "supertest";
import app from "../app";
import { User } from "../models/User";
import { TokenService } from "../modules/auth/tokenService";

describe("Authentication & RBAC", () => {
  let patientToken: string;
  let doctorToken: string;
  let patientId: string;
  let doctorId: string;

  beforeAll(async () => {
    const patient = await User.create({
      name: "Test Patient",
      email: "patient@test.com",
      password: "hashedpassword",
      role: "patient",
    });
    patientId = patient._id.toString();
    patientToken = TokenService.generateAccessToken(patientId, "patient");

    const doctor = await User.create({
      name: "Test Doctor",
      email: "doctor@test.com",
      password: "hashedpassword",
      role: "doctor",
    });
    doctorId = doctor._id.toString();
    doctorToken = TokenService.generateAccessToken(doctorId, "doctor");
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ["patient@test.com", "doctor@test.com"] } });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user with valid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("patient@test.com");
    });

    it("should reject request without token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject request with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Role-based access control", () => {
    it("should allow doctor to access doctor dashboard", async () => {
      const res = await request(app)
        .get("/api/doctors/dashboard")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should deny patient access to doctor dashboard", async () => {
      const res = await request(app)
        .get("/api/doctors/dashboard")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow patient to access own dashboard", async () => {
      const res = await request(app)
        .get("/api/patients/me/dashboard")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Input validation", () => {
    it("should reject invalid ObjectId in params", async () => {
      const res = await request(app)
        .get("/api/doctors/patients/invalid-id/detail")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("ObjectId");
    });

    it("should reject excessively long note content", async () => {
      const res = await request(app)
        .post(`/api/doctors/patients/${patientId}/notes`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          content: "a".repeat(6000),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("too long");
    });
  });

  describe("Rate limiting", () => {
    it("should rate limit auth endpoints", async () => {
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .post("/api/auth/login")
          .send({ email: "test@test.com", password: "password" })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});
