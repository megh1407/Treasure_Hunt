import type { Building, BuildingId } from "../types";

/** Compact stylised campus master layout (top-down coordinates in world units). */
export const CAMPUS: Building[] = [
  {
    id: "main_gate",
    name: "Main Gate",
    position: [0, 46],
    size: [12, 6, 2],
    color: "#4b5b73",
    enterable: false,
    door: [0, -2],
  },
  {
    id: "garden",
    name: "Garden",
    position: [-20, 24],
    size: [18, 0.4, 18],
    color: "#2f5d46",
    enterable: true,
    door: [0, -9],
  },
  {
    id: "library",
    name: "Library",
    position: [18, 22],
    size: [16, 9, 14],
    color: "#6b5a48",
    enterable: true,
    door: [-8, 0],
  },
  {
    id: "computer_lab",
    name: "Computer Lab",
    position: [-22, 2],
    size: [14, 8, 12],
    color: "#3f4a63",
    enterable: true,
    door: [7, 0],
  },
  {
    id: "robotics_lab",
    name: "Robotics Lab",
    position: [22, 0],
    size: [14, 8, 12],
    color: "#4a3f63",
    enterable: true,
    door: [-7, 0],
  },
  {
    id: "electronics_lab",
    name: "Electronics Lab",
    position: [-24, -20],
    size: [13, 7, 11],
    color: "#3f5a63",
    enterable: true,
    door: [6.5, 0],
  },
  {
    id: "auditorium",
    name: "Auditorium",
    position: [0, -14],
    size: [20, 10, 14],
    color: "#57496a",
    enterable: true,
    door: [0, 7],
  },
  {
    id: "cafeteria",
    name: "Cafeteria",
    position: [24, -22],
    size: [13, 6, 11],
    color: "#6a5340",
    enterable: true,
    door: [-6.5, 0],
  },
  {
    id: "main_building",
    name: "Main Academic Building",
    position: [0, -40],
    size: [30, 12, 14],
    color: "#4c5566",
    enterable: true,
    door: [0, 7],
  },
  {
    id: "server_room",
    name: "Server Room",
    position: [-24, -44],
    size: [12, 7, 10],
    color: "#33465c",
    enterable: true,
    door: [6, 0],
  },
  {
    id: "secret_room",
    name: "Final Secret Room",
    position: [26, -46],
    size: [10, 6, 10],
    color: "#2c3a4d",
    enterable: true,
    door: [-5, 0],
  },
];

export const CAMPUS_BOUNDS = { minX: -42, maxX: 42, minZ: -58, maxZ: 52 };
export const SPAWN_POSITION: [number, number, number] = [0, 0, 38];

export function getBuilding(id: string): Building | undefined {
  return CAMPUS.find((b) => b.id === id);
}

/** World-space door position of a building. */
export function doorPosition(b: Building): [number, number] {
  return [b.position[0] + b.door[0], b.position[1] + b.door[1]];
}

/**
 * Exterior spawn position outside a building entrance.
 * Placed 2.5 world units outside the door to ensure the player steps out cleanly.
 */
export function getBuildingExteriorSpawn(buildingId: BuildingId): [number, number, number] {
  const b = getBuilding(buildingId);
  if (!b) return SPAWN_POSITION;
  const [x, z] = doorPosition(b);
  const ox = b.door[0] !== 0 ? Math.sign(b.door[0]) * 2.5 : 0;
  const oz = b.door[1] !== 0 ? Math.sign(b.door[1]) * 2.5 : 0;
  return [x + ox, 0, z + oz];
}
