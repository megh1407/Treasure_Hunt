export const ROBOTICS_CONFIG = {
  roomId: "robotics_lab_assembly_bay",
  name: "Robotics Lab / Assembly Bay",
  dimensions: {
    width: 18,
    depth: 18,
    height: 4.5,
  },
  colors: {
    floor: "#141923",
    floorAccent: "#1a2230",
    ceiling: "#0d1117",
    wall: "#1e2636",
    wallTrim: "#2a364c",
    assemblyPlatform: "#1b2838",
    hazardStripe: "#d4a017",
    steelCabinet: "#2d3748",
    exitMarker: "#00d8ff",
  },
  lighting: {
    ambient: {
      intensity: 0.75,
    },
    primaryPoint: {
      position: [0, 3.8, 0] as [number, number, number],
      intensity: 30,
      distance: 24,
      color: "#80c4ff",
    },
    accentPoint: {
      position: [-4.2, 3.2, -2.5] as [number, number, number],
      intensity: 20,
      distance: 14,
      color: "#00ffd5",
    },
  },
} as const;
