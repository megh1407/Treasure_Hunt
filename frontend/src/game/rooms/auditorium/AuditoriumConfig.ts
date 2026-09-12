export const AUDITORIUM_CONFIG = {
  roomId: "auditorium_stage_hall",
  name: "Auditorium / Stage Hall",
  dimensions: {
    width: 20,
    depth: 20,
    height: 5.2,
  },
  colors: {
    floor: "#1c1420",
    stageFloor: "#3a2218",
    ceiling: "#0d0910",
    wall: "#26172e",
    acousticPanel: "#351e3d",
    stageEdge: "#d49020",
    exitMarker: "#ff55bb",
  },
  lighting: {
    ambient: {
      intensity: 0.75,
    },
    primaryPoint: {
      position: [0, 4.5, -4.0] as [number, number, number],
      intensity: 32,
      distance: 24,
      color: "#ffd9aa",
    },
    accentPoint: {
      position: [0, 3.5, 3.5] as [number, number, number],
      intensity: 18,
      distance: 16,
      color: "#ba55d3",
    },
  },
} as const;
