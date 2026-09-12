/**
 * Library Room Configuration
 *
 * Defines architectural dimensions, color palettes, and interior lighting.
 * Navigation, spawn coordinates, and movement bounds are owned by the Scene Registry
 * (game/scenes/registry.ts) to avoid duplicated sources of truth.
 */
export const LIBRARY_CONFIG = {
  roomId: "library_reading_hall",
  name: "Library / Reading Hall",

  /** Physical dimensions of the room shell */
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.2,
  },

  /** Interior surface color palette */
  colors: {
    floor: "#2a2620",
    ceiling: "#191d22",
    wall: "#3a3229",
    readingTable: "#5a4634",
    readingTableLegs: "#3c3025",
    studyDesk: "#524232",
    exitMarker: "#5fd0e6",
  },

  /** Interior lighting setup */
  lighting: {
    ambient: {
      intensity: 0.75,
    },
    primaryPoint: {
      position: [0, 3.6, 0] as [number, number, number],
      intensity: 28,
      distance: 24,
      color: "#ffe0b8",
    },
    accentPoint: {
      position: [-5, 3, -4] as [number, number, number],
      intensity: 16,
      distance: 16,
      color: "#8fd6e6",
    },
  },
} as const;
