/**
 * Level 9 Clue Pool: Root Access (Server Room / Datacenter)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_9_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "server_mainframe_console",
    label: "Mainframe Console",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-9-mainframe-s1",
        text: "The subterranean brain pulsing behind secure doors, guarded by biometric locks and sub-zero airflow, awaits your decryption.",
      },
      {
        id: "clue-9-mainframe-s2",
        text: "Approach the primary sysadmin operator console where real-time core utilization gauges illuminate the darkened vault.",
      },
      {
        id: "clue-9-mainframe-s3",
        text: "At the center of the cold-aisle containment rows, the master terminal monitors campus-wide infrastructure traffic.",
      },
    ],
  },
  {
    objectId: "server_cooling_unit",
    label: "CRAC Cooling Unit",
    sentences: [
      {
        id: "clue-9-cooling-s1",
        text: "Massive computer room air conditioning columns circulate chilled pressurized air through perforated floor tiles.",
      },
      {
        id: "clue-9-cooling-s2",
        text: "Inspect the heavy industrial refrigeration unit whose humming intake fans maintain strict sub-zero airflow.",
      },
      {
        id: "clue-9-cooling-s3",
        text: "Behind the acoustic vibration dampener of the primary cooling tower, a thermal-resistant transceiver is transmitting.",
      },
    ],
  },
  {
    objectId: "server_backup_generator",
    label: "UPS Battery Rack",
    sentences: [
      {
        id: "clue-9-ups-s1",
        text: "Banks of high-amperage uninterruptible power supply cells stand ready to safeguard the campus grid against voltage drops.",
      },
      {
        id: "clue-9-ups-s2",
        text: "Follow the thick yellow power conduit down to the auxiliary battery cabinets providing emergency electrical reserves.",
      },
      {
        id: "clue-9-ups-s3",
        text: "Attached to the side of the heavy industrial power inverter rack, a concealed hardware tap monitors emergency circuits.",
      },
    ],
  },
  {
    objectId: "server_cable_patch",
    label: "Fiber Patch Panel",
    sentences: [
      {
        id: "clue-9-patch-s1",
        text: "Thousands of illuminated yellow and aqua fiber-optic strands converge into high-density LC patch enclosures.",
      },
      {
        id: "clue-9-patch-s2",
        text: "Inspect the telecommunications cross-connect wall where campus backbone fibers link departmental subnets.",
      },
      {
        id: "clue-9-patch-s3",
        text: "Between the neatly laced fiber management rings on rack bay six, an unexpected optical splitter was introduced.",
      },
    ],
  },
  {
    objectId: "server_fire_suppression",
    label: "Halon Gas Console",
    sentences: [
      {
        id: "clue-9-fire-s1",
        text: "A bright red emergency clean-agent gas discharge station stands mounted beside the emergency exit bulkhead.",
      },
      {
        id: "clue-9-fire-s2",
        text: "Examine the pneumatic fire suppression panel equipped with warning strobes and manual abort interlocks.",
      },
      {
        id: "clue-9-fire-s3",
        text: "Behind the tamper-evident safety glass of the gaseous suppression release box, a micro-chip is wedged in the hinge.",
      },
    ],
  },
];
