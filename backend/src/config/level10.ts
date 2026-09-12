/**
 * Authoritative Server-Side Game Configuration for Level 10: "CORE-X" (Final Quest)
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_10_CONFIG = {
  levelId: 10,
  name: "CORE-X",
  location: "Innovation Vault / CORE-X Chamber",
  targetObjectId: "vault_containment_pod",
  targetObjectDisplayName: "CORE-X Containment Pod",
  targetPosition: [0, 0, -3.8] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-10",
    levelId: 10,
    text: "All traces decrypted. Enter the master decompression code to disengage the containment clamps and recover CORE-X.",
    destination: "Innovation Vault",
  },
  challenge: {
    id: "ch-10",
    levelId: 10,
    type: "logic",
    question:
      "To disengage the CORE-X magnetic clamps, input the master decompression code. The override display shows the riddle: 'I have keys but no locks. I have space but no room. You can enter, but you cannot go inside. What am I?'",
    // Authoritative answer — NEVER expose in any response
    answer: "keyboard",
  },
  grantedItem: "core_x_prototype",
  decoys: [
    {
      id: "vault_security_terminal",
      label: "Vault Security Console",
      message: "Monitors displaying status lights of all 10 campus sectors.",
    },
    {
      id: "vault_cryo_chamber",
      label: "Prototype Archive",
      message: "Earlier experimental revisions of AR headsets in glass cases.",
    },
    {
      id: "vault_backup_power",
      label: "Quantum Battery Core",
      message: "An auxiliary power cell radiating faint blue light.",
    },
    {
      id: "vault_schematic_table",
      label: "Holographic Drafting Table",
      message: "Architectural blueprints of CORE-X optical waveguides.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Think about everyday computing input devices right in front of you.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "It has a 'space' bar, an 'enter' key, and numerous other keys.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "The answer is a single word: KEYBOARD.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
