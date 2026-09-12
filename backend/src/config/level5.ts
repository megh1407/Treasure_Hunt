/**
 * Authoritative Server-Side Game Configuration for Level 5: "Hidden Recipe"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_5_CONFIG = {
  levelId: 5,
  name: "Hidden Recipe",
  location: "Cafeteria / Dining Hall",
  targetObjectId: "cafe_corner_table",
  targetObjectDisplayName: "Corner Dining Table",
  targetPosition: [3.5, 0, -4.0] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-5",
    levelId: 5,
    text: "The trace leads across the courtyard to the central administration. Look for Locker 404 in the corridor.",
    destination: "Main Building",
  },
  challenge: {
    id: "ch-5",
    levelId: 5,
    type: "single_word",
    question:
      "The chef's note taped under the corner table reveals an encrypted culinary keyword using a Caesar cipher shifted 3 letters forward: 'VDOW'. Shift each letter backward by 3 positions in the alphabet to decrypt the secret ingredient.",
    // Authoritative answer — NEVER expose in any response
    answer: "salt",
  },
  grantedItem: "secret_note",
  decoys: [
    {
      id: "cafe_vending_machine",
      label: "Vending Machine",
      message: "Cold beverage dispensers and snack spirals. Out-of-order signs are taped across the coin slot.",
    },
    {
      id: "cafe_serving_counter",
      label: "Serving Counter",
      message: "Stainless steel food warming trays, clean condiment squeeze bottles, and empty trays.",
    },
    {
      id: "cafe_menu_board",
      label: "Daily Menu Board",
      message: "Today's special: Campus Roast and Chef's Salad. Nutritional disclaimers in fine print.",
    },
    {
      id: "cafe_recycle_station",
      label: "Recycling Station",
      message: "Separate bins for compost, paper cups, and plastic cutlery. Nothing suspicious.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "In a Caesar cipher, each letter is shifted by a fixed number of positions in the alphabet.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Shift each letter in 'VDOW' backward by 3 letters: V -> S, D -> A...",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "V-3=S, D-3=A, O-3=L, W-3=T. The decrypted secret ingredient is SALT.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
