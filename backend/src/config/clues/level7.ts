/**
 * Level 7 Clue Pool: Broken Trace (Electronics Lab / Hardware Lab)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_7_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "electronics_oscilloscope",
    label: "Digital Storage Oscilloscope",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-7-scope-s1",
        text: "Green boards with copper veins and dancing phosphor waves on glass screens hold the key to the next transmission.",
      },
      {
        id: "clue-7-scope-s2",
        text: "Find the dual-channel waveform analyzer where glowing sine curves and timebase dials measure circuit frequencies.",
      },
      {
        id: "clue-7-scope-s3",
        text: "Connected to BNC coaxial probes, a digital storage oscilloscope captures a repeating modulated pulse train.",
      },
    ],
  },
  {
    objectId: "electronics_soldering_station",
    label: "Soldering Station",
    sentences: [
      {
        id: "clue-7-solder-s1",
        text: "A temperature-controlled ceramic heating iron sits in a coiled spring stand beside a coil of rosin-core solder.",
      },
      {
        id: "clue-7-solder-s2",
        text: "Examine the ventilation hood and brass tip cleaner on the bench where surface-mount soldering takes place.",
      },
      {
        id: "clue-7-solder-s3",
        text: "Under the heat-resistant silicone work pad of the rework station, an operative slipped a thin magnetic probe.",
      },
    ],
  },
  {
    objectId: "electronics_component_rack",
    label: "Resistor & Capacitor Bins",
    sentences: [
      {
        id: "clue-7-rack-s1",
        text: "A vertical rack of hundreds of clear slide-out drawers labeled with microfarad values and resistor color codes.",
      },
      {
        id: "clue-7-rack-s2",
        text: "Search through the sorted passive component matrix where discrete capacitors and precision diodes are inventoried.",
      },
      {
        id: "clue-7-rack-s3",
        text: "Inside a plastic compartment marked for precision pull-up resistors, an anomalous integrated circuit was hidden.",
      },
    ],
  },
  {
    objectId: "electronics_power_supply",
    label: "DC Power Supply",
    sentences: [
      {
        id: "clue-7-power-s1",
        text: "Twin red seven-segment displays illuminate voltage and current limits on an adjustable laboratory bench power source.",
      },
      {
        id: "clue-7-power-s2",
        text: "Inspect the linear benchtop power unit featuring heavy banana plug binding posts and current limiting knobs.",
      },
      {
        id: "clue-7-power-s3",
        text: "Beneath the cooling fins of the constant-voltage DC generator, a small transceiver was magnetically fastened.",
      },
    ],
  },
  {
    objectId: "electronics_pcb_bin",
    label: "Scrap PCB Bin",
    sentences: [
      {
        id: "clue-7-pcb-s1",
        text: "Discarded test boards with etched copper traces and trimmed component leads fill a green utility scrap tote.",
      },
      {
        id: "clue-7-pcb-s2",
        text: "Rummage through the prototypes bin where failed circuit board revisions from past design sprints are retired.",
      },
      {
        id: "clue-7-pcb-s3",
        text: "Among the unpopulated fiberglass circuit boards in the recycle box, an operative hid an active EEPROM carrier.",
      },
    ],
  },
];
