export const COMPUTER_CONFIG = {
  roomId: "computer_lab_lab_a",
  name: "Computer Lab / Lab A",
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.2,
  },
  colors: {
    floor: "#0e141d",
    ceiling: "#080c12",
    wall: "#151c27",
    wallPanel: "#1e2838",
    serverPlinth: "#182230",
    cableChannel: "#00d8ff",
    deskRow: "#222c3c",
    exitMarker: "#00e5ff",
  },
  lighting: {
    ambient: {
      intensity: 0.75,
    },
    primaryPoint: {
      position: [0, 3.6, 0] as [number, number, number],
      intensity: 28,
      distance: 22,
      color: "#99d6ff",
    },
    accentPoint: {
      position: [0, 2.8, -5.5] as [number, number, number],
      intensity: 22,
      distance: 14,
      color: "#00ffbb",
    },
  },
} as const;
