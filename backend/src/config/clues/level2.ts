/**
 * Level 2 Clue Pool: Servo Silence (Robotics Lab / Assembly Bay)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_2_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "robot_toolbox",
    label: "Mechanic's Toolbox",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-2-toolbox-s1",
        text: "Where metal limbs learn precision and mechanical gears rest beneath silent diagnostic screens, uncover the second trace.",
      },
      {
        id: "clue-2-toolbox-s2",
        text: "Seek a heavy steel utility chest resting near the servo calibrators, stocked with hex wrenches and an encrypted key.",
      },
      {
        id: "clue-2-toolbox-s3",
        text: "Beside the assembly rails, a technician's red tool chest harbors an anomaly concealed beneath mechanical calipers.",
      },
    ],
  },
  {
    objectId: "robot_arm",
    label: "Robotic Assembly Arm",
    sentences: [
      {
        id: "clue-2-arm-s1",
        text: "A multi-axis articulated manipulator stands frozen mid-arc over the assembly jig. Inspect its motorized shoulder joint.",
      },
      {
        id: "clue-2-arm-s2",
        text: "Follow the hydraulic cables to the heavy industrial end-effector where pneumatic grippers hold an unlogged marker.",
      },
      {
        id: "clue-2-arm-s3",
        text: "Examine the counterbalanced yellow robotic arm paused in neutral calibration above the production line.",
      },
    ],
  },
  {
    objectId: "robot_workbench",
    label: "Work Bench",
    sentences: [
      {
        id: "clue-2-bench-s1",
        text: "A wide soldering station littered with heat sinks, breadboards, and loose wire harnesses conceals the next digital imprint.",
      },
      {
        id: "clue-2-bench-s2",
        text: "Check beneath the anti-static mat on the primary hardware assembly bench where component testing occurs.",
      },
      {
        id: "clue-2-bench-s3",
        text: "Scattered circuit schematics and diagnostic multimeters cover a long wooden table. A hidden beacon rests near the magnifying lamp.",
      },
    ],
  },
  {
    objectId: "robot_parts_bin",
    label: "Parts Bin",
    sentences: [
      {
        id: "clue-2-parts-s1",
        text: "Tiered polymer bins filled with stepper motors, timing belts, and ball bearings conceal a specialized payload.",
      },
      {
        id: "clue-2-parts-s2",
        text: "Inspect the sorted component organizers where brass spur gears and aluminum brackets are stored.",
      },
      {
        id: "clue-2-parts-s3",
        text: "Rummage past the excess servo linkages in the deep hardware bin beside the central workshop pillar.",
      },
    ],
  },
  {
    objectId: "robot_terminal",
    label: "Diagnostic Console",
    sentences: [
      {
        id: "clue-2-terminal-s1",
        text: "A ruggedized touchscreen showing telemetry graphs for motor torque and encoder pulses awaits an operative's prompt.",
      },
      {
        id: "clue-2-terminal-s2",
        text: "Examine the standalone command console mounted on an aluminum swivel arm adjacent to the safety cage.",
      },
      {
        id: "clue-2-terminal-s3",
        text: "A diagnostic terminal displaying kinematic equations on an amber phosphorescent screen hides an access code in its buffer.",
      },
    ],
  },
];
