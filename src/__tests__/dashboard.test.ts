/**
 * Phase 7 – Dashboard Query Tests
 * 
 * Tests dashboard data retrieval and performance
 */
import request from "supertest";
import app from "../app";
import { User } from "../models/User";
import { TremorEpisode } from "../models/TremorEpisode";
import { Device } from "../models/Device";
import { TokenService } from "../modules/auth/tokenService";

describe("Dashboard Queries", () => {
  let patientToken: string;
  let doctorToken: string;
  let patientId: string;
  let doctorId: string;
  let deviceId: string;

  beforeAll(async () => {
    const patient = await User.create({
      name: "Dashboard Patient",
      email: "dashpatient@test.com",
      password: "hashedpassword",
      role: "patient",
    });
    patientId = patient._id.toString();
    patientToken = TokenService.generateAccessToken(patientId, "patient");

    const doctor = await User.create({
      name: "Dashboard Doctor",
      email: "dashdoctor@test.com",
      password: "hashedpassword",
      role: "doctor",
      assignedPatients: [patient._id],
    });
    doctorId = doctor._id.toString();
    doctorToken = TokenService.generateAccessToken(doctorId, "doctor");

    const device = await Device.create({
      deviceId: "TEST-DEVICE-001",
      patientId: patient._id,
      label: "Test Device",
      status: "active",
      pairingStatus: "paired",
    });
    deviceId = device._id.toString();

    await TremorEpisode.create([
      {
        patientId: patient._id,
        deviceId: device._id,
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        durationSec: 3600,
        maxSeverity: "MODERATE",
        episodeCount: 1,
        avgFrequencyHz: 5.2,
      },
      {
        patientId: patient._id,
        deviceId: device._id,
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        durationSec: 1800,
        maxSeverity: "SEVERE",
        episodeCount: 1,
        avgFrequencyHz: 7.8,
      },
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ["dashpatient@test.com", "dashdoctor@test.com"] } });
    await Device.deleteMany({ deviceId: "TEST-DEVICE-001" });
    await TremorEpisode.deleteMany({ deviceId });
  });

  describe("Patient Dashboard", () => {
    it("should retrieve patient dashboard summary", async () => {
      const res = await request(app)
        .get("/api/patients/me/dashboard")
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalEpisodes");
      expect(res.body.data).toHaveProperty("severityBreakdown");
      expect(res.body.data.totalEpisodes).toBeGreaterThan(0);
    });

    it("should retrieve patient stats efficiently", async () => {
      const start = Date.now();
      const res = await request(app)
        .get(`/api/patients/${patientId}/stats`)
        .set("Authorization", `Bearer ${patientToken}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Doctor Dashboard", () => {
    it("should retrieve doctor dashboard with assigned patients", async () => {
      const res = await request(app)
        .get("/api/doctors/dashboard")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("totalPatients");
      expect(res.body.data).toHaveProperty("activeAlerts");
    });

    it("should retrieve doctor patient list", async () => {
      const res = await request(app)
        .get("/api/doctors/patients")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should retrieve patient detail for assigned patient", async () => {
      const res = await request(app)
        .get(`/api/doctors/patients/${patientId}/detail`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("patient");
      expect(res.body.data).toHaveProperty("stats");
    });
  });

  describe("Health Endpoints", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
    });

    it("should return readiness status", async () => {
      const res = await request(app).get("/api/readiness");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ready");
    });
  });
});
