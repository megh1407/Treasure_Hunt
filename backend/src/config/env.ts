import dotenv from "dotenv";
import path from "path";

// Load .env from process.cwd() or backend root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface EnvConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  DIRECT_URL: string;
  CORS_ORIGINS: string[];
  ADMIN_PASSWORD: string;
}

const rawOrigins =
  process.env.CORS_ORIGIN ||
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174";

const parsedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter((o) => Boolean(o) && o !== "*"); // Reject wildcard with credentials

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  HOST: process.env.HOST || "0.0.0.0",
  NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  CORS_ORIGINS:
    parsedOrigins.length > 0
      ? parsedOrigins
      : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Updates2K26",
};
