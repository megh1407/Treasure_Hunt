/**
 * Authoritative Server-Side Game Configuration for Level 1: "The Silent Archive"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_1_CONFIG = {
  levelId: 1,
  name: "The Silent Archive",
  location: "Library / Reading Hall",
  targetObjectId: "lib_old_book",
  targetObjectDisplayName: "Worn Book",
  targetPosition: [-1.6, 0, -1.4] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-1",
    levelId: 1,
    text: "Where machines learn to move, the second trace waits beneath the tools.",
    destination: "Robotics Lab",
  },
  challenge: {
    id: "ch-1",
    levelId: 1,
    type: "logic",
    question: "The archive terminal prints a sequence: 2, 3, 5, 9, 17, 33, ?",
    // Authoritative answer — NEVER expose in any response
    answer: "65",
  },
  grantedItem: "usb_drive",
  hints: {
    1: {
      order: 1,
      text: "The pattern doubles each number and subtracts one.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Look at how each number is generated from the previous number.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "Try multiplying 33 by 2, then adjusting the result.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
