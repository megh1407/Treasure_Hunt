import { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../types";

// In-memory set of active admin session tokens
export const activeAdminTokens = new Map<string, { createdAt: number }>();

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function requireAdminAuth(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Admin authentication token is required",
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  const session = activeAdminTokens.get(token);

  if (!session) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or expired admin session token",
    });
    return;
  }

  // Check TTL
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    activeAdminTokens.delete(token);
    res.status(401).json({
      success: false,
      error: "Unauthorized: Admin session expired",
    });
    return;
  }

  next();
}
