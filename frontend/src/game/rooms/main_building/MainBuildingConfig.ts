/**
 * Styling and layout configuration for the Main Academic Building interior (Level 6).
 */
export const MAIN_BUILDING_CONFIG = {
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.5,
  },
  colors: {
    floor: "#1c2430",
    ceiling: "#0f151c",
    wall: "#2a3747",
    wallTrim: "#44586d",
    corridorPillar: "#3a4c60",
    accentTile: "#22354a",
    exitMarker: "#00d4ff",
  },
  lighting: {
    ambient: { intensity: 0.75 },
    primaryPoint: {
      position: [0, 4.0, 0] as [number, number, number],
      intensity: 28,
      distance: 26,
      color: "#d8eeff",
    },
    accentPoint: {
      position: [-3.5, 3.2, -2.5] as [number, number, number],
      intensity: 18,
      distance: 18,
      color: "#00d4ff",
    },
  },
} as const;
