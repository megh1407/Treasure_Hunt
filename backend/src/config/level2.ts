/**
 * Authoritative Server-Side Game Configuration for Level 2: "Servo Silence"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_2_CONFIG = {
  levelId: 2,
  name: "Servo Silence",
  location: "Robotics Lab / Assembly Bay",
  targetObjectId: "robot_toolbox",
  targetObjectDisplayName: "Mechanic's Toolbox",
  targetPosition: [2.5, 0, -1.8] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-2",
    levelId: 2,
    text: "Where silicon sleeps in cold racks, reboot the primary terminal.",
    destination: "Computer Lab",
  },
  challenge: {
    id: "ch-2",
    levelId: 2,
    type: "binary",
    question:
      "The robotic arm controller prints the binary status word: 00101010. Convert this byte to decimal to unlock the servos.",
    // Authoritative answer — NEVER expose in any response
    answer: "42",
  },
  grantedItem: "access_card",
  decoys: [
    {
      id: "robot_arm",
      label: "Robotic Assembly Arm",
      message: "Industrial robotic arm powered down. No traces found on the chassis.",
    },
    {
      id: "robot_workbench",
      label: "Work Bench",
      message: "Circuits, solder, and loose wires. Nothing useful here.",
    },
    {
      id: "robot_parts_bin",
      label: "Parts Bin",
      message: "Assorted gears and servos from past projects.",
    },
    {
      id: "robot_terminal",
      label: "Diagnostic Console",
      message: "System idle. Waiting for diagnostic input.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Binary place values from right to left are 1, 2, 4, 8, 16, 32, 64, 128.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Sum the powers of 2 where the bit is 1: 32 + 8 + 2.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "32 plus 8 is 40. Add the last 2 to get the calibration code.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
