/**
 * Authoritative Server-Side Game Configuration for Level 8: "Buried Marker"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_8_CONFIG = {
  levelId: 8,
  name: "Buried Marker",
  location: "East Lawn / Botanical Pavilion",
  targetObjectId: "garden_stone_marker",
  targetObjectDisplayName: "Stone Marker",
  targetPosition: [0, 0, -2.5] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-8",
    levelId: 8,
    text: "The subterranean brain pulsing behind secure doors, guarded by biometric locks and sub-zero airflow, awaits your decryption.",
    destination: "",
  },
  challenge: {
    id: "ch-8",
    levelId: 8,
    type: "mathematics",
    question:
      "The geodetic marker bears a mathematical sequence: 3, 7, 15, 31, 63, ?. What is the next integer in this sequence to unlock the coordinates?",
    // Authoritative answer — NEVER expose in any response
    answer: "127",
  },
  grantedItem: "survey_marker",
  decoys: [
    {
      id: "garden_bench",
      label: "Stone Bench",
      message: "Cool carved granite bench sheltered under campus foliage.",
    },
    {
      id: "garden_fountain",
      label: "Decorative Fountain",
      message: "Gentle recirculating water basin. No electronic signatures.",
    },
    {
      id: "garden_planter",
      label: "Botanical Planter",
      message: "Lush perennial shrubs and campus landscaping mulch.",
    },
    {
      id: "garden_sundial",
      label: "Brass Sundial",
      message: "A gnomon casting a sharp shadow. The motto reads: 'TEMPUS FUGIT'.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Look at the differences: +4, +8, +16, +32...",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Each term is double the previous term plus one.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "63 * 2 = 126, plus 1 equals 127.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
