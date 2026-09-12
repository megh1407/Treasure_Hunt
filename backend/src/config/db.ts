import { prisma } from "../lib/prisma";

export type DatabaseConnectionState = "connected" | "disconnected";

/**
 * Actively checks whether the PostgreSQL database is reachable via Prisma.
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[Database] Health probe check error:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Connects to PostgreSQL using Prisma at server startup.
 * Non-blocking: logs a warning if database is unreachable and does not crash the server.
 */
export async function connectDatabase(): Promise<boolean> {
  try {
    console.log("[Database] Connecting to PostgreSQL via Prisma...");
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("[Database] PostgreSQL connected successfully.");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[Database] Notice: PostgreSQL is not currently reachable (${message}).\n` +
        `[Database] The server will run in standalone mode. Health checks will report DB status.`
    );
    return false;
  }
}

/**
 * Disconnects Prisma client on server shutdown.
 */
export async function closeDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log("[Database] Prisma disconnected cleanly.");
  } catch (error) {
    console.error("[Database] Error during Prisma disconnect:", error);
  }
}
