import type { GameApi } from "./types";
import { HttpGameApi } from "./httpGameApi";

/**
 * Production-ready GameApi factory and instance exporter.
 *
 * Resolves API URL dynamically:
 * - Uses VITE_API_URL if provided
 * - Falls back to relative "/api" in production (standard for reverse-proxy & cloud deployments)
 * - Falls back to "http://localhost:5000/api" in local development
 */
function resolveApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  return import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
}

export const api: HttpGameApi = new HttpGameApi(resolveApiUrl());

export { HttpGameApi };
