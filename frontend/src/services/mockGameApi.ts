/**
 * Development-only offline mock implementation of GameApi.
 * 
 * Kept strictly isolated in this file so that it is NEVER bundled
 * into client production builds.
 */

import { GAME_CONFIG } from "@/game/config";
import { getLevel, LEVELS } from "@/game/data/levels";
import type { LeaderboardRow, Player, PlayerStatus } from "@/game/types";
import type {
  AnswerResult,
  GameApi,
  InteractionResult,
  LevelProgressData,
  PlayerRecoveryData,
  RegisterPayload,
  ScanResult,
  SessionPauseState,
} from "./types";

const delay = (ms = 0) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

interface MockSessionPauseData {
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedSeconds: number;
  statusBeforePause: PlayerStatus | null;
}

export class MockGameApi implements GameApi {
  private players = new Map<string, Player>();
  private progress = new Map<string, LevelProgressData>();
  private sessionPauseStates = new Map<string, MockSessionPauseData>();

  private getOrCreateProgress(playerId: string, level: number): LevelProgressData {
    let p = this.progress.get(playerId);
    if (!p || p.level !== level) {
      p = {
        level,
        investigatedObjects: [],
        collectedItems: [],
        usedHints: [],
        revealedHints: [],
        attempts: 0,
      };
      this.progress.set(playerId, p);
    }
    return p;
  }

  async registerPlayer(payload: RegisterPayload): Promise<Player> {
    const branch = payload.branch || payload.team || "IT";
    const player: Player = {
      id: `p_${Math.random().toString(36).slice(2, 10)}`,
      playerName: payload.playerName,
      enrollmentNumber: payload.enrollmentNumber,
      team: payload.team || branch,
      branch,
      contactNumber: payload.contactNumber || null,
      email: payload.email || null,
      eventId: "techfest-2026",
      status: "not_started",
      currentLevel: 1,
      currentBuilding: "main_gate",
      currentRoom: null,
      startTime: null,
      endTime: null,
      gameTimeSeconds: 0,
      penaltySeconds: 0,
      finalTimeSeconds: 0,
      inventory: [],
    };
    this.players.set(player.id, player);
    return player;
  }

  async getTop5Players(): Promise<{ playerName: string }[]> {
    const list = await this.getLeaderboard();
    return list.slice(0, 5).map((r) => ({ playerName: r.playerName }));
  }

  async startSession(playerId: string) {
    const startTime = Date.now();
    const p = this.players.get(playerId);
    if (p) {
      p.startTime = startTime;
      p.status = "searching";
    }
    const sessionId = `mock_session_${playerId}`;
    this.sessionPauseStates.set(sessionId, {
      isPaused: false,
      pausedAt: null,
      totalPausedSeconds: 0,
      statusBeforePause: null,
    });
    return { startTime, sessionId };
  }

  async pauseSession(playerId: string, sessionId: string): Promise<SessionPauseState> {
    const player = this.players.get(playerId);
    if (!player) throw new Error("Player not found");
    let state = this.sessionPauseStates.get(sessionId);
    if (!state) {
      state = {
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        statusBeforePause: null,
      };
      this.sessionPauseStates.set(sessionId, state);
    }

    if (!state.isPaused) {
      state.isPaused = true;
      state.pausedAt = Date.now();
      state.statusBeforePause = player.status;
      player.status = "paused";
    }

    return {
      sessionId,
      isPaused: state.isPaused,
      pausedAt: state.pausedAt,
      totalPausedSeconds: state.totalPausedSeconds,
      status: player.status,
    };
  }

  async resumeSession(playerId: string, sessionId: string): Promise<SessionPauseState> {
    const player = this.players.get(playerId);
    if (!player) throw new Error("Player not found");
    let state = this.sessionPauseStates.get(sessionId);
    if (!state) {
      state = {
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        statusBeforePause: null,
      };
      this.sessionPauseStates.set(sessionId, state);
    }

    if (state.isPaused && state.pausedAt) {
      const pausedDuration = Math.max(0, Math.floor((Date.now() - state.pausedAt) / 1000));
      state.totalPausedSeconds += pausedDuration;
      state.isPaused = false;
      state.pausedAt = null;
      player.status = state.statusBeforePause || "searching";
      state.statusBeforePause = null;
    }

    return {
      sessionId,
      isPaused: state.isPaused,
      pausedAt: null,
      totalPausedSeconds: state.totalPausedSeconds,
      status: player.status,
    };
  }

