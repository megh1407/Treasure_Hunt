import { getLevel } from "@/game/data/levels";
import type {
  Challenge,
  Clue,
  InventoryItemId,
  LeaderboardRow,
  Player,
  PlayerStatus,
} from "@/game/types";
import type {
  AdminLeaderboardEntry,
  AdminStats,
  AnswerResult,
  GameApi,
  InteractionResult,
  PlayerRecoveryData,
  RegisterPayload,
  ScanResult,
  SessionPauseState,
  Top5Player,
} from "./types";

interface BackendApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface BackendPlayerDto {
  id: string;
  playerName: string;
  enrollmentNumber: string;
  team: string;
  branch?: string | null;
  contactNumber?: string | null;
  email: string | null;
  selectedCharacter?: string;
  status: string;
  currentLevel: number;
  score: number;
  penaltySeconds: number;
  gameTimeSeconds: number;
  createdAt: string;
  updatedAt: string;
  inventory?: string[];
}

interface BackendStartSessionDto {
  sessionId: string;
  startTime: number;
  status: string;
}

interface BackendPauseSessionDto {
  sessionId: string;
  isPaused: boolean;
  pausedAt: number | string | null;
  totalPausedSeconds: number;
  status: string;
}

interface BackendInvestigateDto {
  objectId?: string;
  outcome: "decoy" | "clue" | "cross_level";
  message: string;
  clue?: {
    id: string;
    levelId: number;
    text: string;
    destination?: string;
  };
  challenge?: {
    id: string;
    levelId: number;
    type: Challenge["type"];
    question: string;
  };
  grantedItem?: string;
}

interface BackendAnswerDto {
  correct: boolean;
  penaltySeconds: number;
  levelCompleted: boolean;
  nextLevel: number | null;
  nextClue?: {
    id: string;
    levelId: number;
    text: string;
    destination?: string;
  };
  message: string;
}

interface BackendHintDto {
  order: number;
  text: string;
  penaltySeconds: number;
}

interface BackendScanDto {
  message: string;
  penaltySeconds: number;
}

interface BackendCompleteSessionDto {
  sessionId: string;
  status: string;
  gameTimeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
}

interface BackendRecoveryDto extends BackendPlayerDto {
  player?: BackendPlayerDto;
  activeSession?: {
    id: string;
    startedAt: number | string;
    isActive: boolean;
    isPaused?: boolean;
    pausedAt?: number | string | null;
    totalPausedSeconds?: number;
    statusBeforePause?: string | null;
  } | null;
  levelProgress?: {
    level: number;
    investigatedObjects: string[];
    collectedItems: string[];
    usedHints: number[];
    revealedHints?: { order: number; text: string }[];
    attempts: number;
  } | null;
}

export class HttpGameApi implements GameApi {
  private baseUrl: string;
  private activeSessionId: string | null = null;

  constructor(baseUrl?: string) {
    const rawUrl = baseUrl || import.meta.env["VITE_API_URL"] || "http://localhost:5000/api";
    this.baseUrl = rawUrl.replace(/\/+$/, "");
  }

  /**
   * Centralized HTTP helper with robust error handling.
   * Extracts backend error messages and avoids exposing raw fetch implementation details.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    let response: Response;
    try {
      const timeoutSignal =
        !options.signal && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(15000)
          : undefined;

      const effectiveSignal = options.signal || timeoutSignal;
      const fetchOptions: RequestInit = {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      };
      if (effectiveSignal) {
        fetchOptions.signal = effectiveSignal;
      }

      response = await fetch(url, fetchOptions);
    } catch (networkErr: unknown) {
      if (networkErr instanceof Error && (networkErr.name === "TimeoutError" || networkErr.name === "AbortError")) {
        throw new Error(`Request timed out while connecting to game server. Please check your connection.`);
      }
      const msg = networkErr instanceof Error ? networkErr.message : "Network request failed";
      throw new Error(`Unable to connect to game server (${url}): ${msg}`);
    }

    let json: BackendApiResponse<T>;
    try {
      json = (await response.json()) as BackendApiResponse<T>;
    } catch {
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }
      throw new Error("Invalid response received from game server");
    }

    if (!response.ok || json.success === false) {
      const errorMessage =
        json.error || json.message || `Request failed with HTTP status ${response.status}`;
      throw new Error(errorMessage);
    }

    return json.data as T;
  }

  /**
   * Registers a new player via POST /api/players.
   * Normalizes backend PlayerResponseDTO into the frontend Player domain entity.
   */
  async registerPlayer(payload: RegisterPayload): Promise<Player> {
    const data = await this.request<BackendPlayerDto>("/players", {
      method: "POST",
      body: JSON.stringify({
        playerName: payload.playerName.trim(),
        enrollmentNumber: payload.enrollmentNumber.trim(),
        email: payload.email.trim(),
        contactNumber: payload.contactNumber.trim(),
        branch: payload.branch,
        team: payload.team && payload.team.trim() ? payload.team.trim() : payload.branch,
      }),
    });

    const normalizedStatus = (
      data.status ? data.status.toLowerCase() : "not_started"
    ) as PlayerStatus;

    return {
      id: data.id,
      enrollmentNumber: data.enrollmentNumber,
      playerName: data.playerName,
      team: data.team,
      branch: data.branch ?? data.team,
      contactNumber: data.contactNumber ?? null,
      email: data.email,
      eventId: "techfest-2026",
      status: normalizedStatus,
      currentLevel: data.currentLevel ?? 1,
      currentBuilding: "main_gate",
      currentRoom: null,
      startTime: null,
      endTime: null,
      gameTimeSeconds: data.gameTimeSeconds ?? 0,
      penaltySeconds: data.penaltySeconds ?? 0,
      finalTimeSeconds: (data.gameTimeSeconds ?? 0) + (data.penaltySeconds ?? 0),
      inventory: [],
    };
  }

