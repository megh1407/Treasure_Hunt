/**
 * Domain and API Contract Types for Core Quest Finder
 */

export type CharacterGender = "MALE" | "FEMALE";

export type PlayerStatus =
  | "NOT_STARTED"
  | "SEARCHING"
  | "SOLVING"
  | "COMPLETED"
  | "PAUSED";

export type LevelStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

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

/** DTO for registering / creating a new player */
export interface CreatePlayerDTO {
  playerName: string;
  enrollmentNumber: string;
  team?: string;
  branch?: string;
  contactNumber?: string;
  selectedCharacter?: CharacterGender | "male" | "female";
  email?: string | null;
}

/** Serialized Player representation returned by the API */
export interface PlayerResponseDTO {
  id: string;
  playerName: string;
  enrollmentNumber: string;
  team: string;
  branch?: string | null;
  contactNumber?: string | null;
  email: string | null;
  selectedCharacter: CharacterGender;
  status: PlayerStatus;
  currentLevel: number;
  score: number;
  penaltySeconds: number;
  gameTimeSeconds: number;
  createdAt: string;
  updatedAt: string;
  inventory?: string[];
}

/** Admin API DTOs */
export interface AdminLoginDTO {
  password: string;
}

export interface AdminLoginResponseDTO {
  token: string;
  message: string;
}

export interface AdminStatsDTO {
  totalPlayers: number;
  currentlyPlaying: number;
  completedAllLevels: number;
}

export interface AdminLeaderboardEntryDTO {
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

export interface Top5PlayerDTO {
  playerName: string;
}

/** Response payload for GET /api/health */
export interface HealthResponseDTO {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  timestamp: string;
  env: string;
  database: {
    connected: boolean;
    status: "connected" | "disconnected";
  };
}

/** DTO for starting a game session */
export interface StartSessionDTO {
  playerId: string;
}

/** Response data for POST /api/sessions/start */
export interface StartSessionResponseDTO {
  sessionId: string;
  startTime: number;
  status: PlayerStatus;
  activeClue?: ClueInfo;
}

/** DTO for completing a game session */
export interface CompleteSessionDTO {
  playerId: string;
  sessionId: string;
}

/** Response data for POST /api/sessions/complete */
export interface CompleteSessionResponseDTO {
  sessionId: string;
  status: PlayerStatus;
  gameTimeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
}

/** DTO for pausing an active game session */
export interface PauseSessionDTO {
  playerId: string;
  sessionId: string;
}

/** DTO for resuming a paused game session */
export interface ResumeSessionDTO {
  playerId: string;
  sessionId: string;
}

/** Standardized response DTO for both pause and resume operations */
export interface SessionPauseStateDTO {
  sessionId: string;
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedSeconds: number;
  status: PlayerStatus;
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** DTO for POST /api/game/investigate */
export interface InvestigateDTO {
  playerId: string;
  objectId: string;
}

export interface ClueInfo {
  id: string;
  levelId: number;
  text: string;
  destination?: string;
}

export interface ChallengeInfo {
  id: string;
  levelId: number;
  type: string;
  question: string;
}

export interface InvestigateResponseDTO {
  objectId?: string;
  outcome: "clue" | "decoy" | "cross_level";
  message: string;
  clue?: ClueInfo;
  challenge?: ChallengeInfo;
  grantedItem?: string;
}

/** DTO for POST /api/game/submit-answer */
export interface SubmitAnswerDTO {
  playerId: string;
  challengeId: string;
  answer: string;
}

export interface SubmitAnswerResponseDTO {
  correct: boolean;
  penaltySeconds: number;
  levelCompleted: boolean;
  nextLevel?: number | null;
  nextClue?: ClueInfo;
  message: string;
}

/** DTO for POST /api/game/hint */
export interface RequestHintDTO {
  playerId: string;
  challengeId: string;
  order: number;
}

export interface RequestHintResponseDTO {
  order: number;
  text: string;
  penaltySeconds: number;
}

/** DTO for POST /api/game/scan */
export interface RunScanDTO {
  playerId: string;
  position: [number, number, number] | number[];
  levelId: number;
}

export interface RunScanResponseDTO {
  message: string;
  penaltySeconds: number;
}

/** Active session information returned in recovery endpoint */
export interface ActiveSessionInfoDTO {
  id: string;
  startedAt: number;
  isActive: boolean;
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedSeconds: number;
  statusBeforePause?: PlayerStatus | null;
}

/** Level progress information returned in recovery endpoint */
export interface LevelProgressDataDTO {
  level: number;
  investigatedObjects: string[];
  collectedItems: string[];
  usedHints: number[];
  revealedHints?: { order: number; text: string }[];
  attempts: number;
  activeClue?: ClueInfo;
  assignedQuestion?: ChallengeInfo;
  isSolved?: boolean;
}

/** Response DTO for GET /api/players/:id supporting player recovery */
export interface PlayerRecoveryResponseDTO extends PlayerResponseDTO {
  player: PlayerResponseDTO;
  activeSession: ActiveSessionInfoDTO | null;
  levelProgress?: LevelProgressDataDTO | null;
  inventory?: string[];
  activeClue?: ClueInfo;
}

/** Leaderboard entry DTO for GET /api/leaderboard */
export interface LeaderboardEntryDTO {
  rank: number;
  playerId: string;
  playerName: string;
  team: string;
  level: number;
  currentLevel: number;
  timeSeconds: number;
  gameTimeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
  location: string;
  status: PlayerStatus;
}