  async investigateObject(playerId: string, objectId: string): Promise<InteractionResult> {
    const sessionId = `mock_session_${playerId}`;
    const pauseState = this.sessionPauseStates.get(sessionId);
    if (!pauseState) {
      throw new Error("No active game session found. Please start a session before investigating.");
    }
    if (pauseState?.isPaused) {
      throw new Error("Game session is currently paused. Resume session before continuing.");
    }

    const player = this.players.get(playerId);
    const currentLevel = player?.currentLevel ?? 1;
    const prog = this.getOrCreateProgress(playerId, currentLevel);
    if (!prog.investigatedObjects.includes(objectId)) {
      prog.investigatedObjects.push(objectId);
    }

    for (const level of LEVELS) {
      const obj = level.objects.find((o) => o.id === objectId);
      if (!obj) continue;
      if (obj.holdsClue) {
        if (obj.grantsItem && !prog.collectedItems.includes(obj.grantsItem)) {
          prog.collectedItems.push(obj.grantsItem);
          if (player && !player.inventory.includes(obj.grantsItem)) {
            player.inventory.push(obj.grantsItem);
          }
        }
        if (player) {
          player.status = "solving";
        }
        const { answer: _answer, ...safeChallenge } = level.challenge;
        return {
          objectId,
          outcome: "clue",
          message: obj.message,
          challenge: safeChallenge,
          grantedItem: obj.grantsItem,
        };
      }
      return { objectId, outcome: "decoy", message: obj.message };
    }
    return { objectId, outcome: "decoy", message: "Nothing of interest here." };
  }

  async submitAnswer(
    playerId: string,
    challengeId: string,
    answer: string,
  ): Promise<AnswerResult> {
    const sessionId = `mock_session_${playerId}`;
    const pauseState = this.sessionPauseStates.get(sessionId);
    if (!pauseState) {
      throw new Error("No active game session found. Please start a session before submitting an answer.");
    }
    if (pauseState?.isPaused) {
      throw new Error("Game session is currently paused. Resume session before continuing.");
    }

    const player = this.players.get(playerId);
    const currentLevel = player?.currentLevel ?? 1;
    const prog = this.getOrCreateProgress(playerId, currentLevel);
    prog.attempts += 1;

    const level = LEVELS.find((l) => l.challenge.id === challengeId);
    // Development-only test mock answers
    const MOCK_DEV_ANSWERS: Record<string, string> = {
      "ch-1": "65",
      "ch-2": "42",
      "ch-3": "63",
      "ch-4": "159",
      "ch-5": "salt",
      "ch-6": "64",
      "ch-7": "90",
      "ch-8": "127",
      "ch-9": "443",
      "ch-10": "keyboard",
    };
    const expected = MOCK_DEV_ANSWERS[challengeId] || level?.challenge.answer || "";
    const correct =
      expected.length > 0 && answer.trim().toLowerCase() === expected.trim().toLowerCase();

    if (!correct) {
      if (player) {
        player.penaltySeconds += GAME_CONFIG.penalties.wrongAnswer;
      }
    } else if (player) {
      if (level?.clue.nextLevel) {
        player.currentLevel = level.clue.nextLevel;
        player.status = "searching";
        this.getOrCreateProgress(playerId, level.clue.nextLevel);
      } else {
        player.status = "completed";
      }
    }
    return {
      correct,
      penaltySeconds: correct ? 0 : GAME_CONFIG.penalties.wrongAnswer,
      levelCompleted: correct,
      nextLevel: correct ? (level?.clue.nextLevel ?? null) : null,
      nextClue: correct ? level?.clue : undefined,
      message: correct
        ? "Trace decrypted. Level complete."
        : "Incorrect. The terminal rejects your input.",
    };
  }

