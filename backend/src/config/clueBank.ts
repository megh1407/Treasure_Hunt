/**
 * Authoritative Server-Side Clue Bank for Core Quest Finder
 * 
 * STRICT COMPLIANCE RULES:
 * 1. ZERO destination leaks: Clues MUST NOT contain building names, room names,
 *    room IDs, coordinate tuples, or target object IDs.
 * 2. Every player receives INITIAL_CLUE immediately upon starting Level 1.
 * 3. Completing Level N awards the indirect clue guiding to Level N+1.
 */

export interface AuthoritativeClue {
  readonly id: string;
  readonly levelId: number;
  readonly text: string;
}

/**
 * Initial Clue given to every player immediately when Level 1 starts.
 * Guides the player indirectly to the quiet archive / books sanctuary.
 */
export const INITIAL_CLUE: AuthoritativeClue = {
  id: "clue-initial",
  levelId: 1,
  text: "Thousands of recorded voices rest in unbroken silence. Seek the quiet sanctuary where knowledge is bound in paper and ink.",
};

/**
 * Level progression clues awarded upon completing the corresponding level challenge.
 * Guided indirectly using environmental riddles with zero destination or room leakage.
 */
export const LEVEL_CLUES: Record<number, AuthoritativeClue> = {
  1: {
    id: "clue-1",
    levelId: 1,
    text: "Where metal limbs learn precision and mechanical gears rest beneath silent diagnostic screens, uncover the second trace.",
  },
  2: {
    id: "clue-2",
    levelId: 2,
    text: "Rows of cold silicon glow under humming fans. Seek the solitary terminal flickering with an unprompted cursor.",
  },
  3: {
    id: "clue-3",
    levelId: 3,
    text: "An expansive theater where speeches echo to empty seats. Count seven tiers back to uncover the hidden frequency.",
  },
  4: {
    id: "clue-4",
    levelId: 4,
    text: "A bustling crossroads of aromas and chatter between lectures. Look beneath the quietest corner table for what was left behind.",
  },
  5: {
    id: "clue-5",
    levelId: 5,
    text: "At the institutional heart where lecture corridors intersect, a steel door bears the digital error of something never found.",
  },
  6: {
    id: "clue-6",
    levelId: 6,
    text: "Green boards with copper veins and dancing phosphor waves on glass screens hold the key to the next transmission.",
  },
  7: {
    id: "clue-7",
    levelId: 7,
    text: "Beneath open skies and stone arches where nature borders concrete, an ancient surveyor's mark harbors a forgotten frequency.",
  },
  8: {
    id: "clue-8",
    levelId: 8,
    text: "The subterranean brain pulsing behind secure doors, guarded by biometric locks and sub-zero airflow, awaits your decryption.",
  },
  9: {
    id: "clue-9",
    levelId: 9,
    text: "The fortified core where the campus shields its most advanced confidential prototypes has engaged its primary containment clamps.",
  },
  10: {
    id: "clue-10",
    levelId: 10,
    text: "All traces decrypted. Enter the master decompression sequence to disengage the final containment clamps and recover CORE-X.",
  },
};

/**
 * Returns the initial clue for new game sessions.
 */
export function getInitialClue(): AuthoritativeClue {
  return INITIAL_CLUE;
}

/**
 * Returns the clue earned by completing `completedLevelId`.
 * If level 1 is completed, returns the clue guiding to level 2.
 */
export function getNextClueForCompletedLevel(completedLevelId: number): AuthoritativeClue | null {
  return LEVEL_CLUES[completedLevelId] || null;
}

/**
 * Returns the appropriate active clue for a player at `currentLevelId`.
 * - For level 1, returns INITIAL_CLUE.
 * - For level N > 1, returns LEVEL_CLUES[N - 1].
 */
export function getDefaultClueForLevel(currentLevelId: number): AuthoritativeClue {
  if (currentLevelId <= 1) {
    return INITIAL_CLUE;
  }
  const clue = LEVEL_CLUES[currentLevelId - 1];
  return clue || INITIAL_CLUE;
}

/**
 * Validation check to verify zero leakage across all clues.
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
  const allClues = [INITIAL_CLUE, ...Object.values(LEVEL_CLUES)];

  for (const clue of allClues) {
    const lower = clue.text.toLowerCase();
    for (const forbidden of FORBIDDEN_WORDS) {
      if (lower.includes(forbidden)) {
        errors.push(`Clue ${clue.id} (level ${clue.levelId}) contains forbidden word: '${forbidden}'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
