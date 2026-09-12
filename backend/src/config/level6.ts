/**
 * Authoritative Server-Side Game Configuration for Level 6: "Locker 404"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_6_CONFIG = {
  levelId: 6,
  name: "Locker 404",
  location: "Main Building / Central Corridor",
  targetObjectId: "main_locker_404",
  targetObjectDisplayName: "Locker 404",
  targetPosition: [-3.5, 0, -2.5] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-6",
    levelId: 6,
    text: "The sixth trace points to the high-frequency test benches. Find the broken circuit board in the Electronics Lab.",
    destination: "Electronics Lab",
  },
  challenge: {
    id: "ch-6",
    levelId: 6,
    type: "cybersecurity",
    question:
      "Locker 404 is secured with a network subnet mask challenge. A terminal displays an IPv4 address with CIDR notation: 192.168.10.0/26. How many total IP addresses are in this /26 subnet block?",
    // Authoritative answer — NEVER expose in any response
    answer: "64",
  },
  grantedItem: "blue_key",
  decoys: [
    {
      id: "main_trophy_case",
      label: "Trophy Cabinet",
      message: "Silver cups and robotics tournament awards from 2022. No traces found.",
    },
    {
      id: "main_noticeboard",
      label: "Department Noticeboard",
      message: "Exam schedules and seminar announcements about quantum computing.",
    },
    {
      id: "main_reception_desk",
      label: "Reception Desk",
      message: "A visitor sign-in register and unattended telephone. Clean drawers.",
    },
    {
      id: "main_display_kiosk",
      label: "Interactive Directory",
      message: "Campus map touch screen running a generic information loop.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "An IPv4 address consists of 32 bits.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "In a /26 network, the host portion has 32 - 26 = 6 bits.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "2 to the power of 6 (2^6) equals 64 total addresses.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
