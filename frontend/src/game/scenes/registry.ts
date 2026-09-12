/**
 * Scene Registry — the single source of truth for every playable scene.
 *
 * HOW TO ADD A NEW ROOM:
 *   1. Create the room component in game/rooms/<room>/<Room>.tsx
 *   2. Add a new SceneId to game/types.ts  (e.g. "computer_lab_interior")
 *   3. Add a new entry below in SCENE_REGISTRY
 *   4. Register the component in SCENE_COMPONENTS inside GameWorld.tsx
 *
 * GameWorld, GameScreen, and gameStore never need hardcoded if/else
 * chains for individual rooms — they query this registry instead.
 */

import type { BuildingId, SceneId } from "../types";
import { CAMPUS_BOUNDS, SPAWN_POSITION, getBuildingExteriorSpawn } from "../data/campus";

// ─────────────────────────────────────────────────────────────────────────────
// Scene configuration type
// ─────────────────────────────────────────────────────────────────────────────

export interface SceneConfig {
  /** Unique identifier for this scene. */
  readonly id: SceneId;

  /**
   * True for enclosed interior scenes; false for open-world / campus.
   * Controls whether GameWorld renders interior or campus content.
   */
  readonly isInterior: boolean;

  /**
   * For interior scenes: which campus building contains the entrance.
   * GameWorld uses this to generate a data-driven "Enter <Building>"
   * proximity target that carries `navigatesTo: this.id`.
   */
  readonly entranceBuildingId: BuildingId | null;

  /** BuildingId written to the store while this scene is active. */
  readonly buildingId: BuildingId;

  /** Room string written to the store while this scene is active. */
  readonly room: string | null;

  /** Player world-space spawn position when entering this scene. */
  readonly spawn: [number, number, number];

  /** AABB movement limits for Player and camera clamping. */
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  /** R3F Canvas background color hex string. */
  readonly background: string;

  /** THREE.Fog constructor args [color, near, far]. */
  readonly fog: [string, number, number];

  /**
   * Level ID whose objects populate this scene.
   * Null for open-world scenes with no level-specific objects.
   */
  readonly levelId: number | null;

  /** Human-readable location string shown in the HUD. */
  readonly locationLabel: string;

  /** Activity log message emitted when the player enters (null = no log). */
  readonly enterLogMessage: string | null;

  /**
   * SceneId to navigate to when the exit interaction fires.
   * Null for scenes with no exit (e.g. campus).
   */
  readonly exitTo: SceneId | null;

  /**
   * World-space position of the exit trigger zone.
   * Null if this scene has no exit interaction.
   */
  readonly exitPosition: [number, number, number] | null;

  /** Radius of the exit trigger sphere in world units. */
  readonly exitRadius: number;

