import { Request, Response } from "express";
import { env } from "../config/env";
import { isDatabaseConnected } from "../config/db";
import type { ApiResponse, HealthResponseDTO } from "../types";

/**
 * Controller for GET /api/health
 * Reports server health and live PostgreSQL database connection status.
 */
export async function getHealth(_req: Request, res: Response<ApiResponse<HealthResponseDTO>>) {
  const connected = await isDatabaseConnected();

  const status = connected ? 200 : 503;
  res.status(status).json({
    success: connected,
    data: {
      status: connected ? "ok" : "degraded",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      database: {
        connected,
        status: connected ? "connected" : "disconnected",
      },
    },
  });
}
