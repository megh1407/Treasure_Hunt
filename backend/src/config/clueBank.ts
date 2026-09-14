/**
 * Authoritative Server-Side Clue Bank for Core Quest Finder
 * 
 * Manages randomized clue locations and sentence variants across all 10 levels.
 * STRICT COMPLIANCE RULES:
 * 1. ZERO destination leaks: Clues MUST NOT contain physical building names,
 *    room names, coordinate tuples, or internal target object IDs.
 * 2. Randomized locations are drawn exclusively from real, existing game-world objects.
 * 3. Multiple sentence variants per location provide fresh, collegiate-level clues.
 * 4. Authoritative persistence ensures a player keeps their assigned location and sentence
 *    across refreshes, reconnects, repeated requests, and wrong answer submissions.
 */

import { LEVEL_1_CLUE_LOCATIONS, ClueLocationConfig, ClueSentenceConfig } from "./clues/level1";
import { LEVEL_2_CLUE_LOCATIONS } from "./clues/level2";
import { LEVEL_3_CLUE_LOCATIONS } from "./clues/level3";
import { LEVEL_4_CLUE_LOCATIONS } from "./clues/level4";
import { LEVEL_5_CLUE_LOCATIONS } from "./clues/level5";
import { LEVEL_6_CLUE_LOCATIONS } from "./clues/level6";
import { LEVEL_7_CLUE_LOCATIONS } from "./clues/level7";
import { LEVEL_8_CLUE_LOCATIONS } from "./clues/level8";
import { LEVEL_9_CLUE_LOCATIONS } from "./clues/level9";
import { LEVEL_10_CLUE_LOCATIONS } from "./clues/level10";

export type { ClueLocationConfig, ClueSentenceConfig };

export interface AuthoritativeClue {
  readonly id: string;
  readonly levelId: number;
  readonly text: string;
}

export interface ClueAssignmentResult {
  readonly location: ClueLocationConfig;
  readonly sentence: ClueSentenceConfig;
  readonly activeClue: AuthoritativeClue;
}

export const CLUES_BY_LEVEL: Record<number, readonly ClueLocationConfig[]> = {
  1: LEVEL_1_CLUE_LOCATIONS,
  2: LEVEL_2_CLUE_LOCATIONS,
  3: LEVEL_3_CLUE_LOCATIONS,
  4: LEVEL_4_CLUE_LOCATIONS,
  5: LEVEL_5_CLUE_LOCATIONS,
  6: LEVEL_6_CLUE_LOCATIONS,
  7: LEVEL_7_CLUE_LOCATIONS,
  8: LEVEL_8_CLUE_LOCATIONS,
  9: LEVEL_9_CLUE_LOCATIONS,
  10: LEVEL_10_CLUE_LOCATIONS,
};

/**
 * Returns all valid hiding locations configured for a specific level.
 */
export function getLocationsForLevel(levelId: number): readonly ClueLocationConfig[] {
  return CLUES_BY_LEVEL[levelId] || [];
}

/**
 * Finds a specific location within a level by its objectId.
 */
export function getLocationInLevel(levelId: number, objectId: string): ClueLocationConfig | null {
  const pool = getLocationsForLevel(levelId);
  return pool.find((loc) => loc.objectId === objectId) || null;
}

/**
 * Finds a specific sentence within a location by its sentenceId.
 */
export function getSentenceForLocation(
  location: ClueLocationConfig,
  sentenceId: string
): ClueSentenceConfig | null {
  return location.sentences.find((s) => s.id === sentenceId) || null;
}

/**
 * Randomly selects a clue location and sentence variant for a player.
 * Avoids locations currently occupied by other active players on the same level.
 * If all locations are occupied, gracefully falls back to the full pool for that level.
 * Never returns null, never blocks, and never deadlocks.
 */
export function selectClueForPlayer(
  levelId: number,
  occupiedLocationIds?: Iterable<string>
): ClueAssignmentResult {
  const pool = getLocationsForLevel(levelId);
  if (pool.length === 0) {
    throw new Error(`[ClueBank] No clue locations configured for level ${levelId}`);
  }

  const occupiedSet = new Set(occupiedLocationIds || []);
  const unoccupied = pool.filter((loc) => !occupiedSet.has(loc.objectId));

  // Prefer unoccupied locations; fall back to full pool if all are occupied
  const candidatePool = unoccupied.length > 0 ? unoccupied : pool;
  const selectedLocation = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  // Randomly select one sentence variant for the chosen location
  const sentenceIndex = Math.floor(Math.random() * selectedLocation.sentences.length);
  const selectedSentence = selectedLocation.sentences[sentenceIndex];

  return {
    location: selectedLocation,
    sentence: selectedSentence,
    activeClue: {
      id: selectedSentence.id,
      levelId,
      text: selectedSentence.text,
    },
  };
}

