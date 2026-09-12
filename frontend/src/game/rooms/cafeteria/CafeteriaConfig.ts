export const CAFETERIA_CONFIG = {
  roomId: "cafeteria_dining_hall",
  name: "Cafeteria / Dining Hall",
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.2,
  },
  colors: {
    floor: "#271e18",
    ceiling: "#130f0c",
    wall: "#2d231c",
    wallTrim: "#3d2f26",
    counterBacking: "#382920",
    tileGrout: "#1a1410",
    exitMarker: "#ffaa44",
  },
  lighting: {
    ambient: {
      intensity: 0.75,
    },
    primaryPoint: {
      position: [0, 3.6, 0] as [number, number, number],
      intensity: 28,
      distance: 22,
      color: "#ffe5c2",
    },
    accentPoint: {
      position: [0, 2.8, -5.5] as [number, number, number],
      intensity: 18,
      distance: 14,
      color: "#ffaa55",
    },
  },
} as const;
