import { LEVEL_1_CONFIG } from "./level1";
import { LEVEL_2_CONFIG } from "./level2";
import { LEVEL_3_CONFIG } from "./level3";
import { LEVEL_4_CONFIG } from "./level4";
import { LEVEL_5_CONFIG } from "./level5";
import { LEVEL_6_CONFIG } from "./level6";
import { LEVEL_7_CONFIG } from "./level7";
import { LEVEL_8_CONFIG } from "./level8";
import { LEVEL_9_CONFIG } from "./level9";
import { LEVEL_10_CONFIG } from "./level10";

export interface DecoyObjectConfig {
  id: string;
  label?: string;
  message?: string;
}

export interface ServerHintConfig {
  order: number;
  text: string;
  penaltySeconds: number;
}

export interface ServerLevelConfig {
  levelId: number;
  name: string;
  location: string;
  targetObjectId: string;
  targetObjectDisplayName: string;
  targetPosition: readonly [number, number, number];
  scannerDetectionRadius: number;
  clue: {
    id: string;
    levelId: number;
    text: string;
    destination: string;
  };
  challenge: {
    id: string;
    levelId: number;
    type: string;
    question: string;
    answer: string;
  };
  grantedItem?: string;
  decoys: readonly DecoyObjectConfig[];
  hints: Record<number, ServerHintConfig>;
  penalties: {
    wrongAnswer: number;
    scanner: number;
  };
}

const LEVEL_1_DECOYS: readonly DecoyObjectConfig[] = [
  { id: "lib_shelf_a", label: "Tall Bookshelf", message: "Rows of reference volumes. Dust, and nothing else." },
  { id: "lib_shelf_b", label: "Archive Shelf", message: "Journals from 2011. Only old documents." },
  { id: "lib_computer", label: "Catalogue Terminal", message: "The computer is switched off." },
  { id: "lib_chair", label: "Reading Chair", message: "Just a chair." },
  { id: "lib_cabinet", label: "Filing Cabinet", message: "Locked drawers, and the label reads: EMPTY - 2019." },
  { id: "lib_painting", label: "Founder's Portrait", message: "A portrait of the founder. The wall behind it is solid." },
  { id: "lib_noticeboard", label: "Notice Board", message: "Updates 2K26 schedule, a lost-ID notice, and a torn poster." },
  { id: "lib_box", label: "Storage Box", message: "Packing material and a broken projector lamp." },
];

const EXTENDED_LEVEL_1_CONFIG: ServerLevelConfig = {
  ...LEVEL_1_CONFIG,
  decoys: LEVEL_1_DECOYS,
};

const EXTENDED_LEVEL_2_CONFIG: ServerLevelConfig = {
  ...LEVEL_2_CONFIG,
  decoys: LEVEL_2_CONFIG.decoys,
};

const EXTENDED_LEVEL_3_CONFIG: ServerLevelConfig = {
  ...LEVEL_3_CONFIG,
  decoys: LEVEL_3_CONFIG.decoys,
};

const EXTENDED_LEVEL_4_CONFIG: ServerLevelConfig = {
  ...LEVEL_4_CONFIG,
  decoys: LEVEL_4_CONFIG.decoys,
};

const EXTENDED_LEVEL_5_CONFIG: ServerLevelConfig = {
  ...LEVEL_5_CONFIG,
  decoys: LEVEL_5_CONFIG.decoys,
};

const EXTENDED_LEVEL_6_CONFIG: ServerLevelConfig = {
  ...LEVEL_6_CONFIG,
  decoys: LEVEL_6_CONFIG.decoys,
};

const EXTENDED_LEVEL_7_CONFIG: ServerLevelConfig = {
  ...LEVEL_7_CONFIG,
  decoys: LEVEL_7_CONFIG.decoys,
};

const EXTENDED_LEVEL_8_CONFIG: ServerLevelConfig = {
  ...LEVEL_8_CONFIG,
  decoys: LEVEL_8_CONFIG.decoys,
};

const EXTENDED_LEVEL_9_CONFIG: ServerLevelConfig = {
  ...LEVEL_9_CONFIG,
  decoys: LEVEL_9_CONFIG.decoys,
};

const EXTENDED_LEVEL_10_CONFIG: ServerLevelConfig = {
  ...LEVEL_10_CONFIG,
  decoys: LEVEL_10_CONFIG.decoys,
};

const LEVELS_REGISTRY: Record<number, ServerLevelConfig> = {
  1: EXTENDED_LEVEL_1_CONFIG,
  2: EXTENDED_LEVEL_2_CONFIG,
  3: EXTENDED_LEVEL_3_CONFIG,
  4: EXTENDED_LEVEL_4_CONFIG,
  5: EXTENDED_LEVEL_5_CONFIG,
  6: EXTENDED_LEVEL_6_CONFIG,
  7: EXTENDED_LEVEL_7_CONFIG,
  8: EXTENDED_LEVEL_8_CONFIG,
  9: EXTENDED_LEVEL_9_CONFIG,
  10: EXTENDED_LEVEL_10_CONFIG,
};

/**
 * Returns the server-side authoritative configuration for the specified level.
 * Returns null if the level is not yet implemented or configured.
 */
export function getServerLevelConfig(levelId: number): ServerLevelConfig | null {
  return LEVELS_REGISTRY[levelId] || null;
}

import { getLocationsForLevel } from "./clueBank";

/**
 * Determines whether a given objectId belongs to the specified level
 * (either as the target clue object or as one of the level's decoys/clue locations).
 */
export function isObjectInLevel(levelId: number, objectId: string): boolean {
  const config = getServerLevelConfig(levelId);
  if (!config) return false;
  if (config.targetObjectId === objectId) return true;
  if (config.decoys && config.decoys.some((d) => d.id === objectId)) return true;
  const clueLocations = getLocationsForLevel(levelId);
  return clueLocations.some((loc) => loc.objectId === objectId);
}

/**
 * Returns decoy metadata for a given object in a level, or undefined if not a decoy.
 */
export function getDecoyInLevel(levelId: number, objectId: string): DecoyObjectConfig | undefined {
  const config = getServerLevelConfig(levelId);
  if (!config) return undefined;
  const configuredDecoy = config.decoys?.find((d) => d.id === objectId);
  if (configuredDecoy) return configuredDecoy;
  const clueLocations = getLocationsForLevel(levelId);
  const loc = clueLocations.find((l) => l.objectId === objectId);
  if (loc) {
    return {
      id: loc.objectId,
      label: loc.label,
      message: `You examine the ${loc.label}. Nothing useful was found here.`,
    };
  }
  return undefined;
}