/**
 * Validates or safely repairs an existing player's assigned location and sentence.
 * If the assigned location/sentence pair is valid, returns it intact.
 * If missing, corrupted, or mismatched, repairs it using a valid pair for that level.
 */
export function repairOrValidateClue(
  levelId: number,
  locationId?: string | null,
  sentenceId?: string | null,
  occupiedLocationIds?: Iterable<string>
): ClueAssignmentResult {
  if (locationId) {
    const loc = getLocationInLevel(levelId, locationId);
    if (loc) {
      if (sentenceId) {
        const sentence = getSentenceForLocation(loc, sentenceId);
        if (sentence) {
          return {
            location: loc,
            sentence,
            activeClue: {
              id: sentence.id,
              levelId,
              text: sentence.text,
            },
          };
        }
      }
      // Location is valid, sentence was missing/invalid: pick a valid sentence for this location
      const sentence = loc.sentences[0];
      return {
        location: loc,
        sentence,
        activeClue: {
          id: sentence.id,
          levelId,
          text: sentence.text,
        },
      };
    }
  }

  // Corrupted or missing: generate fresh assignment
  return selectClueForPlayer(levelId, occupiedLocationIds);
}

/**
 * Returns the canonical clue for Level 1 (backward-compatibility).
 */
export const INITIAL_CLUE: AuthoritativeClue = {
  id: "clue-1-book-s1",
  levelId: 1,
  text: "Thousands of recorded voices rest in unbroken silence. Seek the quiet sanctuary where knowledge is bound in paper and ink.",
};

export function getInitialClue(): AuthoritativeClue {
  return INITIAL_CLUE;
}

/**
 * Returns default canonical clue for a level (used for fallback or HUD hydration).
 */
export function getDefaultClueForLevel(currentLevelId: number): AuthoritativeClue {
  const pool = getLocationsForLevel(currentLevelId);
  if (pool.length > 0) {
    const canonical = pool.find((loc) => loc.isCanonicalTarget) || pool[0];
    const sentence = canonical.sentences[0];
    return {
      id: sentence.id,
      levelId: currentLevelId,
      text: sentence.text,
    };
  }
  return INITIAL_CLUE;
}

/**
 * Returns the default next clue awarded when level N is completed (guiding to level N+1).
 */
export function getNextClueForCompletedLevel(completedLevelId: number): AuthoritativeClue | null {
  if (completedLevelId >= 10) return null;
  return getDefaultClueForLevel(completedLevelId + 1);
}

/**
 * Security audit: validates that ZERO clues contain forbidden building names or internal IDs.
 */
const FORBIDDEN_WORDS = [
  "library",
  "robotics",
  "auditorium",
  "cafeteria",
  "academic",
  "electronics",
  "garden",
  "server room",
  "innovation vault",
  "lib_old_book",
  "robot_arm",
  "pc_terminal_3",
  "audi_seat_7",
  "cafe_table_corner",
  "mab_locker_404",
  "elec_breadboard",
  "garden_stone_marker",
  "server_rack_main",
  "core_x_capsule",
];

export function validateCluesNoLeakage(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let lvl = 1; lvl <= 10; lvl++) {
    const locations = getLocationsForLevel(lvl);
    if (locations.length === 0) {
      errors.push(`Level ${lvl} has zero configured clue locations.`);
    }

    for (const loc of locations) {
      if (loc.sentences.length < 2) {
        errors.push(`Location ${loc.objectId} in level ${lvl} has fewer than 2 sentence variants.`);
      }

      for (const s of loc.sentences) {
        if (!s.text || s.text.trim().length === 0) {
          errors.push(`Sentence ${s.id} in location ${loc.objectId} has empty text.`);
        }

        const lower = s.text.toLowerCase();
        for (const forbidden of FORBIDDEN_WORDS) {
          if (lower.includes(forbidden)) {
            errors.push(`Sentence ${s.id} (level ${lvl}) contains forbidden keyword: '${forbidden}'`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
