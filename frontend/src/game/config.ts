import type { EventConfig, InventoryItem, InventoryItemId } from "./types";

/** Centralised, tunable game configuration. Never hardcode these in the UI. */
export const GAME_CONFIG = {
  totalLevels: 10,
  penalties: {
    wrongAnswer: 30,
    scannerUse: 10,
    hint: [15, 30, 45] as const,
  },
  interaction: {
    defaultRadius: 2.6,
    promptKey: "E",
  },
  player: {
    walkSpeed: 6.2,
    runSpeed: 9.4,
    eyeHeight: 1.65,
    thirdPersonDistance: 6.5,
    thirdPersonHeight: 3.1,
  },
  scanner: {
    durationMs: 2200,
    cooldownMs: 6000,
    nearRange: 6,
  },
} as const;

export const EVENT: EventConfig = {
  id: "techfest-2026",
  name: "Updates 2K26",
  storyTitle: "THE LOST AR-VR CORE",
  storyBody: [
    "A mysterious AR/VR prototype called CORE-X has disappeared from the campus innovation vault.",
    "Ten encrypted traces are hidden across the virtual campus — inside labs, lockers, terminals and forgotten rooms.",
    "Explore. Investigate. Solve. Unlock. Recover CORE-X before the clock defeats you.",
  ],
  totalLevels: 10,
};

export const INVENTORY_CATALOG: Record<InventoryItemId, InventoryItem> = {
  blue_key: {
    id: "blue_key",
    name: "Blue Key",
    description: "Opens restricted maintenance doors across the campus.",
    icon: "key",
  },
  usb_drive: {
    id: "usb_drive",
    name: "USB Drive",
    description: "Contains a partially corrupted CORE-X firmware dump.",
    icon: "usb",
  },
  access_card: {
    id: "access_card",
    name: "Access Card",
    description: "Grants clearance to secured lab terminals.",
    icon: "card",
  },
  circuit_piece: {
    id: "circuit_piece",
    name: "Circuit Piece",
    description: "A fragment of the CORE-X mainboard.",
    icon: "cpu",
  },
  secret_note: {
    id: "secret_note",
    name: "Secret Note",
    description: "Handwritten coordinates in an unknown cipher.",
    icon: "note",
  },
  encryption_key: {
    id: "encryption_key",
    name: "Encryption Key",
    description: "An encrypted authorization key extracted from the server rack.",
    icon: "key",
  },
  logic_probe: {
    id: "logic_probe",
    name: "Logic Probe",
    description: "Diagnostic probe used to trace digital signals and bus logic.",
    icon: "cpu",
  },
  survey_marker: {
    id: "survey_marker",
    name: "Survey Marker",
    description: "Brass geodetic marker inscribed with cryptographic campus coordinates.",
    icon: "card",
  },
  admin_override: {
    id: "admin_override",
    name: "Admin Override Token",
    description: "Elevated root authorization token for security vaults.",
    icon: "key",
  },
  core_x_prototype: {
    id: "core_x_prototype",
    name: "CORE-X Prototype",
    description: "The recovered prototype AR/VR neural engine — CORE-X.",
    icon: "cpu",
  },
};

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
