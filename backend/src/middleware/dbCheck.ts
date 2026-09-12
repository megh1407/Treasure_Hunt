import { Request, Response, NextFunction } from "express";
import { isDatabaseConnected } from "../config/db";
import type { ApiResponse } from "../types";

/**
 * Middleware ensuring PostgreSQL database is reachable via Prisma before running queries.
 * Returns 503 immediately if the database is unreachable, preventing hanging requests.
 */
export async function requireDatabase(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  const connected = await isDatabaseConnected();
  if (!connected) {
    res.status(503).json({
      success: false,
      error:
        "Database unavailable: PostgreSQL is not currently reachable. Player operations require an active database.",
    });
    return;
  }
  next();
}
