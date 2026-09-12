import express from "express";
import cors from "cors";
import { env } from "./config/env";
import apiRouter from "./routes";
import healthRoutes from "./routes/health.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

// Enable CORS for frontend clients
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGINS.includes(origin) || env.NODE_ENV === "development") {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
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
