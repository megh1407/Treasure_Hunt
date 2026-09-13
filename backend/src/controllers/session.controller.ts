import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getDefaultClueForLevel } from "../config/clueBank";
import { normalizeProgressData } from "../lib/progress";
import type {
  ApiResponse,
  CompleteSessionDTO,
  CompleteSessionResponseDTO,
  PauseSessionDTO,
  ResumeSessionDTO,
  SessionPauseStateDTO,
  StartSessionDTO,
  StartSessionResponseDTO,
} from "../types";

/**
 * Starts a new game session for a player or returns the current active session.
 * POST /api/sessions/start
 */
export async function startSession(
  req: Request<{}, {}, StartSessionDTO>,
  res: Response<ApiResponse<StartSessionResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId } = req.body;

    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();

    // 1. Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: trimmedPlayerId },
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: `Player with ID ${trimmedPlayerId} not found`,
      });
      return;
    }

    // 2. Ensure LevelProgress exists and has an activeClue
    let progress = await prisma.levelProgress.findFirst({
      where: {
        playerId: trimmedPlayerId,
        levelId: player.currentLevel,
      },
    });

    const normalized = normalizeProgressData(progress?.progressData);
    let activeClue = normalized.activeClue;

    if (!activeClue) {
      activeClue = getDefaultClueForLevel(player.currentLevel);
      normalized.activeClue = activeClue;

      if (progress) {
        await prisma.levelProgress.update({
          where: { id: progress.id },
          data: { progressData: normalized as any },
        });
      } else {
        progress = await prisma.levelProgress.create({
          data: {
            playerId: trimmedPlayerId,
            levelId: player.currentLevel,
            status: "IN_PROGRESS",
            progressData: normalized as any,
          },
        });
      }
    }

    // 3. Check for an active session
    const existingActiveSession = await prisma.gameSession.findFirst({
      where: {
        playerId: trimmedPlayerId,
        isActive: true,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingActiveSession) {
      // Transition NOT_STARTED to SEARCHING; preserve SOLVING, PAUSED, COMPLETED
      let effectiveStatus = player.status;
      if (player.status === "NOT_STARTED") {
        effectiveStatus = "SEARCHING";
        await prisma.player.update({
          where: { id: trimmedPlayerId },
          data: { status: "SEARCHING" },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          sessionId: existingActiveSession.id,
          startTime: existingActiveSession.startedAt.getTime(),
          status: effectiveStatus,
          activeClue,
        },
        message: "Active game session already in progress",
      });
      return;
    }

    // 4. Create a new session and transition player status if NOT_STARTED
    const newStatus = player.status === "NOT_STARTED" ? "SEARCHING" : player.status;
    const [newSession, updatedPlayer] = await prisma.$transaction([
      prisma.gameSession.create({
        data: {
          playerId: trimmedPlayerId,
          isActive: true,
        },
      }),
      prisma.player.update({
        where: { id: trimmedPlayerId },
        data: {
          status: newStatus,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: {
        sessionId: newSession.id,
        startTime: newSession.startedAt.getTime(),
        status: updatedPlayer.status,
        activeClue,
      },
      message: "Game session started successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Completes an active game session and finalizes the player's time and status.
 * POST /api/sessions/complete
 */
export async function completeSession(
  req: Request<{}, {}, CompleteSessionDTO>,
  res: Response<ApiResponse<CompleteSessionResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, sessionId } = req.body;

    // 1. Validate required fields
    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: sessionId is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedSessionId = sessionId.trim();

    // 2. Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: trimmedPlayerId },
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: `Player with ID ${trimmedPlayerId} not found`,
      });
      return;
    }

    // 3. Verify session exists
    const session = await prisma.gameSession.findUnique({
      where: { id: trimmedSessionId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} not found`,
      });
      return;
    }

    // 4. Verify session belongs to the player
    if (session.playerId !== trimmedPlayerId) {
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} does not belong to player ${trimmedPlayerId}`,
      });
      return;
    }

    // 5. Verify session is currently active
    if (!session.isActive) {
      if (player.status === "COMPLETED") {
        const gameTimeSeconds = player.gameTimeSeconds ?? 0;
        const penaltySeconds = player.penaltySeconds ?? 0;
        const finalTimeSeconds = player.score || (gameTimeSeconds + penaltySeconds);
        res.status(200).json({
          success: true,
          data: {
            sessionId: session.id,
            status: player.status,
            gameTimeSeconds,
            penaltySeconds,
            finalTimeSeconds,
          },
          message: "Game session already completed",
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} is already completed or inactive`,
      });
      return;
    }

    // 6. Calculate timing and final scores
    const endedAt = new Date();
    const startedAt = session.startedAt;
    let additionalPauseDuration = 0;
    if (session.isPaused && session.pausedAt) {
      additionalPauseDuration = Math.max(
        0,
        Math.floor((endedAt.getTime() - session.pausedAt.getTime()) / 1000)
      );
    }
    const finalTotalPaused = session.totalPausedSeconds + additionalPauseDuration;
    const totalElapsedSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
    );
    const gameTimeSeconds = Math.max(0, totalElapsedSeconds - finalTotalPaused);
    const penaltySeconds = player.penaltySeconds ?? 0;
    const finalTimeSeconds = gameTimeSeconds + penaltySeconds;

    // 7. Atomically complete the session and update the player
    const [updatedSession, updatedPlayer] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: trimmedSessionId },
        data: {
          isActive: false,
          isPaused: false,
          pausedAt: null,
          statusBeforePause: null,
          totalPausedSeconds: finalTotalPaused,
          endedAt,
        },
      }),
      prisma.player.update({
        where: { id: trimmedPlayerId },
        data: {
          status: "COMPLETED",
          gameTimeSeconds,
          score: finalTimeSeconds,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessionId: updatedSession.id,
        status: updatedPlayer.status,
        gameTimeSeconds: updatedPlayer.gameTimeSeconds,
        penaltySeconds: updatedPlayer.penaltySeconds,
        finalTimeSeconds,
      },
      message: "Game session completed successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Pauses an active game session for a player.
 * POST /api/sessions/pause
 */
export async function pauseSession(
  req: Request<{}, {}, PauseSessionDTO>,
  res: Response<ApiResponse<SessionPauseStateDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, sessionId } = req.body;

    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: sessionId is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedSessionId = sessionId.trim();

    // 1. Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: trimmedPlayerId },
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: `Player with ID ${trimmedPlayerId} not found`,
      });
      return;
    }

    // 2. Verify session exists
    const session = await prisma.gameSession.findUnique({
      where: { id: trimmedSessionId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} not found`,
      });
      return;
    }

    // 3. Verify session ownership
    if (session.playerId !== trimmedPlayerId) {
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} does not belong to player ${trimmedPlayerId}`,
      });
      return;
    }

    // 4. Verify session is active
    if (!session.isActive) {
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} is already completed or inactive`,
      });
      return;
    }

    // 5. Idempotent check: If already paused, return current pause state
    if (session.isPaused) {
      res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          isPaused: true,
          pausedAt: session.pausedAt ? session.pausedAt.getTime() : null,
          totalPausedSeconds: session.totalPausedSeconds,
          status: player.status,
        },
        message: "Session is already paused",
      });
      return;
    }

    // 6. Normal pause: Remember player status, mark session paused, update player status to PAUSED atomically
    const now = new Date();
    const statusBeforePause = player.status;

    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: trimmedSessionId },
        data: {
          isPaused: true,
          pausedAt: now,
          statusBeforePause,
        },
      }),
      prisma.player.update({
        where: { id: trimmedPlayerId },
        data: {
          status: "PAUSED",
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        isPaused: true,
        pausedAt: now.getTime(),
        totalPausedSeconds: session.totalPausedSeconds,
        status: "PAUSED",
      },
      message: "Session paused successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resumes a paused game session for a player.
 * POST /api/sessions/resume
 */
export async function resumeSession(
  req: Request<{}, {}, ResumeSessionDTO>,
  res: Response<ApiResponse<SessionPauseStateDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, sessionId } = req.body;

    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: sessionId is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedSessionId = sessionId.trim();

    // 1. Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: trimmedPlayerId },
    });

    if (!player) {
      res.status(404).json({
        success: false,
        error: `Player with ID ${trimmedPlayerId} not found`,
      });
      return;
    }

    // 2. Verify session exists
    const session = await prisma.gameSession.findUnique({
      where: { id: trimmedSessionId },
    });

    if (!session) {
      res.status(404).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} not found`,
      });
      return;
    }

    // 3. Verify session ownership
    if (session.playerId !== trimmedPlayerId) {
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} does not belong to player ${trimmedPlayerId}`,
      });
      return;
    }

    // 4. Verify session is active
    if (!session.isActive) {
      res.status(400).json({
        success: false,
        error: `Game session with ID ${trimmedSessionId} is already completed or inactive`,
      });
      return;
    }

    // 5. Idempotent check: If session is not paused, return current state
    if (!session.isPaused) {
      res.status(200).json({
        success: true,
        data: {
          sessionId: session.id,
          isPaused: false,
          pausedAt: null,
          totalPausedSeconds: session.totalPausedSeconds,
          status: player.status,
        },
        message: "Session is not paused",
      });
      return;
    }

    // 6. Normal resume: calculate pause duration on backend and restore statusBeforePause
    const now = new Date();
    const pauseDurationSeconds = session.pausedAt
      ? Math.max(0, Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000))
      : 0;
    const newTotalPausedSeconds = session.totalPausedSeconds + pauseDurationSeconds;

    // Restore exact statusBeforePause, or safe fallback if unexpectedly null
    let resumedStatus = session.statusBeforePause;
    if (!resumedStatus || resumedStatus === "PAUSED") {
      const levelProgress = await prisma.levelProgress.findUnique({
        where: {
          playerId_levelId: {
            playerId: trimmedPlayerId,
            levelId: player.currentLevel,
          },
        },
      });
      resumedStatus =
        levelProgress && levelProgress.status === "IN_PROGRESS" ? "SOLVING" : "SEARCHING";
    }

    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: trimmedSessionId },
        data: {
          isPaused: false,
          pausedAt: null,
          totalPausedSeconds: newTotalPausedSeconds,
          statusBeforePause: null,
        },
      }),
      prisma.player.update({
        where: { id: trimmedPlayerId },
        data: {
          status: resumedStatus,
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: newTotalPausedSeconds,
        status: resumedStatus,
      },
      message: "Session resumed successfully",
    });
  } catch (error) {
    next(error);
  }
}
