import { LIBRARY_CONFIG } from "./LibraryConfig";

const { dimensions } = LIBRARY_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

/**
 * Architectural wall segments bounding the room.
 * [x, y, z, rotationY]
 */
export const LIBRARY_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

/** Static architectural reading table in the center */
export const READING_TABLE = {
  top: {
    position: [-1.6, 0.7, -1.4] as [number, number, number],
    size: [3.2, 0.12, 1.6] as [number, number, number],
  },
  legs: [
    [-2.9, -2.0],
    [-0.3, -2.0],
    [-2.9, -0.8],
    [-0.3, -0.8],
  ] as const,
  legSize: [0.1, 0.7, 0.1] as [number, number, number],
};

/** Static study desk */
export const STUDY_DESK = {
  position: [5.6, 0.72, -4.4] as [number, number, number],
  size: [2.4, 0.1, 1.2] as [number, number, number],
};

/** Exit indicator pad (position matches SceneRegistry.exitPosition) */
export const EXIT_MARKER = {
  position: [0, 0.04, 8.2] as [number, number, number],
  size: [2.6, 1.4] as [number, number],
};
