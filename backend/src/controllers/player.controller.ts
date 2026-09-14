import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getServerLevelConfig } from "../config/levels";
import { getQuestionById } from "../config/questionBank";
import { getDefaultClueForLevel, repairOrValidateClue } from "../config/clueBank";
import { normalizeProgressData } from "../lib/progress";
import {
  ApiResponse,
  CharacterGender,
  CreatePlayerDTO,
  LevelProgressDataDTO,
  PlayerRecoveryResponseDTO,
  PlayerResponseDTO,
  VALID_BRANCHES,
  Branch,
} from "../types";

function formatPlayer(p: any): PlayerResponseDTO {
  return {
    id: p.id,
    playerName: p.playerName,
    enrollmentNumber: p.enrollmentNumber,
    team: p.team,
    branch: p.branch ?? p.team,
    contactNumber: p.contactNumber ?? null,
    email: p.email,
    selectedCharacter: p.selectedCharacter,
    status: p.status,
    currentLevel: p.currentLevel,
    score: p.score,
    penaltySeconds: p.penaltySeconds,
    gameTimeSeconds: p.gameTimeSeconds,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    inventory: Array.isArray(p.inventory) ? p.inventory : undefined,
  };
}

/**
 * Lists registered players (up to 50 most recent).
 */
export async function listPlayers(
  _req: Request,
  res: Response<ApiResponse<PlayerResponseDTO[]>>,
  next: NextFunction
) {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.status(200).json({
      success: true,
      data: players.map(formatPlayer),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves a single player by ID and their active session (for recovery).
 */
export async function getPlayerById(
  req: Request,
  res: Response<ApiResponse<PlayerRecoveryResponseDTO>>,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Invalid player ID parameter",
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

    const activeSession = await prisma.gameSession.findFirst({
      where: {
        playerId: id,
        isActive: true,
      },
      orderBy: { startedAt: "desc" },
    });

    // Fetch all level progress records for this player to calculate cumulative inventory
    const allProgressRecords = await prisma.levelProgress.findMany({
      where: { playerId: id },
      orderBy: { levelId: "asc" },
    });

    const levelProgress =
      allProgressRecords.find((lp) => lp.levelId === player.currentLevel) ?? null;

    const progressData = normalizeProgressData(levelProgress?.progressData);

    const levelConfig = getServerLevelConfig(player.currentLevel);

    const assignedQuestion = progressData.assignedQuestionId
      ? getQuestionById(progressData.assignedQuestionId)
      : null;

    const revealedHints = progressData.usedHints
      .map((order) => {
        if (assignedQuestion && assignedQuestion.hints[order]) {
          return { order, text: assignedQuestion.hints[order].text };
        }
        const hint = levelConfig?.hints[order];
        return hint ? { order, text: hint.text } : null;
      })
      .filter((h): h is { order: number; text: string } => h !== null);

    let activeClue = progressData.activeClue;
    if (!progressData.assignedClueLocationId) {
      const validated = repairOrValidateClue(
        player.currentLevel,
        progressData.assignedClueLocationId,
        progressData.assignedClueSentenceId
      );
      progressData.assignedClueLocationId = validated.location.objectId;
      progressData.assignedClueSentenceId = validated.sentence.id;
      progressData.activeClue = validated.activeClue;
      activeClue = validated.activeClue;

      if (levelProgress) {
        await prisma.levelProgress.update({
          where: { id: levelProgress.id },
          data: { progressData: progressData as any },
        });
      } else {
        await prisma.levelProgress.create({
          data: {
            playerId: player.id,
            levelId: player.currentLevel,
            status: "IN_PROGRESS",
            progressData: progressData as any,
          },
        });
      }
    } else {
      const validated = repairOrValidateClue(
        player.currentLevel,
        progressData.assignedClueLocationId,
        progressData.assignedClueSentenceId
      );
      activeClue = validated.activeClue;
      if (
        validated.location.objectId !== progressData.assignedClueLocationId ||
        validated.sentence.id !== progressData.assignedClueSentenceId ||
        !progressData.activeClue
      ) {
        progressData.assignedClueLocationId = validated.location.objectId;
        progressData.assignedClueSentenceId = validated.sentence.id;
        progressData.activeClue = validated.activeClue;
        if (levelProgress) {
          await prisma.levelProgress.update({
            where: { id: levelProgress.id },
            data: { progressData: progressData as any },
          });
        }
      }
    }

    const levelProgressDTO: LevelProgressDataDTO = {
      level: player.currentLevel,
      investigatedObjects: progressData.investigatedObjects,
      collectedItems: progressData.collectedItems,
      usedHints: progressData.usedHints,
      revealedHints,
      attempts: progressData.attempts,
      activeClue: activeClue
        ? {
            id: activeClue.id,
            levelId: activeClue.levelId,
            text: activeClue.text,
          }
        : undefined,
      assignedQuestion: assignedQuestion
        ? {
            id: assignedQuestion.id,
            levelId: assignedQuestion.levelId,
            type: assignedQuestion.type,
            question: assignedQuestion.question,
          }
        : undefined,
      isSolved: !!progressData.isSolved,
    };

    const cumulativeInventory = Array.from(
      new Set(
        allProgressRecords.flatMap((lp) => normalizeProgressData(lp.progressData).collectedItems)
      )
    );

    const formatted = formatPlayer({ ...player, inventory: cumulativeInventory });

    res.status(200).json({
      success: true,
      data: {
        ...formatted,
        inventory: cumulativeInventory,
        player: {
          ...formatted,
          inventory: cumulativeInventory,
        },
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startedAt: activeSession.startedAt.getTime(),
              isActive: activeSession.isActive,
              isPaused: activeSession.isPaused,
              pausedAt: activeSession.pausedAt ? activeSession.pausedAt.getTime() : null,
              totalPausedSeconds: activeSession.totalPausedSeconds,
              statusBeforePause: activeSession.statusBeforePause,
            }
          : null,
        levelProgress: levelProgressDTO,
        activeClue: activeClue
          ? {
              id: activeClue.id,
              levelId: activeClue.levelId,
              text: activeClue.text,
            }
          : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Creates / registers a new player.
 */
export async function createPlayer(
  req: Request<{}, {}, CreatePlayerDTO>,
  res: Response<ApiResponse<PlayerResponseDTO>>,
  next: NextFunction
) {
  try {
    const { playerName, enrollmentNumber, team, branch, contactNumber, selectedCharacter, email } =
      req.body;

    // 1. Name validation
    if (!playerName || typeof playerName !== "string" || !playerName.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: Name is required",
      });
      return;
    }

    const trimmedName = playerName.trim();
    if (trimmedName.length > 100) {
      res.status(400).json({
        success: false,
        error: "Name must not exceed 100 characters",
      });
      return;
    }

    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    if (!nameRegex.test(trimmedName)) {
      res.status(400).json({
        success: false,
        error: "Invalid Name. Name must contain alphabetic characters and spaces only.",
      });
      return;
    }

    // 2. Enrollment number validation
    if (!enrollmentNumber || typeof enrollmentNumber !== "string" || !enrollmentNumber.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: Enrollment number is required",
      });
      return;
    }

    const trimmedEnrollment = enrollmentNumber.trim().toUpperCase();
    const enrollmentRegex = /^[A-Za-z0-9]{11}$/;
    if (!enrollmentRegex.test(trimmedEnrollment)) {
      res.status(400).json({
        success: false,
        error: "Invalid Enrollment Number. Enrollment number must be exactly 11 alphanumeric characters.",
      });
      return;
    }

    // 3. Email validation
    if (!email || typeof email !== "string" || !email.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: Email ID is required",
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      res.status(400).json({
        success: false,
        error: "Invalid Email ID. Please provide a valid email address.",
      });
      return;
    }

    // 4. Contact number validation
    if (!contactNumber || typeof contactNumber !== "string" || !contactNumber.trim()) {
      res.status(400).json({
        success: false,
        error: "Missing required field: Contact number is required",
      });
      return;
    }

    const trimmedContact = contactNumber.trim();
    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(trimmedContact)) {
      res.status(400).json({
        success: false,
        error: "Invalid Contact Number. Contact number must be exactly 10 digits.",
      });
      return;
    }

    // 5. Branch validation
    const candidateBranch = (branch || team || "").trim();
    if (!candidateBranch) {
      res.status(400).json({
        success: false,
        error: "Missing required field: Branch is required",
      });
      return;
    }

    if (!VALID_BRANCHES.includes(candidateBranch as Branch)) {
      res.status(400).json({
        success: false,
        error: `Invalid Branch. Must be one of: ${VALID_BRANCHES.join(", ")}`,
      });
      return;
    }
    const validatedBranch = candidateBranch as Branch;
    const finalTeam = team && team.trim() ? team.trim() : validatedBranch;

    // Normalize and validate character gender enum
    let character: CharacterGender = "MALE";
    if (selectedCharacter) {
      const upper = selectedCharacter.toUpperCase();
      if (upper === "FEMALE") {
        character = "FEMALE";
      } else if (upper === "MALE") {
        character = "MALE";
      } else {
        res.status(400).json({
          success: false,
          error: "Invalid selectedCharacter. Must be 'MALE' or 'FEMALE'",
        });
        return;
      }
    }

    const newPlayer = await prisma.player.create({
      data: {
        playerName: trimmedName,
        enrollmentNumber: trimmedEnrollment,
        team: finalTeam,
        branch: validatedBranch,
        contactNumber: trimmedContact,
        selectedCharacter: character,
        email: trimmedEmail,
      },
    });

    res.status(201).json({
      success: true,
      data: formatPlayer(newPlayer),
      message: "Player registered successfully",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint failed
      if (error.code === "P2002") {
        const target = String(error.meta?.target || "");
        if (target.includes("enrollmentNumber")) {
          res.status(409).json({
            success: false,
            error: "A player with this enrollment number is already registered",
          });
          return;
        }
        if (target.includes("email")) {
          res.status(409).json({
            success: false,
            error: "A player with this email is already registered",
          });
          return;
        }
        res.status(409).json({
          success: false,
          error: "A player with unique conflicting details already exists",
        });
        return;
      }
    }
    next(error);
  }
}
