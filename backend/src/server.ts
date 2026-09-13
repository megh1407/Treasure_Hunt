import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { env } from "./config/env";
import { app } from "./app";
import { closeDatabase, connectDatabase } from "./config/db";

async function bootstrap() {
  // Connect and test PostgreSQL connection via Prisma (non-blocking)
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`====================================================`);
    console.log(` Core Quest Finder Backend Server (PostgreSQL)      `);
    console.log(`====================================================`);
    console.log(` Environment : ${env.NODE_ENV}`);
    console.log(` Port        : ${env.PORT}`);
    console.log(` Health check: http://localhost:${env.PORT}/api/health`);
    console.log(` CORS origins: ${env.CORS_ORIGINS.join(", ")}`);
    console.log(`====================================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log("[Server] HTTP server closed.");
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Server] Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[Server] Uncaught Exception:", error);
  });
}

bootstrap().catch((err) => {
  console.error("[Server] Fatal error during startup:", err);
  process.exit(1);
});