  /**
   * Starts or resumes a game session via POST /api/sessions/start.
   * Stores the session ID and returns the start timestamp.
   */
  async startSession(playerId: string): Promise<{ startTime: number; sessionId: string }> {
    const data = await this.request<BackendStartSessionDto>("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });

    const sessionId = data?.sessionId ?? `session_${Date.now()}`;
    const rawRecord = data as unknown as Record<string, unknown> | undefined;
    const rawStart = rawRecord ? (rawRecord["startTime"] ?? rawRecord["startedAt"]) : undefined;
    const startTime =
      typeof rawStart === "number"
        ? rawStart
        : rawStart
          ? new Date(rawStart as string | number).getTime()
          : Date.now();

    this.activeSessionId = sessionId;

    return {
      startTime,
      sessionId,
    };
  }

  /**
   * Pauses an active game session via POST /api/sessions/pause.
   * Freezes timer and records pause state on the backend.
   */
  async pauseSession(playerId: string, sessionId?: string): Promise<SessionPauseState> {
    const targetSessionId = sessionId || this.activeSessionId;
    if (!targetSessionId) {
      throw new Error("Cannot pause session: No active session ID available.");
    }

    const data = await this.request<BackendPauseSessionDto>("/sessions/pause", {
      method: "POST",
      body: JSON.stringify({
        playerId,
        sessionId: targetSessionId,
      }),
    });

    const parsedPausedAt =
      data.pausedAt === null || data.pausedAt === undefined
        ? null
        : typeof data.pausedAt === "number"
          ? data.pausedAt
          : new Date(data.pausedAt).getTime();

    const normalizedStatus = (
      data.status ? data.status.toLowerCase() : "paused"
    ) as PlayerStatus;

    return {
      sessionId: data.sessionId,
      isPaused: data.isPaused,
      pausedAt: parsedPausedAt,
      totalPausedSeconds: data.totalPausedSeconds ?? 0,
      status: normalizedStatus,
    };
  }

  /**
   * Resumes a paused game session via POST /api/sessions/resume.
   * Authoritatively accumulates paused duration and unfreezes timer on the backend.
   */
  async resumeSession(playerId: string, sessionId?: string): Promise<SessionPauseState> {
    const targetSessionId = sessionId || this.activeSessionId;
    if (!targetSessionId) {
      throw new Error("Cannot resume session: No active session ID available.");
    }

    const data = await this.request<BackendPauseSessionDto>("/sessions/resume", {
      method: "POST",
      body: JSON.stringify({
        playerId,
        sessionId: targetSessionId,
      }),
    });

    const normalizedStatus = (
      data.status ? data.status.toLowerCase() : "searching"
    ) as PlayerStatus;

    return {
      sessionId: data.sessionId,
      isPaused: data.isPaused,
      pausedAt: null,
      totalPausedSeconds: data.totalPausedSeconds ?? 0,
      status: normalizedStatus,
    };
  }

  /**
   * Investigates an in-game object via POST /api/game/investigate.
   * Authoritatively determines if the object is a decoy or clue source.
   */
  async investigateObject(playerId: string, objectId: string): Promise<InteractionResult> {
    const data = await this.request<BackendInvestigateDto>("/game/investigate", {
      method: "POST",
      body: JSON.stringify({ playerId, objectId }),
    });

    if (data.outcome === "clue" && data.challenge) {
      const clue: Clue | undefined = data.clue
        ? {
            id: data.clue.id,
            levelId: data.clue.levelId,
            text: data.clue.text,
            destination: data.clue.destination || "",
            building: getLevel(data.clue.levelId).clue.building,
            room: getLevel(data.clue.levelId).clue.room,
            objectId: data.objectId ?? objectId,
            requiredItem: null,
            nextLevel: getLevel(data.clue.levelId).clue.nextLevel,
          }
        : undefined;

      const challenge: Omit<Challenge, "answer"> = {
        id: data.challenge.id,
        levelId: data.challenge.levelId,
        type: data.challenge.type,
        question: data.challenge.question,
        penaltySeconds: 30,
        hints: [],
        active: true,
      };

      return {
        objectId: data.objectId ?? objectId,
        outcome: "clue",
        message: data.message,
        clue,
        challenge,
        grantedItem: data.grantedItem as InventoryItemId | undefined,
      };
    }

    if (data.outcome === "cross_level") {
      return {
        objectId: data.objectId ?? objectId,
        outcome: "cross_level",
        message: data.message,
      };
    }

    return {
      objectId: data.objectId ?? objectId,
      outcome: "decoy",
      message: data.message || "Nothing useful was found.",
    };
  }

  /**
   * Validates player answer for the current level's challenge via POST /api/game/submit-answer.
   */
  async submitAnswer(
    playerId: string,
    challengeId: string,
    answer: string,
  ): Promise<AnswerResult> {
    const data = await this.request<BackendAnswerDto>("/game/submit-answer", {
      method: "POST",
      body: JSON.stringify({ playerId, challengeId, answer }),
    });

    const nextClue: Clue | undefined = data.nextClue
      ? {
          id: data.nextClue.id,
          levelId: data.nextClue.levelId,
          text: data.nextClue.text,
          destination: data.nextClue.destination || "",
          building: getLevel(data.nextClue.levelId).clue.building,
          room: getLevel(data.nextClue.levelId).clue.room,
          objectId: getLevel(data.nextClue.levelId).clue.objectId,
          requiredItem: null,
          nextLevel: getLevel(data.nextClue.levelId).clue.nextLevel,
        }
      : undefined;

    return {
      correct: data.correct,
      penaltySeconds: data.penaltySeconds,
      levelCompleted: data.levelCompleted,
      nextLevel: data.nextLevel ?? null,
      nextClue,
      message: data.message,
    };
  }

  /**
   * Requests a progressive hint for the challenge via POST /api/game/hint.
   */
  async requestHint(
    playerId: string,
    challengeId: string,
    order: number,
  ): Promise<{ text: string; penaltySeconds: number }> {
    const data = await this.request<BackendHintDto>("/game/hint", {
      method: "POST",
      body: JSON.stringify({ playerId, challengeId, order }),
    });

    return {
      text: data.text,
      penaltySeconds: data.penaltySeconds,
    };
  }

  /**
   * Runs the AR Radar Scanner via POST /api/game/scan.
   */
  async runScanner(
    playerId: string,
    position: [number, number, number],
    levelId?: number,
  ): Promise<ScanResult> {
    const data = await this.request<BackendScanDto>("/game/scan", {
      method: "POST",
      body: JSON.stringify({
        playerId,
        position,
        levelId: levelId ?? 1,
      }),
    });

    return {
      message: data.message,
      penaltySeconds: data.penaltySeconds,
    };
  }

  /**
   * Finalizes the player's active session via POST /api/sessions/complete.
   */
  async completeSession(playerId: string, sessionId?: string): Promise<Player> {
    const targetSessionId = sessionId || this.activeSessionId;
    if (!targetSessionId) {
      throw new Error("Cannot complete session: No active session ID available.");
    }

    const data = await this.request<BackendCompleteSessionDto>("/sessions/complete", {
      method: "POST",
      body: JSON.stringify({
        playerId,
        sessionId: targetSessionId,
      }),
    });

    this.activeSessionId = null;

    return {
      id: playerId,
      enrollmentNumber: "",
      playerName: "",
      team: "",
      eventId: "techfest-2026",
      status: "completed",
      currentLevel: 2,
      currentBuilding: "library",
      currentRoom: null,
      startTime: null,
      endTime: Date.now(),
      gameTimeSeconds: data.gameTimeSeconds,
      penaltySeconds: data.penaltySeconds,
      finalTimeSeconds: data.finalTimeSeconds,
      inventory: [],
    };
  }

  /**
   * Fetches the global leaderboard from GET /api/leaderboard.
   * Throws a clear API error if the endpoint is not yet implemented or fails.
   */
  async getLeaderboard(): Promise<LeaderboardRow[]> {
    return await this.request<LeaderboardRow[]>("/leaderboard", {
      method: "GET",
    });
  }

  /**
   * Recovers player profile and active session via GET /api/players/:id.
   * Returns null if player does not exist.
   */
  async recoverPlayer(playerId: string): Promise<PlayerRecoveryData | null> {
    try {
      const data = await this.request<BackendRecoveryDto>(`/players/${playerId}`, {
        method: "GET",
      });

      if (!data) return null;
      const raw = data.player || data;
      const normalizedStatus = (
        raw.status ? raw.status.toLowerCase() : "not_started"
      ) as PlayerStatus;

      const activeSessionData = data.activeSession;
      let sessionStartTime: number | null = null;
      let activeSession: PlayerRecoveryData["activeSession"] = null;

      if (activeSessionData && activeSessionData.isActive) {
        const rawSessionStart =
          activeSessionData.startedAt ??
          (activeSessionData as unknown as Record<string, unknown>)["startTime"];
        sessionStartTime =
          typeof rawSessionStart === "number"
            ? rawSessionStart
            : rawSessionStart
              ? new Date(rawSessionStart as string | number).getTime()
              : Date.now();

        const parsedPausedAt =
          activeSessionData.pausedAt === null || activeSessionData.pausedAt === undefined
            ? null
            : typeof activeSessionData.pausedAt === "number"
              ? activeSessionData.pausedAt
              : new Date(activeSessionData.pausedAt).getTime();

        const statusBeforePauseNorm = activeSessionData.statusBeforePause
          ? (activeSessionData.statusBeforePause.toLowerCase() as PlayerStatus)
          : null;

        activeSession = {
          id: activeSessionData.id,
          startTime: sessionStartTime,
          isActive: true,
          isPaused: Boolean(activeSessionData.isPaused),
          pausedAt: parsedPausedAt,
          totalPausedSeconds: activeSessionData.totalPausedSeconds ?? 0,
          statusBeforePause: statusBeforePauseNorm,
        };

        this.activeSessionId = activeSessionData.id;
      }

      const levelProgress = data.levelProgress ?? null;

      const cumulativeInv = (
        raw.inventory && Array.isArray(raw.inventory) && raw.inventory.length > 0
          ? raw.inventory
          : levelProgress?.collectedItems ?? []
      ) as InventoryItemId[];

      const player: Player = {
        id: raw.id,
        enrollmentNumber: raw.enrollmentNumber,
        playerName: raw.playerName,
        team: raw.team,
        branch: raw.branch ?? raw.team,
        contactNumber: raw.contactNumber ?? null,
        email: raw.email,
        eventId: "techfest-2026",
        status: normalizedStatus,
        currentLevel: raw.currentLevel ?? 1,
        currentBuilding: "main_gate",
        currentRoom: null,
        startTime: sessionStartTime,
        endTime: null,
        gameTimeSeconds: raw.gameTimeSeconds ?? 0,
        penaltySeconds: raw.penaltySeconds ?? 0,
        finalTimeSeconds: (raw.gameTimeSeconds ?? 0) + (raw.penaltySeconds ?? 0),
        inventory: cumulativeInv,
      };

      return {
        player,
        activeSession,
        levelProgress,
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieves safe player-facing top 5 standings.
   */
  async getTop5Players(): Promise<Top5Player[]> {
    const data = await this.request<{ playerName: string }[]>("/leaderboard/top5");
    return data.map((d) => ({ playerName: d.playerName }));
  }

  /**
   * Authenticates admin with password and returns session token.
   */
  async adminLogin(password: string): Promise<{ token: string; message: string }> {
    return await this.request<{ token: string; message: string }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Logs out admin.
   */
  async adminLogout(token?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await this.request<void>("/admin/logout", {
        method: "POST",
        headers,
      });
    } catch {
      // Ignore logout errors
    }
  }

  /**
   * Retrieves aggregate operational statistics for the admin control room.
   */
  async getAdminStats(token: string): Promise<AdminStats> {
    return await this.request<AdminStats>("/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Retrieves full authoritative leaderboard for organizers.
   */
  async getAdminLeaderboard(token: string): Promise<AdminLeaderboardEntry[]> {
    return await this.request<AdminLeaderboardEntry[]>("/admin/leaderboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Searches players across name, enrollment, email, contact, and branch.
   */
  async adminSearchPlayers(token: string, query: string): Promise<AdminLeaderboardEntry[]> {
    return await this.request<AdminLeaderboardEntry[]>(
      `/admin/search?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  /**
   * Deletes a player and associated game records.
   */
  async deletePlayer(token: string, playerId: string): Promise<void> {
    await this.request<void>(`/admin/players/${encodeURIComponent(playerId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
