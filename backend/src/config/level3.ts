/**
 * Authoritative Server-Side Game Configuration for Level 3: "Cold Boot"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_3_CONFIG = {
  levelId: 3,
  name: "Cold Boot",
  location: "Computer Lab / Lab A",
  targetObjectId: "computer_server_rack",
  targetObjectDisplayName: "Server Rack",
  targetPosition: [0, 0, -5.5] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-3",
    levelId: 3,
    text: "The trace echoes across the main hall. Check the seventh row.",
    destination: "Auditorium",
  },
  challenge: {
    id: "ch-3",
    levelId: 3,
    type: "hexadecimal",
    question:
      "The server diagnostic displays the hexadecimal access code 3F. Convert this hexadecimal value to decimal to unlock the encrypted system.",
    // Authoritative answer — NEVER expose in any response
    answer: "63",
  },
  grantedItem: "encryption_key",
  decoys: [
    {
      id: "computer_terminal",
      label: "Workstation Terminal",
      message: "Terminal prompt is locked. Authentication requires system supervisor bypass.",
    },
    {
      id: "computer_workstation",
      label: "Lab Workstation",
      message: "Monitors, keyboards, and notebooks with scribbled network IPs.",
    },
    {
      id: "computer_network_switch",
      label: "Network Switch",
      message: "Activity lights blinking rapidly. VLAN routing tables show normal campus traffic.",
    },
    {
      id: "computer_parts_table",
      label: "Hardware Bench",
      message: "Disassembled motherboards, RAM modules, and anti-static wristbands.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Hexadecimal is a base-16 number system.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "The symbols 0–9 represent values zero through nine, while A–F represent values ten through fifteen.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "3F means 3 × 16 + 15.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
