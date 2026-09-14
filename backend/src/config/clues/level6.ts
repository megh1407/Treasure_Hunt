/**
 * Level 6 Clue Pool: Locker 404 (Main Academic Building / Hallway)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_6_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "main_locker_404",
    label: "Locker 404",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-6-locker-s1",
        text: "At the institutional heart where lecture corridors intersect, a steel door bears the digital error of something never found.",
      },
      {
        id: "clue-6-locker-s2",
        text: "Walk down the corridor of grey metal lockers until you spot the one bearing an HTTP error code upon its dial.",
      },
      {
        id: "clue-6-locker-s3",
        text: "Seek the ventilation louvers of a metallic storage cubicle whose stenciled digits signify missing data across the web.",
      },
    ],
  },
  {
    objectId: "main_trophy_case",
    label: "Trophy Cabinet",
    sentences: [
      {
        id: "clue-6-trophy-s1",
        text: "Polished brass cups, varsity ribbons, and technology tournament plaques gleam behind illuminated glass doors.",
      },
      {
        id: "clue-6-trophy-s2",
        text: "Examine the showcase of institutional achievements mounted along the administrative atrium wall.",
      },
      {
        id: "clue-6-trophy-s3",
        text: "Between the championship cups and engraved science fair medals, an anomalous metallic cylinder reflects the spotlight.",
      },
    ],
  },
  {
    objectId: "main_noticeboard",
    label: "Department Noticeboard",
    sentences: [
      {
        id: "clue-6-notice-s1",
        text: "Semester exam schedules, faculty office hours, and thesis defense flyers cover a dense felt bulletin board.",
      },
      {
        id: "clue-6-notice-s2",
        text: "Scan the departmental communication board positioned outside the dean's corridor for an unlisted notice.",
      },
      {
        id: "clue-6-notice-s3",
        text: "Tucked behind an official memo regarding campus cybersecurity audits, a ciphered index card has been pinned.",
      },
    ],
  },
  {
    objectId: "main_reception_desk",
    label: "Reception Desk",
    sentences: [
      {
        id: "clue-6-reception-s1",
        text: "A curved laminate reception counter with visitor badge printers and guest registration logs anchors the main foyer.",
      },
      {
        id: "clue-6-reception-s2",
        text: "Approach the central visitor check-in station where student staff monitor daily administrative arrivals.",
      },
      {
        id: "clue-6-reception-s3",
        text: "Behind the telephone terminal and visitor registry on the front desk, an operative left an encrypted plastic keycard.",
      },
    ],
  },
  {
    objectId: "main_display_kiosk",
    label: "Interactive Directory",
    sentences: [
      {
        id: "clue-6-kiosk-s1",
        text: "A freestanding vertical touchscreen displays interactive department blueprints and classroom schedules.",
      },
      {
        id: "clue-6-kiosk-s2",
        text: "Inspect the digital wayfinding pillar standing near the central architectural stairwell.",
      },
      {
        id: "clue-6-kiosk-s3",
        text: "Beneath the glass bezel of the campus information directory kiosk, an optical NFC sticker is waiting for proximity scan.",
      },
    ],
  },
];
