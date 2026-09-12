/**
 * Styling and layout configuration for the Electronics Lab interior (Level 7).
 */
export const ELECTRONICS_CONFIG = {
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.5,
  },
  colors: {
    floor: "#141c22",
    ceiling: "#0c1218",
    wall: "#1e2a33",
    esdMat: "#1b4d5a",
    steelRack: "#2f404d",
    exitMarker: "#00d4ff",
  },
  lighting: {
    ambient: { intensity: 0.75 },
    primaryPoint: {
      position: [0, 4.0, 0] as [number, number, number],
      intensity: 28,
      distance: 26,
      color: "#d0f4ff",
    },
    accentPoint: {
      position: [2.8, 3.2, -3.2] as [number, number, number],
      intensity: 18,
      distance: 18,
      color: "#2bd9b5",
    },
  },
} as const;
