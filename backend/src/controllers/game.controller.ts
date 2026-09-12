import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { getServerLevelConfig, isObjectInLevel, getDecoyInLevel } from "../config/levels";
import { normalizeProgressData } from "../lib/progress";
import type {
  ApiResponse,
  InvestigateDTO,
  InvestigateResponseDTO,
  RequestHintDTO,
  RequestHintResponseDTO,
  RunScanDTO,
  RunScanResponseDTO,
  SubmitAnswerDTO,
  SubmitAnswerResponseDTO,
} from "../types";

/**
 * Helper to retrieve and validate an active, unpaused session for a player.
 */
async function getValidatedActiveSession(playerId: string) {
  const activeSession = await prisma.gameSession.findFirst({
    where: {
      playerId,
      isActive: true,
    },
    orderBy: { startedAt: "desc" },
  });

  return activeSession;
}

/**
 * Investigates an object in the world for the player's current active level.
 * POST /api/game/investigate
 */
export async function investigateObject(
  req: Request<{}, {}, InvestigateDTO>,
  res: Response<ApiResponse<InvestigateResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, objectId } = req.body;

    // 1. Validation
    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!objectId || typeof objectId !== "string" || !objectId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: objectId is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedObjectId = objectId.trim();

    if (trimmedPlayerId.length > 50 || trimmedObjectId.length > 100) {
      res.status(400).json({
        success: false,
        error: "Field length exceeds maximum limit (playerId: 50, objectId: 100)",
      });
      return;
    }

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

    // 3. Check player eligibility
    if (player.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: "Player has already completed the mission",
      });
      return;
    }

    // 4. Session ownership, active check, and pause check
    const activeSession = await getValidatedActiveSession(trimmedPlayerId);
    if (!activeSession) {
      res.status(400).json({
        success: false,
        error: "No active game session found. Please start a session before investigating.",
      });
      return;
    }

    if (activeSession.isPaused) {
      res.status(400).json({
        success: false,
        error: "Game session is currently paused. Resume session before investigating.",
      });
      return;
    }

    // 5. Lookup authoritative level configuration
    const currentLevel = player.currentLevel;
    const levelConfig = getServerLevelConfig(currentLevel);
    if (!levelConfig) {
      res.status(400).json({
        success: false,
        error: `Level ${currentLevel} is not configured or deployed on this server.`,
      });
      return;
    }

    // 6. Verify object belongs to the player's current level
    if (!isObjectInLevel(currentLevel, trimmedObjectId)) {
      res.status(200).json({
        success: true,
        data: {
          outcome: "cross_level",
          message:
            "SCAN RESULT: This object does not appear relevant to your current investigation. Continue searching for evidence connected to your current quest.",
        },
      });
      return;
    }

    // 7. Fetch existing level progress for the player's current level
    const existingProgress = await prisma.levelProgress.findUnique({
      where: {
        playerId_levelId: {
          playerId: trimmedPlayerId,
          levelId: currentLevel,
        },
      },
    });

    if (existingProgress?.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: `Level ${currentLevel} has already been completed.`,
      });
      return;
    }

    const currentData = normalizeProgressData(existingProgress?.progressData);
    const startedAt = existingProgress?.startedAt ?? new Date();

    // 8. Check if object is the clue target
    if (trimmedObjectId === levelConfig.targetObjectId) {
      const investigatedObjects = Array.from(
        new Set([...currentData.investigatedObjects, trimmedObjectId])
      );
      const collectedItems = levelConfig.grantedItem
        ? Array.from(new Set([...currentData.collectedItems, levelConfig.grantedItem]))
        : currentData.collectedItems;

      const updatedData = {
        ...currentData,
        investigatedObjects,
        collectedItems,
      };

      // Atomically update LevelProgress and set Player status to SOLVING
      await prisma.$transaction([
        prisma.levelProgress.upsert({
          where: {
            playerId_levelId: {
              playerId: trimmedPlayerId,
              levelId: currentLevel,
            },
          },
          create: {
            playerId: trimmedPlayerId,
            levelId: currentLevel,
            status: "IN_PROGRESS",
            startedAt,
            progressData: updatedData,
          },
          update: {
            status: "IN_PROGRESS",
            startedAt,
            progressData: updatedData,
          },
        }),
        prisma.player.update({
          where: { id: trimmedPlayerId },
          data: { status: "SOLVING" },
        }),
      ]);

      const clueMessage =
        currentLevel === 1
          ? "A hollowed-out volume. Inside: a folded strip of paper with an encrypted trace."
          : currentLevel === 2
          ? "A metallic tray beneath heavy tools. Inside: the second encrypted trace and an Access Card."
          : currentLevel === 3
          ? "The main server enclosure hums quietly. Behind the ventilation panel: an Encryption Key and the third encrypted trace."
          : currentLevel === 4
          ? "Underneath the armrest of seat 7F: an engraved circuit piece and the fourth encrypted trace."
          : currentLevel === 5
          ? "Taped underneath the corner table: a folded recipe card concealing a handwritten secret note and the fifth encrypted trace."
          : `Encrypted trace discovered in ${levelConfig.targetObjectDisplayName}.`;

      // Return challenge WITHOUT the clue (clue is unlocked only upon solving challenge)
      res.status(200).json({
        success: true,
        data: {
          objectId: levelConfig.targetObjectId,
          outcome: "clue",
          message: clueMessage,
          challenge: {
            id: levelConfig.challenge.id,
            levelId: levelConfig.challenge.levelId,
            type: levelConfig.challenge.type,
            question: levelConfig.challenge.question,
          },
          grantedItem: levelConfig.grantedItem,
        },
      });
      return;
    }

    // 9. Decoy object — record in investigatedObjects without penalty
    const investigatedObjects = Array.from(
      new Set([...currentData.investigatedObjects, trimmedObjectId])
    );
    const updatedData = {
      ...currentData,
      investigatedObjects,
    };

    await prisma.levelProgress.upsert({
      where: {
        playerId_levelId: {
          playerId: trimmedPlayerId,
          levelId: currentLevel,
        },
      },
      create: {
        playerId: trimmedPlayerId,
        levelId: currentLevel,
        status: "NOT_STARTED",
        startedAt,
        progressData: updatedData,
      },
      update: {
        progressData: updatedData,
      },
    });

    const decoy = getDecoyInLevel(currentLevel, trimmedObjectId);
    const decoyMessage = decoy?.message || "Nothing useful was found.";

    res.status(200).json({
      success: true,
      data: {
        objectId: trimmedObjectId,
        outcome: "decoy",
        message: decoyMessage,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validates player answer for the current level's challenge.
 * POST /api/game/submit-answer
 */
export async function submitAnswer(
  req: Request<{}, {}, SubmitAnswerDTO>,
  res: Response<ApiResponse<SubmitAnswerResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, challengeId, answer } = req.body;

    // 1. Validation
    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!challengeId || typeof challengeId !== "string" || !challengeId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: challengeId is required",
      });
      return;
    }

    if (answer === undefined || answer === null || typeof answer !== "string" || !answer.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: answer is required",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedChallengeId = challengeId.trim();
    const trimmedAnswer = answer.trim();

    if (trimmedPlayerId.length > 50 || trimmedChallengeId.length > 50 || trimmedAnswer.length > 255) {
      res.status(400).json({
        success: false,
        error: "Field length exceeds maximum limit (playerId: 50, challengeId: 50, answer: 255)",
      });
      return;
    }

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

    // 3. Check player eligibility
    if (player.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: "Player has already completed the mission",
      });
      return;
    }

    // 4. Session ownership, active check, and pause check
    const activeSession = await getValidatedActiveSession(trimmedPlayerId);
    if (!activeSession) {
      res.status(400).json({
        success: false,
        error: "No active game session found. Please start a session before submitting answers.",
      });
      return;
    }

    if (activeSession.isPaused) {
      res.status(400).json({
        success: false,
        error: "Game session is currently paused. Resume session before submitting answers.",
      });
      return;
    }

    // 5. Lookup authoritative level configuration
    const currentLevel = player.currentLevel;
    const levelConfig = getServerLevelConfig(currentLevel);
    if (!levelConfig) {
      res.status(400).json({
        success: false,
        error: `Level ${currentLevel} is not configured or deployed on this server.`,
      });
      return;
    }

    // 6. Verify challenge matches current player level
    if (trimmedChallengeId !== levelConfig.challenge.id) {
      res.status(400).json({
        success: false,
        error: `Invalid challenge ID for level ${currentLevel}: expected '${levelConfig.challenge.id}'`,
      });
      return;
    }

    // 7. Verify & Process Answer under interactive transaction with row-level lock
    const txResult = await prisma.$transaction(
      async (tx) => {
        // Lock player row and fetch fresh state in a single round-trip
        const players = await tx.$queryRaw<
          Array<{ id: string; currentLevel: number; penaltySeconds: number }>
        >`SELECT "id", "currentLevel", "penaltySeconds" FROM "Player" WHERE "id" = ${trimmedPlayerId} FOR UPDATE;`;

        const freshPlayer = players[0];
        if (!freshPlayer) {
          return { error: "Player not found", statusCode: 404 };
        }

        if (freshPlayer.currentLevel !== currentLevel) {
          return {
            error: `Level ${currentLevel} is no longer active for player. Player is on level ${freshPlayer.currentLevel}.`,
            statusCode: 400,
          };
        }

        // Verify LevelProgress is currently IN_PROGRESS
        const levelProgress = await tx.levelProgress.findUnique({
          where: {
            playerId_levelId: {
              playerId: trimmedPlayerId,
              levelId: currentLevel,
            },
          },
        });

        if (!levelProgress || levelProgress.status !== "IN_PROGRESS") {
          return {
            error: `Level ${currentLevel} is not in progress. You must investigate the clue before submitting an answer.`,
            statusCode: 400,
          };
        }

        // Authoritative Server-Side Answer Comparison
        const expected = levelConfig.challenge.answer.trim().toLowerCase();
        const submitted = trimmedAnswer.toLowerCase();
        const isCorrect = submitted === expected;

        const currentData = normalizeProgressData(levelProgress.progressData);
        const updatedAttempts = currentData.attempts + 1;
        const updatedData = {
          ...currentData,
          attempts: updatedAttempts,
        };

        if (!isCorrect) {
          // Apply wrong answer penalty and increment attempts atomically in parallel
          await Promise.all([
            tx.player.update({
              where: { id: trimmedPlayerId },
              data: {
                penaltySeconds: { increment: levelConfig.penalties.wrongAnswer },
              },
            }),
            tx.levelProgress.update({
              where: {
                playerId_levelId: {
                  playerId: trimmedPlayerId,
                  levelId: currentLevel,
                },
              },
              data: {
                penaltySeconds: { increment: levelConfig.penalties.wrongAnswer },
                progressData: updatedData,
              },
            }),
          ]);

          return {
            correct: false,
            penaltySeconds: levelConfig.penalties.wrongAnswer,
            levelCompleted: false,
            message: "Incorrect answer. Time penalty applied.",
          };
        }

        // Correct answer: Complete current level, advance player or finalize mission
        const isFinalLevel = currentLevel >= 10;

        if (isFinalLevel) {
          const endedAt = new Date();
          let additionalPauseDuration = 0;
          if (activeSession.isPaused && activeSession.pausedAt) {
            additionalPauseDuration = Math.max(
              0,
              Math.floor((endedAt.getTime() - activeSession.pausedAt.getTime()) / 1000)
            );
          }
          const finalTotalPaused = activeSession.totalPausedSeconds + additionalPauseDuration;
          const totalElapsedSeconds = Math.max(
            0,
            Math.floor((endedAt.getTime() - activeSession.startedAt.getTime()) / 1000)
          );
          const gameTimeSeconds = Math.max(0, totalElapsedSeconds - finalTotalPaused);
          const finalTimeSeconds = gameTimeSeconds + (freshPlayer.penaltySeconds ?? 0);

          await Promise.all([
            tx.levelProgress.update({
              where: {
                playerId_levelId: {
                  playerId: trimmedPlayerId,
                  levelId: currentLevel,
                },
              },
              data: {
                status: "COMPLETED",
                completedAt: endedAt,
                progressData: updatedData,
              },
            }),
            tx.gameSession.update({
              where: { id: activeSession.id },
              data: {
                isActive: false,
                isPaused: false,
                pausedAt: null,
                statusBeforePause: null,
                totalPausedSeconds: finalTotalPaused,
                endedAt,
              },
            }),
            tx.player.update({
              where: { id: trimmedPlayerId },
              data: {
                status: "COMPLETED",
                gameTimeSeconds,
                score: finalTimeSeconds,
              },
            }),
          ]);

          return {
            correct: true,
            penaltySeconds: 0,
            levelCompleted: true,
            nextLevel: null,
            message: "Mission accomplished! All traces decrypted. CORE-X recovered!",
          };
        }

        const nextLevel = currentLevel + 1;

        await Promise.all([
          tx.levelProgress.update({
            where: {
              playerId_levelId: {
                playerId: trimmedPlayerId,
                levelId: currentLevel,
              },
            },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              progressData: updatedData,
            },
          }),
          tx.player.update({
            where: { id: trimmedPlayerId },
            data: {
              currentLevel: nextLevel,
              status: "SEARCHING",
            },
          }),
          tx.levelProgress.upsert({
            where: {
              playerId_levelId: {
                playerId: trimmedPlayerId,
                levelId: nextLevel,
              },
            },
            create: {
              playerId: trimmedPlayerId,
              levelId: nextLevel,
              status: "NOT_STARTED",
              progressData: {
                investigatedObjects: [],
                collectedItems: [],
                usedHints: [],
                attempts: 0,
              },
            },
            update: {},
          }),
        ]);

        const levelClue = levelConfig.clue
          ? {
              id: levelConfig.clue.id,
              levelId: levelConfig.clue.levelId,
              text: levelConfig.clue.text,
            }
          : undefined;

        return {
          correct: true,
          penaltySeconds: 0,
          levelCompleted: true,
          nextLevel,
          nextClue: levelClue,
          message: "Trace decrypted. Level complete.",
        };
      },
      { maxWait: 35000, timeout: 35000 }
    );

    if ("error" in txResult && txResult.error) {
      res.status((txResult as any).statusCode || 400).json({
        success: false,
        error: (txResult as any).error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: txResult as any,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Requests a progressive hint for the player's current active level.
 * POST /api/game/hint
 */
export async function requestHint(
  req: Request<{}, {}, RequestHintDTO>,
  res: Response<ApiResponse<RequestHintResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, challengeId, order } = req.body;

    // 1. Validation
    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (!challengeId || typeof challengeId !== "string" || !challengeId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: challengeId is required",
      });
      return;
    }

    if (order !== 1 && order !== 2 && order !== 3) {
      res.status(400).json({
        success: false,
        error: "Invalid hint order. Must be 1, 2, or 3",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    const trimmedChallengeId = challengeId.trim();

    if (trimmedPlayerId.length > 50 || trimmedChallengeId.length > 50) {
      res.status(400).json({
        success: false,
        error: "Field length exceeds maximum limit (playerId: 50, challengeId: 50)",
      });
      return;
    }

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

    // 3. Check player eligibility
    if (player.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: "Player has already completed the mission",
      });
      return;
    }

    // 4. Session ownership, active check, and pause check
    const activeSession = await getValidatedActiveSession(trimmedPlayerId);
    if (!activeSession) {
      res.status(400).json({
        success: false,
        error: "No active game session found. Please start a session before requesting hints.",
      });
      return;
    }

    if (activeSession.isPaused) {
      res.status(400).json({
        success: false,
        error: "Game session is currently paused. Resume session before requesting hints.",
      });
      return;
    }

    // 5. Lookup authoritative level configuration
    const currentLevel = player.currentLevel;
    const levelConfig = getServerLevelConfig(currentLevel);
    if (!levelConfig) {
      res.status(400).json({
        success: false,
        error: `Level ${currentLevel} is not configured or deployed on this server.`,
      });
      return;
    }

    // 6. Verify challenge matches current level
    if (trimmedChallengeId !== levelConfig.challenge.id) {
      res.status(400).json({
        success: false,
        error: `Invalid challenge ID for level ${currentLevel}: expected '${levelConfig.challenge.id}'`,
      });
      return;
    }

    const hint = levelConfig.hints[order];
    if (!hint) {
      res.status(400).json({
        success: false,
        error: `Hint order ${order} is not available for level ${currentLevel}.`,
      });
      return;
    }

    // 7. Check if hint was already used by this player (Idempotency with row-level lock)
    const hintResult = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Player" WHERE id = ${trimmedPlayerId} FOR UPDATE;`;

      const levelProgress = await tx.levelProgress.findUnique({
        where: {
          playerId_levelId: {
            playerId: trimmedPlayerId,
            levelId: currentLevel,
          },
        },
      });

      const currentData = normalizeProgressData(levelProgress?.progressData);

      if (currentData.usedHints.includes(order)) {
        // Already unlocked: return hint text with 0 additional penalty
        return { alreadyUsed: true, penaltySeconds: 0 };
      }

      // Enforce sequential hint requirements (checked AFTER idempotency)
      if (order === 2 && !currentData.usedHints.includes(1)) {
        return {
          error: "Hint 1 must be unlocked before requesting Hint 2",
          statusCode: 400,
        };
      }

      if (order === 3 && !currentData.usedHints.includes(2)) {
        return {
          error: "Hint 2 must be unlocked before requesting Hint 3",
          statusCode: 400,
        };
      }

      const usedHints = Array.from(new Set([...currentData.usedHints, order])).sort((a, b) => a - b);
      const updatedData = {
        ...currentData,
        usedHints,
      };

      // Atomically apply hint penalty and update progressData in parallel
      await Promise.all([
        tx.player.update({
          where: { id: trimmedPlayerId },
          data: {
            penaltySeconds: { increment: hint.penaltySeconds },
          },
        }),
        tx.levelProgress.upsert({
          where: {
            playerId_levelId: {
              playerId: trimmedPlayerId,
              levelId: currentLevel,
            },
          },
          create: {
            playerId: trimmedPlayerId,
            levelId: currentLevel,
            status: "IN_PROGRESS",
            startedAt: new Date(),
            penaltySeconds: hint.penaltySeconds,
            progressData: updatedData,
          },
          update: {
            penaltySeconds: { increment: hint.penaltySeconds },
            progressData: updatedData,
          },
        }),
      ]);

      return { alreadyUsed: false, penaltySeconds: hint.penaltySeconds };
    }, { maxWait: 35000, timeout: 35000 });

    if ("error" in hintResult && hintResult.error) {
      res.status((hintResult as { statusCode?: number }).statusCode || 400).json({
        success: false,
        error: (hintResult as { error: string }).error,
      });
      return;
    }

    const finalPenaltySeconds =
      "penaltySeconds" in hintResult && typeof hintResult.penaltySeconds === "number"
        ? hintResult.penaltySeconds
        : 0;

    res.status(200).json({
      success: true,
      data: {
        order: hint.order,
        text: hint.text,
        penaltySeconds: finalPenaltySeconds,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Runs the AR Radar Scanner for the player's current active level.
 * POST /api/game/scan
 */
export async function runScanner(
  req: Request<{}, {}, RunScanDTO>,
  res: Response<ApiResponse<RunScanResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerId, position, levelId } = req.body;

    // 1. Validation
    if (!playerId || typeof playerId !== "string" || !playerId.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: playerId is required",
      });
      return;
    }

    if (
      !Array.isArray(position) ||
      position.length !== 3 ||
      !position.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10000)
    ) {
      res.status(400).json({
        success: false,
        error: "position must be an array containing exactly 3 finite numeric coordinates [x, y, z] within valid bounds",
      });
      return;
    }

    const trimmedPlayerId = playerId.trim();
    if (trimmedPlayerId.length > 50) {
      res.status(400).json({
        success: false,
        error: "Field length exceeds maximum limit (playerId: 50)",
      });
      return;
    }

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

    if (typeof levelId === "number" && levelId !== player.currentLevel) {
      res.status(400).json({
        success: false,
        error: `levelId does not match player's current active level (${player.currentLevel})`,
      });
      return;
    }

    // 3. Session ownership, active check, and pause check
    const activeSession = await getValidatedActiveSession(trimmedPlayerId);
    if (!activeSession) {
      res.status(400).json({
        success: false,
        error: "No active game session found. Please start a session before scanning.",
      });
      return;
    }

    if (activeSession.isPaused) {
      res.status(400).json({
        success: false,
        error: "Game session is currently paused. Resume session before scanning.",
      });
      return;
    }

    const currentLevel = player.currentLevel;
    const levelConfig = getServerLevelConfig(currentLevel);
    if (!levelConfig) {
      res.status(400).json({
        success: false,
        error: `Level ${currentLevel} is not configured or deployed on this server.`,
      });
      return;
    }

    // 4. Calculate distance to target object
    const target = levelConfig.targetPosition;
    const dx = target[0] - position[0];
    const dz = target[2] - position[2];
    const distance = Math.hypot(dx, dz);
    const isNearby = distance <= levelConfig.scannerDetectionRadius;

    // 5. Apply scanner penalty to Player and LevelProgress
    const levelProgress = await prisma.levelProgress.findUnique({
      where: {
        playerId_levelId: {
          playerId: trimmedPlayerId,
          levelId: currentLevel,
        },
      },
    });

    const operations: any[] = [
      prisma.player.update({
        where: { id: trimmedPlayerId },
        data: {
          penaltySeconds: { increment: levelConfig.penalties.scanner },
        },
      }),
    ];

    if (levelProgress) {
      operations.push(
        prisma.levelProgress.update({
          where: {
            playerId_levelId: {
              playerId: trimmedPlayerId,
              levelId: currentLevel,
            },
          },
          data: {
            penaltySeconds: { increment: levelConfig.penalties.scanner },
          },
        })
      );
    }

    await prisma.$transaction(operations);

    res.status(200).json({
      success: true,
      data: {
        message: isNearby
          ? "Unusual signal detected nearby."
          : "No unusual signal detected.",
        penaltySeconds: levelConfig.penalties.scanner,
      },
    });
  } catch (error) {
    next(error);
  }
}
