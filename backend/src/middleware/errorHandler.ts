import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import type { ApiResponse } from "../types";

/**
 * 404 Not Found handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response<ApiResponse>) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global application error handling middleware.
 * Sanitizes stack traces in production environments.
 */
export function errorHandler(
  err: Error & { status?: number; code?: string | number },
  _req: Request,
  res: Response<ApiResponse & { stack?: string }>,
  _next: NextFunction
) {
  let statusCode = err.status || (err.name === "ValidationError" ? 400 : 500);
  let errorMessage = err.message || "An unexpected internal server error occurred";

  // Handle known Prisma database errors gracefully
  if (err.code === "P2002") {
    statusCode = 409;
    errorMessage = "A record with this unique value already exists";
  } else if (err.code === "P2024") {
    statusCode = 503;
    errorMessage = "Database connection pool is busy, please retry shortly";
  } else if (err.code === "P2028") {
    statusCode = 503;
    errorMessage = "Database transaction timed out, please retry";
  } else if (statusCode === 500 && env.NODE_ENV === "production") {
    // Avoid leaking internal SQL/stack traces to external clients in production
    errorMessage = "An internal server error occurred. Please try again later.";
  }

  // Avoid leaking internal traces in production
  const responsePayload: ApiResponse & { stack?: string } = {
    success: false,
    error: errorMessage,
  };

  if (env.NODE_ENV !== "production" && err.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
}
