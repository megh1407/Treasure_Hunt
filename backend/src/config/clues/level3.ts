/**
 * Level 3 Clue Pool: Cold Boot (Computer Lab / Lab A)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_3_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "computer_server_rack",
    label: "Server Rack Unit",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-3-rack-s1",
        text: "Rows of cold silicon glow under humming fans. Seek the solitary terminal flickering with an unprompted cursor.",
      },
      {
        id: "clue-3-rack-s2",
        text: "Behind perforated glass doors, a 42U rack unit pulses with blue activity LEDs and high-speed network traffic.",
      },
      {
        id: "clue-3-rack-s3",
        text: "Investigate the tall server chassis anchored in the cool airflow corner where enterprise blades run silent computations.",
      },
    ],
  },
  {
    objectId: "computer_terminal",
    label: "Workstation Terminal",
    sentences: [
      {
        id: "clue-3-term-s1",
        text: "A dual-monitor workstation displays a blinking root shell prompt waiting for supervisor authentication.",
      },
      {
        id: "clue-3-term-s2",
        text: "Check the master development console positioned at the front podium, where compilation logs continue to scroll.",
      },
      {
        id: "clue-3-term-s3",
        text: "An active command prompt on an isolated workstation terminal holds an uncommitted cryptographic routine.",
      },
    ],
  },
  {
    objectId: "computer_workstation",
    label: "Lab Workstation",
    sentences: [
      {
        id: "clue-3-workstation-s1",
        text: "Between rows of student desks, a workstation with a mechanical keyboard and mouse pad hides an attached hardware token.",
      },
      {
        id: "clue-3-workstation-s2",
        text: "Inspect the middle cubicle along row three where system programming manuals are stacked beside an active monitor.",
      },
      {
        id: "clue-3-workstation-s3",
        text: "Tucked beneath a desktop tower in the third aisle of computational stations lies a magnetic flash device.",
      },
    ],
  },
  {
    objectId: "computer_network_switch",
    label: "Network Switch",
    sentences: [
      {
        id: "clue-3-switch-s1",
        text: "A 48-port gigabit switch flashes rhythmically with amber and green packet indicators. Check the patch cable routing.",
      },
      {
        id: "clue-3-switch-s2",
        text: "Follow the cascade of bundled Cat6 cables down to the managed Ethernet switch mounted on the distribution panel.",
      },
      {
        id: "clue-3-switch-s3",
        text: "A high-throughput optical uplink box mounted on the perimeter wall radiates a distinct packet stream.",
      },
    ],
  },
  {
    objectId: "computer_parts_table",
    label: "Hardware Bench",
    sentences: [
      {
        id: "clue-3-parts-s1",
        text: "Anti-static bags, PCI-e expansion cards, and unseated DDR5 modules clutter the diagnostic hardware table.",
      },
      {
        id: "clue-3-parts-s2",
        text: "Examine the repair station where stripped computer motherboards and power supplies are undergoing hardware tests.",
      },
      {
        id: "clue-3-parts-s3",
        text: "Behind the grounded soldering mat and thermal paste tubes on the hardware bench, a concealed trace awaits discovery.",
      },
    ],
  },
];
