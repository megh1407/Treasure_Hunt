import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { activeAdminTokens } from "../middleware/admin.middleware";
import { getQuestionBankSummary } from "../config/questionBank";
import { validateCluesNoLeakage } from "../config/clueBank";
import ExcelJS from "exceljs";
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

/**
 * Returns question bank diagnostics for admin visibility.
 * GET /api/admin/questions/diagnostics
 */
export async function getQuestionBankDiagnostics(
  _req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
) {
  try {
    const summary = getQuestionBankSummary();
    const cluesValidation = validateCluesNoLeakage();
    res.status(200).json({
      success: true,
      data: {
        ...summary,
        cluesValidation,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generates and downloads an authoritative, styled Excel workbook containing exactly
 * the 12 approved contestant columns.
 * GET /api/admin/export/excel
 */
export async function exportContestantsExcel(
  _req: Request,
  res: Response,
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
        contactNumber: p.contactNumber ?? "",
        branch: p.branch ?? p.team ?? "",
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

    // Sort matching the authoritative Organizer Control Room
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Updates 2K26 Control Room";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Contestants", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Exactly 12 columns in exact order
    worksheet.columns = [
      { header: "Serial Number", key: "serialNumber", width: 15 },
      { header: "Contestant Name", key: "contestantName", width: 26 },
      { header: "Enrollment Number", key: "enrollmentNumber", width: 22 },
      { header: "Contact Number", key: "contactNumber", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Branch", key: "branch", width: 16 },
      { header: "Levels Completed", key: "levelsCompleted", width: 18 },
      { header: "Completion Status", key: "completionStatus", width: 20 },
      { header: "Game Time", key: "gameTime", width: 15 },
      { header: "Penalty Time", key: "penaltyTime", width: 15 },
      { header: "Total Time", key: "totalTime", width: 15 },
      { header: "Registration Date", key: "registrationDate", width: 24 },
    ];

    // Style the header row: Bold font, light cyan/teal background, centered
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FF0A2540" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" }, // light cyan/sky
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    // Helper formatters
    const formatDuration = (seconds: number) => {
      const s = Math.max(0, Math.floor(seconds));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const formatDate = (d: Date) => {
      // YYYY-MM-DD HH:mm:ss in consistent format
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const secs = String(d.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    };

    // Populate rows
    rows.forEach((r, idx) => {
      const isCompleted = r.status === "COMPLETED";
      // Authoritative levels completed count
      const levelsCompleted = isCompleted ? 10 : Math.max(0, r.currentLevel - 1);
      
      let completionStatus = "In Progress";
      if (isCompleted) {
        completionStatus = "Completed";
      } else if (r.status === "NOT_STARTED" || (r.currentLevel === 1 && levelsCompleted === 0 && r.gameTimeSeconds === 0)) {
        completionStatus = "Not Started";
      }

      const row = worksheet.addRow({
        serialNumber: idx + 1,
        contestantName: r.playerName,
        enrollmentNumber: String(r.enrollmentNumber || ""),
        contactNumber: String(r.contactNumber || ""),
        email: r.email,
        branch: r.branch,
        levelsCompleted,
        completionStatus,
        gameTime: formatDuration(r.gameTimeSeconds),
        penaltyTime: `${r.penaltySeconds}s`,
        totalTime: formatDuration(r.finalTimeSeconds),
        registrationDate: formatDate(r.createdAt),
      });

      // Explicitly set text format for enrollment number and contact number to preserve leading zeros
      const enrollCell = row.getCell(3);
      enrollCell.numFmt = "@";
      const contactCell = row.getCell(4);
      contactCell.numFmt = "@";

      row.alignment = { vertical: "middle" };
      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(7).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(8).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(9).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(10).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(11).alignment = { vertical: "middle", horizontal: "center" };
      row.getCell(12).alignment = { vertical: "middle", horizontal: "center" };
    });

    // Generate safe filename with YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const filename = `updates-2k26-contestants-${dateStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

