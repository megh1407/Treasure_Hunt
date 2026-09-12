/**
 * Authoritative Server-Side Game Configuration for Level 9: "Root Access"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_9_CONFIG = {
  levelId: 9,
  name: "Root Access",
  location: "Server Room / Rack Hall",
  targetObjectId: "server_mainframe_console",
  targetObjectDisplayName: "Mainframe Console",
  targetPosition: [0, 0, -4.8] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-9",
    levelId: 9,
    text: "The root override is accepted. The heavy blast doors to the campus Innovation Vault have unlocked. Enter the Secret Room to recover CORE-X.",
    destination: "Secret Room",
  },
  challenge: {
    id: "ch-9",
    levelId: 9,
    type: "cybersecurity",
    question:
      "The mainframe terminal displays: 'Enter the default TCP port number used for secure HTTPS web traffic to verify protocol integrity:'",
    // Authoritative answer — NEVER expose in any response
    answer: "443",
  },
  grantedItem: "admin_override",
  decoys: [
    {
      id: "server_cooling_unit",
      label: "CRAC Cooling Unit",
      message: "Industrial precision air conditioner humming loudly with cold air.",
    },
    {
      id: "server_backup_generator",
      label: "UPS Battery Rack",
      message: "Emergency power supply meters show full charge.",
    },
    {
      id: "server_cable_patch",
      label: "Fiber Patch Panel",
      message: "Tidy bundles of high-speed blue optical cables. All link lights active.",
    },
    {
      id: "server_fire_suppression",
      label: "Halon Gas Console",
      message: "Fire suppression safety panel. The emergency lock is intact.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Standard unencrypted HTTP traffic uses port 80.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Standard encrypted TLS/HTTPS traffic uses a well-known 3-digit port in the 400s.",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "The standard secure web port is 443.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
