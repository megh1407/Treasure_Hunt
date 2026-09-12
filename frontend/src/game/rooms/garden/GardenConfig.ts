/**
 * Styling and layout configuration for the Garden Pavilion / East Lawn Conservatory (Level 8).
 */
export const GARDEN_CONFIG = {
  dimensions: {
    width: 18,
    depth: 18,
    height: 5.0,
  },
  colors: {
    floor: "#1c2b20",
    stonePath: "#3a4a3e",
    wall: "#1e3325",
    glassRoof: "#3a604a",
    timberTruss: "#38291a",
    exitMarker: "#00d4ff",
  },
  lighting: {
    ambient: { intensity: 0.8 },
    primaryPoint: {
      position: [0, 4.2, 0] as [number, number, number],
      intensity: 28,
      distance: 26,
      color: "#e4f8e8",
    },
    accentPoint: {
      position: [0, 2.5, -2.5] as [number, number, number],
      intensity: 18,
      distance: 18,
      color: "#8ae8aa",
    },
  },
} as const;
