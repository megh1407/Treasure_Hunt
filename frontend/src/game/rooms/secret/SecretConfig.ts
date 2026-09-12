/**
 * Styling and layout configuration for the Innovation Vault / CORE-X Chamber (Level 10).
 */
export const SECRET_CONFIG = {
  dimensions: {
    width: 18,
    depth: 18,
    height: 5.0,
  },
  colors: {
    floor: "#0d131a",
    vaultFloor: "#152230",
    ceiling: "#080c10",
    wall: "#131e28",
    reinforcedDoor: "#223547",
    corePedestal: "#1e3347",
    cyanCoreGlow: "#00f0ff",
    amberAlarmGlow: "#ffaa00",
    exitMarker: "#00d4ff",
  },
  lighting: {
    ambient: { intensity: 0.75 },
    primaryPoint: {
      position: [0, 4.2, 0] as [number, number, number],
      intensity: 28,
      distance: 26,
      color: "#d0f0ff",
    },
    corePoint: {
      position: [0, 1.8, -3.8] as [number, number, number],
      intensity: 22,
      distance: 20,
      color: "#00f0ff",
    },
  },
} as const;
