/**
 * Styling and layout configuration for the Server Room / Rack Hall interior (Level 9).
 */
export const SERVER_CONFIG = {
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.5,
  },
  colors: {
    floor: "#0a1118",
    perforatedFloor: "#162230",
    ceiling: "#060a0e",
    wall: "#121b24",
    cableTray: "#1b2c3d",
    blueLED: "#00a2ff",
    exitMarker: "#00d4ff",
  },
  lighting: {
    ambient: { intensity: 0.75 },
    primaryPoint: {
      position: [0, 4.0, 0] as [number, number, number],
      intensity: 28,
      distance: 26,
      color: "#b0d8ff",
    },
    accentPoint: {
      position: [0, 3.0, -4.8] as [number, number, number],
      intensity: 18,
      distance: 18,
      color: "#00d0ff",
    },
  },
} as const;
