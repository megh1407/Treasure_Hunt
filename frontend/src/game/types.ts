/**
 * Shared domain types.
 *
 * These intentionally mirror the future MongoDB/Mongoose entities
 * (Player, Event, Level, Challenge, GameObject, Attempt, Penalty,
 * InventoryItem, PlayerInventory, PlayerProgress, GameSession, ActivityLog)
 * so the mock service layer can be swapped for the real REST/Socket.IO API
 * without touching UI or game systems.
 */

export type PlayerStatus = "not_started" | "searching" | "solving" | "completed" | "paused";

/** All available scene identifiers. Add new scene IDs here when new rooms are implemented. */
export type SceneId =
  | "campus"
  | "library_interior"
  | "robotics_lab_interior"
  | "computer_lab_interior"
  | "auditorium_interior"
  | "cafeteria_interior"
  | "main_building_interior"
  | "electronics_lab_interior"
  | "garden_interior"
  | "server_room_interior"
  | "secret_room_interior";

export interface Player {
  id: string;
  enrollmentNumber: string;
  playerName: string;
  team: string;
  branch?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  eventId: string;
  status: PlayerStatus;
  currentLevel: number;
  currentBuilding: BuildingId;
  currentRoom: string | null;
  startTime: number | null;
  endTime: number | null;
  gameTimeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
  inventory: InventoryItemId[];
}

export interface EventConfig {
  id: string;
  name: string;
  storyTitle: string;
  storyBody: string[];
  totalLevels: number;
}

export type BuildingId =
  | "main_gate"
  | "main_road"
  | "garden"
  | "library"
  | "computer_lab"
  | "robotics_lab"
  | "electronics_lab"
  | "auditorium"
  | "cafeteria"
  | "main_building"
  | "server_room"
  | "secret_room";

export interface Building {
  id: BuildingId;
  name: string;
  /** top-down position on the campus plane [x, z] */
  position: [number, number];
  size: [number, number, number];
  color: string;
  /** whether an interior scene exists for this prototype */
  enterable: boolean;
  /** door offset relative to building centre [x, z] */
  door: [number, number];
}

export type InventoryItemId =
  | "blue_key"
  | "usb_drive"
  | "access_card"
  | "circuit_piece"
  | "secret_note"
  | "encryption_key"
  | "logic_probe"
  | "survey_marker"
  | "admin_override"
  | "core_x_prototype";

export interface InventoryItem {
  id: InventoryItemId;
  name: string;
  description: string;
  icon: string;
}

export type ObjectKind =
  | "bookshelf"
  | "book"
  | "computer"
  | "table"
  | "chair"
  | "cabinet"
  | "locker"
  | "box"
  | "painting"
  | "noticeboard"
  | "door";

/** Mirrors the future `Object` collection. */
export interface GameObject {
  id: string;
  levelId: number;
  building: BuildingId;
  room: string;
  kind: ObjectKind;
  label: string;
  position: [number, number, number];
  rotationY?: number;
  /** interaction radius in world units */
  radius: number;
  /** decoy text OR the pre-clue flavour text */
  message: string;
  /**
   * Marks the object that holds the level trace. In production this flag is
   * NEVER sent to the client — the server resolves interactions. It exists
   * here only for the offline mock resolver.
   */
  holdsClue?: boolean;
  grantsItem?: InventoryItemId;
  requiresItem?: InventoryItemId;
}

export type ChallengeType =
  | "single_word"
  | "number"
  | "code_output"
  | "multiple_choice"
  | "binary"
  | "hexadecimal"
  | "logic"
  | "mathematics"
  | "cybersecurity";

export interface Hint {
  order: 1 | 2 | 3;
  text: string;
  penaltySeconds: number;
}

export interface Challenge {
  id: string;
  levelId: number;
  type: ChallengeType;
  question: string;
  options?: string[];
  /** mock-only; the real backend keeps answers server-side */
  answer: string;
  penaltySeconds: number;
  hints: Hint[];
  active: boolean;
}

export interface Clue {
  id: string;
  levelId: number;
  text: string;
  destination: string;
  building: BuildingId;
  room: string;
  objectId: string;
  requiredItem: InventoryItemId | null;
  nextLevel: number | null;
}

export interface Level {
  id: number;
  name: string;
  building: BuildingId;
  room: string;
  objective: string;
  clue: Clue;
  challenge: Challenge;
  objects: GameObject[];
  rewardItem?: InventoryItemId;
  playable: boolean;
}

export interface Attempt {
  id: string;
  playerId: string;
  levelId: number;
  challengeId: string;
  answer: string;
  correct: boolean;
  createdAt: number;
}

export type ActivityType =
  | "player_started"
  | "room_entered"
  | "object_investigated"
  | "clue_found"
  | "challenge_opened"
  | "wrong_answer"
  | "penalty_added"
  | "hint_used"
  | "scanner_used"
  | "item_collected"
  | "door_unlocked"
  | "level_completed"
  | "player_completed"
  | "session_paused"
  | "session_resumed";

export interface ActivityLog {
  id: string;
  playerId: string;
  playerName: string;
  type: ActivityType;
  message: string;
  createdAt: number;
}

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  playerName: string;
  team: string;
  level: number;
  timeSeconds: number;
  penaltySeconds: number;
  finalTimeSeconds: number;
  location: string;
  status: PlayerStatus;
}
