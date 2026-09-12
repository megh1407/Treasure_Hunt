import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { activeAdminTokens } from "../middleware/admin.middleware";
import type {
  ApiResponse,
  AdminLoginDTO,
  AdminLoginResponseDTO,
  AdminStatsDTO,
  AdminLeaderboardEntryDTO,
} from "../types";

/**
 * Verifies admin password and issues an authoritative admin session token.
 * POST /api/admin/login
 */
export async function adminLogin(
  req: Request<{}, {}, AdminLoginDTO>,
  res: Response<ApiResponse<AdminLoginResponseDTO>>,
  next: NextFunction
) {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string") {
      res.status(400).json({
        success: false,
        error: "Password is required",
      });
      return;
    }

    const expected = env.ADMIN_PASSWORD || "Updates2K26";
    // Constant time comparison to prevent timing attacks
    const bufferA = Buffer.from(password);
    const bufferB = Buffer.from(expected);

    const isMatch =
      bufferA.length === bufferB.length &&
      crypto.timingSafeEqual(bufferA, bufferB);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid administrative password",
      });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    activeAdminTokens.set(token, { createdAt: Date.now() });

    res.status(200).json({
      success: true,
      data: {
        token,
        message: "Admin session authenticated successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Invalidates current admin session token.
 * POST /api/admin/logout
 */
export async function adminLogout(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      activeAdminTokens.delete(token);
    }

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves aggregate operational statistics for the admin control room.
 * GET /api/admin/stats
 */
export async function getAdminStats(
  _req: Request,
  res: Response<ApiResponse<AdminStatsDTO>>,
  next: NextFunction
) {
  try {
    const [totalPlayers, currentlyPlaying, completedAllLevels] = await Promise.all([
      prisma.player.count(),
      prisma.gameSession.count({
        where: {
          isActive: true,
          player: {
            status: { not: "COMPLETED" },
          },
        },
      }),
      prisma.player.count({
        where: {
          status: "COMPLETED",
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPlayers,
        currentlyPlaying,
        completedAllLevels,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves full authoritative leaderboard for organizers.
 * Ranked by:
 * 1. Highest completed level (10 down to 1)
 * 2. Fastest authoritative time within that level
 * 3. Tie-breaker: earlier registration timestamp
 * GET /api/admin/leaderboard
 */
export async function getAdminLeaderboard(
  _req: Request,
  res: Response<ApiResponse<AdminLeaderboardEntryDTO[]>>,
  next: NextFunction
) {
  try {
    const players = await prisma.player.findMany({
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    const now = Date.now();
    const rows = players.map((p) => {
      const isCompleted = p.status === "COMPLETED";
      let gameTimeSeconds = p.gameTimeSeconds ?? 0;

      if (!isCompleted && p.sessions.length > 0 && p.sessions[0]) {
        const session = p.sessions[0];
        let additionalPause = 0;
        if (session.isPaused && session.pausedAt) {
          additionalPause = Math.max(0, Math.floor((now - session.pausedAt.getTime()) / 1000));
        }
        const totalPaused = (session.totalPausedSeconds ?? 0) + additionalPause;
        const totalElapsed = Math.max(0, Math.floor((now - session.startedAt.getTime()) / 1000));
        const liveNetGameTime = Math.max(0, totalElapsed - totalPaused);
        gameTimeSeconds = Math.max(gameTimeSeconds, liveNetGameTime);
      }

      const penaltySeconds = p.penaltySeconds ?? 0;
      const finalTimeSeconds = gameTimeSeconds + penaltySeconds;

      return {
        playerId: p.id,
        playerName: p.playerName,
        enrollmentNumber: p.enrollmentNumber,
        email: p.email,
        contactNumber: p.contactNumber ?? null,
        branch: p.branch ?? p.team,
        team: p.team,
        currentLevel: p.currentLevel,
        gameTimeSeconds,
        penaltySeconds,
        finalTimeSeconds,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // Sort by highest completed level first (Level 10 down to 1), then fastest time
    rows.sort((a, b) => {
      const aCompleted = a.status === "COMPLETED";
      const bCompleted = b.status === "COMPLETED";

      // 1. Level 10 completed players first
      if (aCompleted && !bCompleted) return -1;
      if (!aCompleted && bCompleted) return 1;

      if (aCompleted && bCompleted) {
        if (a.finalTimeSeconds !== b.finalTimeSeconds) {
          return a.finalTimeSeconds - b.finalTimeSeconds;
        }
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      }

      // Both incomplete: higher currentLevel first
      if (a.currentLevel !== b.currentLevel) {
        return b.currentLevel - a.currentLevel;
      }

      // Within same level: lowest finalTimeSeconds first
      if (a.finalTimeSeconds !== b.finalTimeSeconds) {
        return a.finalTimeSeconds - b.finalTimeSeconds;
      }

      // Deterministic tie-breaker: earlier creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const ranked: AdminLeaderboardEntryDTO[] = rows.map((r, idx) => ({
      rank: idx + 1,
      playerId: r.playerId,
      playerName: r.playerName,
      enrollmentNumber: r.enrollmentNumber,
      email: r.email,
      contactNumber: r.contactNumber,
      branch: r.branch,
      team: r.team,
      currentLevel: r.currentLevel,
      gameTimeSeconds: r.gameTimeSeconds,
      penaltySeconds: r.penaltySeconds,
      finalTimeSeconds: r.finalTimeSeconds,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: ranked,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manually deletes a player and transactionally cascades deletion to all
 * associated sessions and progress records.
 * DELETE /api/admin/players/:id
 */
export async function deletePlayer(
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Player ID is required",
      });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: `Player with ID ${id} not found`,
      });
      return;
    }

    // Transactional cascade deletion
    await prisma.$transaction([
      prisma.gameSession.deleteMany({ where: { playerId: id } }),
      prisma.levelProgress.deleteMany({ where: { playerId: id } }),
      prisma.player.delete({ where: { id } }),
    ]);

    res.status(200).json({
      success: true,
      message: `Player ${player.playerName} (${player.enrollmentNumber}) and all associated records deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Searches players across name, enrollment, email, contact, and branch.
 * Protected administrative operational endpoint.
 * GET /api/admin/search?q=<query>
 */
export async function searchPlayers(
  req: Request<{}, {}, {}, { q?: string }>,
  res: Response<ApiResponse<AdminLeaderboardEntryDTO[]>>,
  next: NextFunction
) {
  try {
    const rawQuery = req.query.q;
    if (!rawQuery || typeof rawQuery !== "string" || !rawQuery.trim()) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }

    const query = rawQuery.trim().slice(0, 100);

    const players = await prisma.player.findMany({
      where: {
        OR: [
          { playerName: { contains: query, mode: "insensitive" } },
          { enrollmentNumber: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { contactNumber: { contains: query, mode: "insensitive" } },
          { branch: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
      take: 50,
    });

    const now = Date.now();
    const rows = players.map((p) => {
      const isCompleted = p.status === "COMPLETED";
      let gameTimeSeconds = p.gameTimeSeconds ?? 0;

      if (!isCompleted && p.sessions.length > 0 && p.sessions[0]) {
        const session = p.sessions[0];
        let additionalPause = 0;
        if (session.isPaused && session.pausedAt) {
          additionalPause = Math.max(0, Math.floor((now - session.pausedAt.getTime()) / 1000));
        }
        const totalPaused = (session.totalPausedSeconds ?? 0) + additionalPause;
        const totalElapsed = Math.max(0, Math.floor((now - session.startedAt.getTime()) / 1000));
        const liveNetGameTime = Math.max(0, totalElapsed - totalPaused);
        gameTimeSeconds = Math.max(gameTimeSeconds, liveNetGameTime);
      }

      const penaltySeconds = p.penaltySeconds ?? 0;
      const finalTimeSeconds = gameTimeSeconds + penaltySeconds;

      return {
        playerId: p.id,
        playerName: p.playerName,
        enrollmentNumber: p.enrollmentNumber,
        email: p.email,
        contactNumber: p.contactNumber ?? null,
        branch: p.branch ?? p.team,
        team: p.team,
        currentLevel: p.currentLevel,
        gameTimeSeconds,
        penaltySeconds,
        finalTimeSeconds,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    const ranked: AdminLeaderboardEntryDTO[] = rows.map((r, idx) => ({
      rank: idx + 1,
      playerId: r.playerId,
      playerName: r.playerName,
      enrollmentNumber: r.enrollmentNumber,
      email: r.email,
      contactNumber: r.contactNumber,
      branch: r.branch,
      team: r.team,
      currentLevel: r.currentLevel,
      gameTimeSeconds: r.gameTimeSeconds,
      penaltySeconds: r.penaltySeconds,
      finalTimeSeconds: r.finalTimeSeconds,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: ranked,
    });
  } catch (error) {
    next(error);
  }
}

