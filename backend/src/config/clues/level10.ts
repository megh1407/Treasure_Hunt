/**
 * Level 10 Clue Pool: CORE-X (Innovation Vault / Vault Chamber)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_10_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "vault_containment_pod",
    label: "Containment Capsule Pod",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-10-pod-s1",
        text: "The fortified core where the campus shields its most advanced confidential prototypes has engaged its primary containment clamps.",
      },
      {
        id: "clue-10-pod-s2",
        text: "At the apex of the security chamber, a cylindrical magnetic suspension capsule holds the final missing technological artifact.",
      },
      {
        id: "clue-10-pod-s3",
        text: "Seek the pressurized cryogenic isolation pod anchored at the center of the reinforced chamber.",
      },
    ],
  },
  {
    objectId: "vault_security_terminal",
    label: "Vault Security Console",
    sentences: [
      {
        id: "clue-10-security-s1",
        text: "A master security override terminal glows with telemetry monitoring biometric containment seals across all campus sectors.",
      },
      {
        id: "clue-10-security-s2",
        text: "Inspect the fortified command station flanked by dual biometric scanners and real-time perimeter status readouts.",
      },
      {
        id: "clue-10-security-s3",
        text: "Beside the emergency lockdown authorization switch on the security desk, an operative's decryption bypass is active.",
      },
    ],
  },
  {
    objectId: "vault_cryo_chamber",
    label: "Prototype Archive",
    sentences: [
      {
        id: "clue-10-cryo-s1",
        text: "Sub-zero glass preservation lockers hold earlier experimental revisions of augmented reality prototypes in suspended stasis.",
      },
      {
        id: "clue-10-cryo-s2",
        text: "Examine the hermetically sealed archival cases where optical waveguide prototypes from past breakthroughs are preserved.",
      },
      {
        id: "clue-10-cryo-s3",
        text: "Behind the frosted vapor shield of the historical prototype display bay, an anomalous frequency is emitting.",
      },
    ],
  },
  {
    objectId: "vault_backup_power",
    label: "Quantum Battery Core",
    sentences: [
      {
        id: "clue-10-power-s1",
        text: "An auxiliary quantum energy cell hums with an ethereal azure radiance, stabilizing the chamber's containment fields.",
      },
      {
        id: "clue-10-power-s2",
        text: "Approach the isolated energy generator surrounded by magnetic containment rings and glowing power capacitors.",
      },
      {
        id: "clue-10-power-s3",
        text: "Beneath the high-voltage busbars of the quantum battery unit, a secondary telemetry recorder has been integrated.",
      },
    ],
  },
  {
    objectId: "vault_schematic_table",
    label: "Holographic Drafting Table",
    sentences: [
      {
        id: "clue-10-schematic-s1",
        text: "A glass-topped collaborative drafting desk projects rotating holographic wireframes of the lost prototype's architecture.",
      },
      {
        id: "clue-10-schematic-s2",
        text: "Inspect the interactive design surface where optical engineers plotted the micro-circuitry and spatial tracking sensors.",
      },
      {
        id: "clue-10-schematic-s3",
        text: "Embedded beneath the edge sensor bezel of the digital drafting console, an encrypted security token awaits extraction.",
      },
    ],
  },
];
