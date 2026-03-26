import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  CLIENT_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  DEVICE_API_KEY: string;
  // Phase 3 — Serial ingestion
  SERIAL_ENABLED: boolean;
  SERIAL_PORT: string;
  SERIAL_BAUD_RATE: number;
  DEVICE_ID_DEFAULT: string;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(getEnvVar("PORT", "5000"), 10),
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  MONGODB_URI: getEnvVar("MONGODB_URI", "mongodb://localhost:27017/neurofy"),
  CLIENT_URL: getEnvVar("CLIENT_URL", "http://localhost:5173"),
  JWT_ACCESS_SECRET: getEnvVar("JWT_ACCESS_SECRET", "dev_access_secret"),
  JWT_REFRESH_SECRET: getEnvVar("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  JWT_ACCESS_EXPIRY: getEnvVar("JWT_ACCESS_EXPIRY", "15m"),
  JWT_REFRESH_EXPIRY: getEnvVar("JWT_REFRESH_EXPIRY", "7d"),
  DEVICE_API_KEY: getEnvVar("DEVICE_API_KEY", "dev_device_key"),
  // Phase 3 — Serial ingestion
  SERIAL_ENABLED: getEnvVar("SERIAL_ENABLED", "true") === "true",
  SERIAL_PORT: getEnvVar("SERIAL_PORT", "COM4"),
  SERIAL_BAUD_RATE: parseInt(getEnvVar("SERIAL_BAUD_RATE", "115200"), 10),
  DEVICE_ID_DEFAULT: getEnvVar("DEVICE_ID_DEFAULT", "ESP32-001"),
};
