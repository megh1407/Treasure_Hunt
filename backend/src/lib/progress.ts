/**
 * Shared Level Progress Data Structures and Normalization Helper
 * 
 * Ensures all progress reads/writes are strictly validated, deduplicated,
 * and resilient against legacy, null, or malformed data.
 */

export interface ActiveClueData {
  id: string;
  levelId: number;
  text: string;
}

export interface LevelProgressData {
  investigatedObjects: string[];
  collectedItems: string[];
  usedHints: number[];
  attempts: number;
  assignedQuestionId?: string;
  assignedClueLocationId?: string;
  assignedClueSentenceId?: string;
  activeClue?: ActiveClueData;
  isSolved?: boolean;
  submittedAnswer?: string;
  solvedAt?: string;
}

/**
 * Normalizes raw/database progress data into a guaranteed, clean LevelProgressData shape.
 * 
 * Safe defaults:
 * {
 *   investigatedObjects: [],
 *   collectedItems: [],
 *   usedHints: [],
 *   attempts: 0
 * }
 */
export function normalizeProgressData(raw: unknown): LevelProgressData {
  if (!raw || typeof raw !== "object") {
    return {
      investigatedObjects: [],
      collectedItems: [],
      usedHints: [],
      attempts: 0,
    };
  }

  const obj = raw as Record<string, unknown>;

  const investigatedObjects = Array.isArray(obj["investigatedObjects"])
    ? Array.from(
        new Set(
          obj["investigatedObjects"]
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim())
        )
      )
    : [];

  const collectedItems = Array.isArray(obj["collectedItems"])
    ? Array.from(
        new Set(
          obj["collectedItems"]
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .map((item) => item.trim())
        )
      )
    : [];

  const usedHints = Array.isArray(obj["usedHints"])
    ? Array.from(
        new Set(
          obj["usedHints"]
            .filter(
              (item): item is number =>
                typeof item === "number" && !isNaN(item) && Number.isInteger(item) && item > 0
            )
        )
      ).sort((a, b) => a - b)
    : [];

  const attempts =
    typeof obj["attempts"] === "number" && !isNaN(obj["attempts"]) && obj["attempts"] >= 0
      ? Math.floor(obj["attempts"])
      : 0;

  const result: LevelProgressData = {
    investigatedObjects,
    collectedItems,
    usedHints,
    attempts,
  };

  if (typeof obj["assignedQuestionId"] === "string" && obj["assignedQuestionId"].trim().length > 0) {
    result.assignedQuestionId = obj["assignedQuestionId"].trim();
  }

  if (typeof obj["assignedClueLocationId"] === "string" && obj["assignedClueLocationId"].trim().length > 0) {
    result.assignedClueLocationId = obj["assignedClueLocationId"].trim();
  }

  if (typeof obj["assignedClueSentenceId"] === "string" && obj["assignedClueSentenceId"].trim().length > 0) {
    result.assignedClueSentenceId = obj["assignedClueSentenceId"].trim();
  }

  if (obj["activeClue"] && typeof obj["activeClue"] === "object") {
    const clueObj = obj["activeClue"] as Record<string, unknown>;
    if (
      typeof clueObj["id"] === "string" &&
      typeof clueObj["levelId"] === "number" &&
      typeof clueObj["text"] === "string"
    ) {
      result.activeClue = {
        id: clueObj["id"].trim(),
        levelId: clueObj["levelId"],
        text: clueObj["text"].trim(),
      };
    }
  }

  if (typeof obj["isSolved"] === "boolean") {
    result.isSolved = obj["isSolved"];
  }

  if (typeof obj["submittedAnswer"] === "string") {
    result.submittedAnswer = obj["submittedAnswer"];
  }

  if (typeof obj["solvedAt"] === "string") {
    result.solvedAt = obj["solvedAt"];
  }

  return result;
}
