import dotenv from "dotenv";
import path from "path";

// Load .env from process.cwd() or backend root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface EnvConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  DIRECT_URL: string;
  CORS_ORIGINS: string[];
  ADMIN_PASSWORD: string;
}

const rawOrigins = process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174";
const origins = rawOrigins
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: (process.env.NODE_ENV as EnvConfig["NODE_ENV"]) || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  CORS_ORIGINS: origins.length > 0 ? origins : ["http://localhost:5173", "http://localhost:5174"],
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Updates2K26",
};
