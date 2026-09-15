import type { GameApi } from "./types";
import { HttpGameApi } from "./httpGameApi";

/**
 * Normalizes the API URL:
 * - Trims whitespace and trailing slashes
 * - Automatically ensures '/api' path is present for backend game routes
 * - Falls back to localhost in DEV and relative '/api' in production
 */
export function normalizeApiUrl(raw?: string): string {
  if (!raw || typeof raw !== "string" || raw.trim().length === 0) {
    return import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
  }
  let trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed.endsWith("/api")) {
    trimmed = `${trimmed}/api`;
  }
  return trimmed;
}

export function resolveApiUrl(): string {
  return normalizeApiUrl(import.meta.env.VITE_API_URL);
}

export const api: HttpGameApi = new HttpGameApi(resolveApiUrl());

export { HttpGameApi };
