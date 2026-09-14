import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { calculateTotalTimeSeconds, formatDurationMMSS } from "../lib/time";
import type { ApiResponse, LeaderboardEntryDTO, PlayerStatus, Top5PlayerDTO } from "../types";

/**
 * Retrieves global game leaderboard with deterministic speedrun scoring.
 * GET /api/leaderboard?limit=50
 */
export async function getLeaderboard(
  req: Request,
  res: Response<ApiResponse<LeaderboardEntryDTO[]>>,
  next: NextFunction
) {
  try {
    // 1. Parse and sanitize limit query param
    let limit = 100;
    if (req.query.limit) {
      const parsed = parseInt(String(req.query.limit), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        limit = Math.min(parsed, 500);
      }
    }

    // 2. Fetch all players along with active sessions
    const players = await prisma.player.findMany({
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    // 3. Compute score and normalize entries
    const now = Date.now();
    const rows = players.map((p) => {
      const isCompleted = p.status === "COMPLETED";
      let gameTimeSeconds = p.gameTimeSeconds ?? 0;

      // For ongoing sessions, calculate live net game time accounting for pause duration
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
      const finalTimeSeconds = calculateTotalTimeSeconds(gameTimeSeconds, penaltySeconds);

      const normalizedStatus = (
        p.status ? p.status.toLowerCase() : "not_started"
      ) as PlayerStatus;

      return {
        playerId: p.id,
        playerName: p.playerName,
        team: p.team,
        level: p.currentLevel,
        currentLevel: p.currentLevel,
        timeSeconds: gameTimeSeconds,
        gameTimeSeconds: gameTimeSeconds,
        penaltySeconds,
        finalTimeSeconds,
        location: isCompleted ? "Vault Cleared" : `Level ${p.currentLevel}`,
        status: normalizedStatus,
        rawStatus: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // 4. Deterministic sorting
    rows.sort((a, b) => {
      const aCompleted = a.rawStatus === "COMPLETED";
      const bCompleted = b.rawStatus === "COMPLETED";

      // 1. Completed players first
      if (aCompleted && !bCompleted) return -1;
      if (!aCompleted && bCompleted) return 1;

      if (aCompleted && bCompleted) {
        // 2. Lowest finalTimeSeconds first
        if (a.finalTimeSeconds !== b.finalTimeSeconds) {
          return a.finalTimeSeconds - b.finalTimeSeconds;
        }
        // Secondary tie-breaker: earlier completion
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      }

      // Both are active / not completed:
      // 3. Higher currentLevel first
      if (a.currentLevel !== b.currentLevel) {
        return b.currentLevel - a.currentLevel;
      }

      // 4. Lowest current finalTimeSeconds
      if (a.finalTimeSeconds !== b.finalTimeSeconds) {
        return a.finalTimeSeconds - b.finalTimeSeconds;
      }

      // 5. Deterministic tie-breaker
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // 5. Slice to limit and assign 1-based sequential rank
    const rankedData: LeaderboardEntryDTO[] = rows.slice(0, limit).map((r, index) => ({
      rank: index + 1,
      playerId: r.playerId,
      playerName: r.playerName,
      team: r.team,
      level: r.level,
      currentLevel: r.currentLevel,
      timeSeconds: r.timeSeconds,
      gameTimeSeconds: r.gameTimeSeconds,
      penaltySeconds: r.penaltySeconds,
      finalTimeSeconds: r.finalTimeSeconds,
      totalTime: formatDurationMMSS(r.finalTimeSeconds),
      location: r.location,
      status: r.status,
    }));

    res.status(200).json({
      success: true,
      data: rankedData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Safe player-facing endpoint for player dashboard.
 * Returns ONLY the Top 5 player names without sensitive private data.
 * GET /api/leaderboard/top5
 */
export async function getTop5Players(
  _req: Request,
  res: Response<ApiResponse<Top5PlayerDTO[]>>,
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
      const finalTimeSeconds = calculateTotalTimeSeconds(gameTimeSeconds, penaltySeconds);

      return {
        playerName: p.playerName,
        currentLevel: p.currentLevel,
        finalTimeSeconds,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    rows.sort((a, b) => {
      const aCompleted = a.status === "COMPLETED";
      const bCompleted = b.status === "COMPLETED";

      if (aCompleted && !bCompleted) return -1;
      if (!aCompleted && bCompleted) return 1;

      if (aCompleted && bCompleted) {
        if (a.finalTimeSeconds !== b.finalTimeSeconds) {
          return a.finalTimeSeconds - b.finalTimeSeconds;
        }
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      }

      if (a.currentLevel !== b.currentLevel) {
        return b.currentLevel - a.currentLevel;
      }

      if (a.finalTimeSeconds !== b.finalTimeSeconds) {
        return a.finalTimeSeconds - b.finalTimeSeconds;
      }

      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Expose safe fields for the top 5 without leaking sensitive contestant information
    const top5: Top5PlayerDTO[] = rows.slice(0, 5).map((r, idx) => {
      const isCompleted = r.status === "COMPLETED";
      return {
        rank: idx + 1,
        playerName: r.playerName,
        levelsCompleted: isCompleted ? 10 : Math.max(0, r.currentLevel - 1),
        status: isCompleted ? "Completed" : `Level ${r.currentLevel}`,
        totalTime: isCompleted
          ? formatDurationMMSS(r.finalTimeSeconds)
          : (r.finalTimeSeconds > 0 ? formatDurationMMSS(r.finalTimeSeconds) : "—"),
        totalTimeSeconds: r.finalTimeSeconds,
      };
    });

    res.status(200).json({
      success: true,
      data: top5,
    });
  } catch (error) {
    next(error);
  }
}
