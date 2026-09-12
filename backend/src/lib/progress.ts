/**
 * Shared Level Progress Data Structures and Normalization Helper
 * 
 * Ensures all progress reads/writes are strictly validated, deduplicated,
 * and resilient against legacy, null, or malformed data.
 */

export interface LevelProgressData {
  investigatedObjects: string[];
  collectedItems: string[];
  usedHints: number[];
  attempts: number;
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

  return {
    investigatedObjects,
    collectedItems,
    usedHints,
    attempts,
  };
}
