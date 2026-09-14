/**
 * Level 4 Clue Pool: Row Seven (Auditorium / Main Hall)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_4_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "auditorium_seat_row7",
    label: "Auditorium Seat Row 7",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-4-seat-s1",
        text: "An expansive theater where speeches echo to empty seats. Count seven tiers back to uncover the hidden frequency.",
      },
      {
        id: "clue-4-seat-s2",
        text: "In the quiet center aisle of tiered velvet seating, seek the seventh row where an armrest conceals a metallic chip.",
      },
      {
        id: "clue-4-seat-s3",
        text: "Seven steps upward from the orchestra pit, a folded acoustic seat holds a magnetic resonance tag beneath its cushion.",
      },
    ],
  },
  {
    objectId: "auditorium_podium",
    label: "Speaker's Podium",
    sentences: [
      {
        id: "clue-4-podium-s1",
        text: "A polished wooden lectern flanked by gooseneck microphones stands under the stage spotlight. Check the reading surface.",
      },
      {
        id: "clue-4-podium-s2",
        text: "Step onto the presentation platform where distinguished keynote addresses are delivered from behind a tall dark podium.",
      },
      {
        id: "clue-4-podium-s3",
        text: "Behind the institution seal on the speaker's rostrum, a concealed receiver was left behind by an earlier operative.",
      },
    ],
  },
  {
    objectId: "auditorium_projector",
    label: "AV Control Rack",
    sentences: [
      {
        id: "clue-4-projector-s1",
        text: "High-definition laser projection switches and optical video routers sit mounted in an enclosed steel control cabinet.",
      },
      {
        id: "clue-4-projector-s2",
        text: "Inspect the multimedia distribution enclosure positioned against the back wall, responsible for the stage screens.",
      },
      {
        id: "clue-4-projector-s3",
        text: "Behind the HDMI matrix switcher in the audiovisual enclosure, an auxiliary data carrier has been spliced in.",
      },
    ],
  },
  {
    objectId: "auditorium_soundboard",
    label: "Sound Mixing Console",
    sentences: [
      {
        id: "clue-4-sound-s1",
        text: "A 32-channel digital audio mixer with sliding faders and peak meters overlooks the grand amphitheater.",
      },
      {
        id: "clue-4-sound-s2",
        text: "Examine the sound engineer's booth where balanced XLR patch bays and acoustic monitors control the hall's audio.",
      },
      {
        id: "clue-4-sound-s3",
        text: "Near the master decibel output meters on the acoustic mixing desk, a miniature frequency transmitter is broadcasting.",
      },
    ],
  },
  {
    objectId: "auditorium_backstage_door",
    label: "Backstage Access Door",
    sentences: [
      {
        id: "clue-4-door-s1",
        text: "Heavy acoustic fire drapes flank a reinforced steel door leading into the dark wings behind the main stage.",
      },
      {
        id: "clue-4-door-s2",
        text: "Investigate the restricted stage-left doorway where theatrical rigging lines and lighting counterweights descend.",
      },
      {
        id: "clue-4-door-s3",
        text: "Beside the emergency exit latch in the backstage wings, an operative etched an encrypted cipher onto the steel frame.",
      },
    ],
  },
];
