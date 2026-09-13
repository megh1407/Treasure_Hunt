/**
 * Authoritative Server-Side Game Configuration for Level 7: "Broken Trace"
 * 
 * SECURITY: Correct answers and internal clue metadata are stored exclusively
 * here and must NEVER be leaked or returned in client API responses.
 */

export const LEVEL_7_CONFIG = {
  levelId: 7,
  name: "Broken Trace",
  location: "Electronics Lab / Workbenches",
  targetObjectId: "electronics_oscilloscope",
  targetObjectDisplayName: "Oscilloscope Station",
  targetPosition: [2.8, 0, -3.2] as const,
  scannerDetectionRadius: 6,
  clue: {
    id: "clue-7",
    levelId: 7,
    text: "Beneath open skies and stone arches where nature borders concrete, an ancient surveyor's mark harbors a forgotten frequency.",
    destination: "",
  },
  challenge: {
    id: "ch-7",
    levelId: 7,
    type: "hexadecimal",
    question:
      "The digital oscilloscope displays an encrypted memory offset byte: 0x5A. Convert this hexadecimal value to decimal to calibrate the signal.",
    // Authoritative answer — NEVER expose in any response
    answer: "90",
  },
  grantedItem: "logic_probe",
  decoys: [
    {
      id: "electronics_soldering_station",
      label: "Soldering Station",
      message: "Soldering iron, fume extractor, and spools of lead-free solder.",
    },
    {
      id: "electronics_component_rack",
      label: "Resistor & Capacitor Bins",
      message: "Hundreds of small transparent drawers filled with SMD components.",
    },
    {
      id: "electronics_power_supply",
      label: "DC Power Supply",
      message: "Twin LED readouts display 5.0V and 12.0V steady voltage.",
    },
    {
      id: "electronics_pcb_bin",
      label: "Scrap PCB Bin",
      message: "Etched test boards from circuit design labs. None contain trace signatures.",
    },
  ],
  hints: {
    1: {
      order: 1,
      text: "Hexadecimal is base 16: 0-9 represent 0-9, and A represents 10.",
      penaltySeconds: 15,
    },
    2: {
      order: 2,
      text: "Multiply the first digit (5) by 16, then add the value of A (10).",
      penaltySeconds: 30,
    },
    3: {
      order: 3,
      text: "5 * 16 = 80. Add 10 to get 90.",
      penaltySeconds: 45,
    },
  } as Record<number, { order: number; text: string; penaltySeconds: number }>,
  penalties: {
    wrongAnswer: 30,
    scanner: 10,
  },
} as const;
