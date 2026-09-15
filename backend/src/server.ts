import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { env } from "./config/env";
import { app } from "./app";
import { closeDatabase, connectDatabase } from "./config/db";

async function bootstrap() {
  // Connect and test PostgreSQL connection via Prisma (non-blocking)
  await connectDatabase();

  const host = env.HOST;
  const port = env.PORT;

  const server = app.listen(port, host, () => {
    console.log(`====================================================`);
    console.log(` Core Quest Finder Backend Server (PostgreSQL)      `);
    console.log(`====================================================`);
    console.log(` Environment : ${env.NODE_ENV}`);
    console.log(` Host        : ${host}`);
    console.log(` Port        : ${port}`);
    console.log(` Health check: http://${host === "0.0.0.0" ? "localhost" : host}:${port}/health`);
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
