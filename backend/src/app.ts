import express from "express";
import cors from "cors";
import { env } from "./config/env";
import apiRouter from "./routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

// Trust reverse proxy headers when running on Render or behind cloud load balancers
app.set("trust proxy", 1);

// Apply baseline API security headers. Vercel applies the frontend CSP separately.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  if (env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
});

// Enable CORS for frontend clients with strict origin validation
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman, health probes)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (env.CORS_ORIGINS.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Preserve local development origins
      if (
        env.NODE_ENV === "development" &&
        (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("http://10."))
      ) {
        return callback(null, true);
      }

      const err = new Error(`Origin ${origin} not allowed by CORS`);
      (err as any).status = 403;
      return callback(err);
    },
    credentials: true,
  })
);

// Body parsing middleware with production payload size limits (100kb)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Root API status route for browser checks and quick health validation
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Core Quest Finder API is running",
    data: {
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Root health check endpoint for cloud load balancers / orchestrators
app.use("/health", healthRoutes);

// Mount API routes
app.use("/api", apiRouter);

// Fallback for unmatched routes
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);