  /**
   * Exterior spawn position in campus world-space when exiting this scene.
   * Null for scenes that do not exit to campus.
   */
  readonly exitSpawnPosition: [number, number, number] | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export const SCENE_REGISTRY: Record<SceneId, SceneConfig> = {
  campus: {
    id: "campus",
    isInterior: false,
    entranceBuildingId: null,
    buildingId: "main_gate",
    room: null,
    spawn: SPAWN_POSITION,
    bounds: CAMPUS_BOUNDS,
    background: "#0b1119",
    fog: ["#0b1119", 90, 260],
    levelId: null,
    locationLabel: "Campus Grounds",
    enterLogMessage: null,
    exitTo: null,
    exitPosition: null,
    exitRadius: 0,
    exitSpawnPosition: null,
  },

  library_interior: {
    id: "library_interior",
    isInterior: true,
    entranceBuildingId: "library",
    buildingId: "library",
    room: "reading_hall",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#0d1116",
    fog: ["#0d1116", 12, 44],
    levelId: 1,
    locationLabel: "Library / Reading Hall",
    enterLogMessage: "entered Library / Reading Hall",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("library"),
  },

  robotics_lab_interior: {
    id: "robotics_lab_interior",
    isInterior: true,
    entranceBuildingId: "robotics_lab",
    buildingId: "robotics_lab",
    room: "assembly_bay",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#0c0e14",
    fog: ["#0c0e14", 12, 44],
    levelId: 2,
    locationLabel: "Robotics Lab / Assembly Bay",
    enterLogMessage: "entered Robotics Lab / Assembly Bay",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("robotics_lab"),
  },

  computer_lab_interior: {
    id: "computer_lab_interior",
    isInterior: true,
    entranceBuildingId: "computer_lab",
    buildingId: "computer_lab",
    room: "lab_a",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#081018",
    fog: ["#081018", 12, 44],
    levelId: 3,
    locationLabel: "Computer Lab / Lab A",
    enterLogMessage: "entered Computer Lab / Lab A",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("computer_lab"),
  },

  auditorium_interior: {
    id: "auditorium_interior",
    isInterior: true,
    entranceBuildingId: "auditorium",
    buildingId: "auditorium",
    room: "stage_hall",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#120c18",
    fog: ["#120c18", 12, 44],
    levelId: 4,
    locationLabel: "Auditorium / Stage Hall",
    enterLogMessage: "entered Auditorium / Stage Hall",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("auditorium"),
  },

  cafeteria_interior: {
    id: "cafeteria_interior",
    isInterior: true,
    entranceBuildingId: "cafeteria",
    buildingId: "cafeteria",
    room: "dining",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#14100c",
    fog: ["#14100c", 12, 44],
    levelId: 5,
    locationLabel: "Cafeteria / Dining Hall",
    enterLogMessage: "entered Cafeteria / Dining Hall",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("cafeteria"),
  },

  main_building_interior: {
    id: "main_building_interior",
    isInterior: true,
    entranceBuildingId: "main_building",
    buildingId: "main_building",
    room: "corridor",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#0c1117",
    fog: ["#0c1117", 12, 44],
    levelId: 6,
    locationLabel: "Main Building / Central Corridor",
    enterLogMessage: "entered Main Building / Central Corridor",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("main_building"),
  },

  electronics_lab_interior: {
    id: "electronics_lab_interior",
    isInterior: true,
    entranceBuildingId: "electronics_lab",
    buildingId: "electronics_lab",
    room: "bench_row",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#0a131a",
    fog: ["#0a131a", 12, 44],
    levelId: 7,
    locationLabel: "Electronics Lab / Workbenches",
    enterLogMessage: "entered Electronics Lab / Workbenches",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("electronics_lab"),
  },

  garden_interior: {
    id: "garden_interior",
    isInterior: true,
    entranceBuildingId: "garden",
    buildingId: "garden",
    room: "east_lawn",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#0d1a12",
    fog: ["#0d1a12", 12, 44],
    levelId: 8,
    locationLabel: "East Lawn / Botanical Pavilion",
    enterLogMessage: "entered East Lawn / Botanical Pavilion",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("garden"),
  },

  server_room_interior: {
    id: "server_room_interior",
    isInterior: true,
    entranceBuildingId: "server_room",
    buildingId: "server_room",
    room: "rack_hall",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#060d14",
    fog: ["#060d14", 12, 44],
    levelId: 9,
    locationLabel: "Server Room / Rack Hall",
    enterLogMessage: "entered Server Room / Rack Hall",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("server_room"),
  },

  secret_room_interior: {
    id: "secret_room_interior",
    isInterior: true,
    entranceBuildingId: "secret_room",
    buildingId: "secret_room",
    room: "vault",
    spawn: [0, 0, 4.5],
    bounds: { minX: -8.4, maxX: 8.4, minZ: -8.4, maxZ: 8.4 },
    background: "#070c12",
    fog: ["#070c12", 12, 44],
    levelId: 10,
    locationLabel: "Innovation Vault / CORE-X Chamber",
    enterLogMessage: "entered Innovation Vault / CORE-X Chamber",
    exitTo: "campus",
    exitPosition: [0, 0, 8.2],
    exitRadius: 2.4,
    exitSpawnPosition: getBuildingExteriorSpawn("secret_room"),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the configuration for the given scene ID. */
export function getSceneConfig(id: SceneId): SceneConfig {
  return SCENE_REGISTRY[id];
}

/**
 * Returns the interior SceneConfig whose entranceBuildingId matches the
 * given campus building ID, or undefined if no registered interior exists yet.
 *
 * Used by GameWorld to generate data-driven "Enter <Building>" proximity
 * targets without any hardcoded building-to-scene mapping in the component.
 */
export function getSceneForBuilding(buildingId: BuildingId): SceneConfig | undefined {
  return (Object.values(SCENE_REGISTRY) as SceneConfig[]).find(
    (s) => s.entranceBuildingId === buildingId,
  );
}

/**
 * Returns the interior SceneConfig corresponding to the given level ID,
 * or undefined if no registered interior exists for that level.
 */
export function getSceneForLevel(levelId: number): SceneConfig | undefined {
  return (Object.values(SCENE_REGISTRY) as SceneConfig[]).find(
    (s) => s.levelId === levelId,
  );
}
