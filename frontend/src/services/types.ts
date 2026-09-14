import type {
  ActivityLog,
  Challenge,
  Clue,
  InventoryItemId,
  LeaderboardRow,
  Player,
  PlayerStatus,
} from "@/game/types";

export const VALID_BRANCHES = [
  "CO",
  "CIVIL",
  "EC",
  "Electrical",
  "IC",
  "IT",
  "Mech",
  "Chemical",
  "MCA",
] as const;

export type Branch = (typeof VALID_BRANCHES)[number];

export interface RegisterPayload {
  playerName: string;
  enrollmentNumber: string;
  email: string;
  contactNumber: string;
  branch: Branch | string;
  team?: string;
}

export interface AdminStats {
  totalPlayers: number;
  currentlyPlaying: number;
  completedAllLevels: number;
  gameTimeSeconds?: number | undefined;
  penaltySeconds?: number | undefined;
  totalTimeSeconds?: number | undefined;
}

export interface AdminLeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  enrollmentNumber: string;
  email: string | null;
  contactNumber: string | null;
  branch: string | null;
  team: string;
  currentLevel: number;
  gameTimeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Top5Player {
  rank?: number | undefined;
  playerName: string;
  levelsCompleted?: number | undefined;
  status?: string | undefined;
  totalTime?: string | undefined;
  totalTimeSeconds?: number | undefined;
}

export interface InteractionResult {
  objectId: string;
  outcome: "decoy" | "clue" | "locked" | "cross_level";
  message: string;
  clue?: Clue | undefined;
  challenge?: Omit<Challenge, "answer"> | undefined;
  grantedItem?: InventoryItemId | undefined;
}

export interface AnswerResult {
  correct: boolean;
  penaltySeconds: number;
  levelCompleted: boolean;
  nextLevel: number | null;
  nextClue?: Clue | undefined;
  message: string;
}

export interface ScanResult {
  message: string;
  penaltySeconds: number;
}

export interface LevelProgressData {
  level: number;
  investigatedObjects: string[];
  collectedItems: string[];
  usedHints: number[];
  revealedHints?: { order: number; text: string }[];
  attempts: number;
  activeClue?: Clue | undefined;
  assignedQuestion?: Omit<Challenge, "answer"> | undefined;
  isSolved?: boolean;
}

export interface SessionPauseState {
  sessionId: string;
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedSeconds: number;
  status: PlayerStatus;
}

export interface PlayerRecoveryData {
  player: Player;
  activeSession: {
    id: string;
    startTime: number;
    isActive: boolean;
    isPaused?: boolean;
    pausedAt?: number | null;
    totalPausedSeconds?: number;
    statusBeforePause?: PlayerStatus | null;
  } | null;
  levelProgress?: LevelProgressData | null;
  activeClue?: Clue | undefined;
}

/**
 * The single boundary between the client and the authoritative backend.
 */
export interface GameApi {
  registerPlayer(payload: RegisterPayload): Promise<Player>;
  startSession(
    playerId: string
  ): Promise<{ startTime: number; sessionId?: string | undefined; activeClue?: Clue | undefined }>;
  pauseSession(playerId: string, sessionId: string): Promise<SessionPauseState>;
  resumeSession(playerId: string, sessionId: string): Promise<SessionPauseState>;
  investigateObject(playerId: string, objectId: string): Promise<InteractionResult>;
  submitAnswer(playerId: string, challengeId: string, answer: string): Promise<AnswerResult>;
  requestHint(
    playerId: string,
    challengeId: string,
    order: number,
  ): Promise<{ text: string; penaltySeconds: number }>;
  runScanner(
    playerId: string,
    position: [number, number, number],
    levelId?: number,
  ): Promise<ScanResult>;
  completeSession(playerId: string, sessionId?: string): Promise<Player>;
  getLeaderboard(): Promise<LeaderboardRow[]>;
  getTop5Players(): Promise<Top5Player[]>;
  recoverPlayer(playerId: string): Promise<PlayerRecoveryData | null>;
}

/** Replaced by a Socket.IO client later. */
export interface RealtimeChannel {
  subscribe(handler: (log: ActivityLog) => void): () => void;
  emit(log: Omit<ActivityLog, "id" | "createdAt">): void;
}
