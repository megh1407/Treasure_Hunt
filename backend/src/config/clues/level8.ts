/**
 * Level 8 Clue Pool: Buried Marker (Garden Pavilion / Courtyard)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_8_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "garden_stone_marker",
    label: "Carved Boundary Stone",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-8-marker-s1",
        text: "Beneath open skies and stone arches where nature borders concrete, an ancient surveyor's mark harbors a forgotten frequency.",
      },
      {
        id: "clue-8-marker-s2",
        text: "Find the weathered granite obelisk set into the grass where early campus surveyors marked the primary geodetic reference point.",
      },
      {
        id: "clue-8-marker-s3",
        text: "Inspect the moss-covered corner stone engraved with geometric benchmarks, located where the paved pathway curves into the flora.",
      },
    ],
  },
  {
    objectId: "garden_bench",
    label: "Stone Bench",
    sentences: [
      {
        id: "clue-8-bench-s1",
        text: "A carved limestone bench rests sheltered beneath the canopy of ornamental flowering trees. Check under its heavy slab.",
      },
      {
        id: "clue-8-bench-s2",
        text: "Seek the cool stone seat positioned along the gravel promenade where students sit between afternoon lectures.",
      },
      {
        id: "clue-8-bench-s3",
        text: "Beneath the central support pillar of the carved granite park bench, an operative secured an airtight data cylinder.",
      },
    ],
  },
  {
    objectId: "garden_fountain",
    label: "Decorative Fountain",
    sentences: [
      {
        id: "clue-8-fountain-s1",
        text: "Gentle splashing water cascades over tiered stone basins in the center of the open courtyard. Inspect the dry perimeter ledge.",
      },
      {
        id: "clue-8-fountain-s2",
        text: "Follow the acoustic rhythm of recirculating water to the ornamental fountain flanked by blooming flower beds.",
      },
      {
        id: "clue-8-fountain-s3",
        text: "Along the outer masonry coping of the ornamental water feature, a weatherproof radio tag rests above the waterline.",
      },
    ],
  },
  {
    objectId: "garden_planter",
    label: "Botanical Planter",
    sentences: [
      {
        id: "clue-8-planter-s1",
        text: "Large terracotta urns filled with decorative native ferns and river pebbles border the cobblestone walkway.",
      },
      {
        id: "clue-8-planter-s2",
        text: "Inspect the heavy ceramic planter box where lush evergreen foliage conceals an operative's hidden marker.",
      },
      {
        id: "clue-8-planter-s3",
        text: "Tucked behind the base of the wide brick floral planter along the west arbor, an encrypted transponder waits quietly.",
      },
    ],
  },
  {
    objectId: "garden_sundial",
    label: "Brass Sundial",
    sentences: [
      {
        id: "clue-8-sundial-s1",
        text: "A weathered brass gnomon casts a moving solar shadow across an engraved circular pedestal. Read the timeless inscription.",
      },
      {
        id: "clue-8-sundial-s2",
        text: "Locate the astronomical instrument mounted on an octagonal pillar where sunlight tracks the passage of hours across campus.",
      },
      {
        id: "clue-8-sundial-s3",
        text: "Underneath the horizontal brass azimuth ring of the classical campus sundial, a tiny metallic cipher ring is affixed.",
      },
    ],
  },
];