  async requestHint(playerId: string, challengeId: string, order: number) {
    await delay(60);
    const sessionId = `mock_session_${playerId}`;
    const pauseState = this.sessionPauseStates.get(sessionId);
    if (!pauseState) {
      throw new Error("No active game session found. Please start a session before requesting hints.");
    }
    if (pauseState?.isPaused) {
      throw new Error("Game session is currently paused. Resume session before continuing.");
    }

    const player = this.players.get(playerId);
    const currentLevel = player?.currentLevel ?? 1;
    const prog = this.getOrCreateProgress(playerId, currentLevel);
    const level = LEVELS.find((l) => l.challenge.id === challengeId);
    const hint = level?.challenge.hints.find((h) => h.order === order);

    const isAlreadyUsed = prog.usedHints.includes(order);
    if (!isAlreadyUsed) {
      prog.usedHints.push(order);
      prog.usedHints.sort((a, b) => a - b);
      if (player && hint) {
        player.penaltySeconds += hint.penaltySeconds;
      }
    }
    if (hint && !prog.revealedHints?.some((r) => r.order === order)) {
      prog.revealedHints = [...(prog.revealedHints ?? []), { order, text: hint.text }];
    }

    return {
      text: hint?.text ?? "No further hints available.",
      penaltySeconds: isAlreadyUsed ? 0 : (hint?.penaltySeconds ?? 0),
    };
  }

  async runScanner(
    playerId: string,
    position: [number, number, number],
    levelId?: number,
  ): Promise<ScanResult> {
    const sessionId = `mock_session_${playerId}`;
    const pauseState = this.sessionPauseStates.get(sessionId);
    if (!pauseState) {
      throw new Error("No active game session found. Please start a session before scanning.");
    }
    await delay(GAME_CONFIG.scanner.durationMs);
    const player = this.players.get(playerId);
    const activeLevelId = levelId ?? player?.currentLevel ?? 1;
    const level = getLevel(activeLevelId);
    const target = level.objects.find((o) => o.holdsClue);
    let message = "Nothing unusual detected.";
    if (target) {
      const dx = target.position[0] - position[0];
      const dz = target.position[2] - position[2];
      const dist = Math.hypot(dx, dz);
      if (dist < GAME_CONFIG.scanner.nearRange) message = "Unusual signal detected nearby.";
      else if (dist < GAME_CONFIG.scanner.nearRange * 2)
        message = "Faint electronic activity detected in this sector.";
    }
    return { message, penaltySeconds: GAME_CONFIG.penalties.scannerUse };
  }

  async completeSession(playerId: string, sessionId?: string): Promise<Player> {
    const p = this.players.get(playerId);
    if (!p) throw new Error("Unknown player");
    const targetSessionId = sessionId || `mock_session_${playerId}`;
    const pauseData = this.sessionPauseStates.get(targetSessionId);
    let totalPaused = pauseData?.totalPausedSeconds ?? 0;
    if (pauseData?.isPaused && pauseData.pausedAt) {
      totalPaused += Math.max(0, Math.floor((Date.now() - pauseData.pausedAt) / 1000));
      pauseData.isPaused = false;
      pauseData.pausedAt = null;
      pauseData.totalPausedSeconds = totalPaused;
    }
    p.status = "completed";
    p.endTime = Date.now();
    const rawElapsed = p.startTime ? Math.floor((p.endTime - p.startTime) / 1000) : 0;
    p.gameTimeSeconds = Math.max(0, rawElapsed - totalPaused);
    p.finalTimeSeconds = p.gameTimeSeconds + p.penaltySeconds;
    this.sessionPauseStates.delete(targetSessionId);
    return p;
  }

  async getLeaderboard(): Promise<LeaderboardRow[]> {
    const { MOCK_LEADERBOARD } = await import("./mockData");
    return MOCK_LEADERBOARD;
  }

  async recoverPlayer(playerId: string): Promise<PlayerRecoveryData | null> {
    const player = this.players.get(playerId);
    if (!player) return null;
    const progress = this.progress.get(playerId) ?? null;
    const sessionId = `mock_session_${player.id}`;
    const pauseData = this.sessionPauseStates.get(sessionId);
    return {
      player,
      activeSession: player.startTime
        ? {
            id: sessionId,
            startTime: player.startTime,
            isActive: player.status !== "completed",
            isPaused: pauseData?.isPaused ?? false,
            pausedAt: pauseData?.pausedAt ?? null,
            totalPausedSeconds: pauseData?.totalPausedSeconds ?? 0,
            statusBeforePause: pauseData?.statusBeforePause ?? null,
          }
        : null,
      levelProgress: progress,
    };
  }
}
