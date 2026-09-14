/**
 * Level 5 Clue Pool: Hidden Recipe (Cafeteria / Dining Area)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

import type { ClueLocationConfig } from "./level1";

export const LEVEL_5_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "cafe_corner_table",
    label: "Corner Table",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-5-table-s1",
        text: "A bustling crossroads of aromas and chatter between lectures. Look beneath the quietest corner table for what was left behind.",
      },
      {
        id: "clue-5-table-s2",
        text: "In the far corner where daylight streams through floor-to-ceiling glass, check the underside of the secluded circular table.",
      },
      {
        id: "clue-5-table-s3",
        text: "Seek the perimeter seating nook distanced from the food lines, where an operative taped an encrypted receipt beneath the tabletop.",
      },
    ],
  },
  {
    objectId: "cafe_vending_machine",
    label: "Vending Machine",
    sentences: [
      {
        id: "clue-5-vending-s1",
        text: "An illuminated snack dispenser hums softly in the beverage hallway. Check the metal refund retrieval tray.",
      },
      {
        id: "clue-5-vending-s2",
        text: "Inspect the automated drink cooler where chilled bottles rest behind glass. A beacon rests along the bottom grille.",
      },
      {
        id: "clue-5-vending-s3",
        text: "Beside the coin validator on the dual-column refreshment dispenser, an unusual magnetic cipher card has been stashed.",
      },
    ],
  },
  {
    objectId: "cafe_serving_counter",
    label: "Serving Counter",
    sentences: [
      {
        id: "clue-5-counter-s1",
        text: "Stainless steel warming bays and glass sneeze guards line the primary food distribution partition.",
      },
      {
        id: "clue-5-counter-s2",
        text: "Examine the tray slide along the hot buffet line where culinary prep containers are staged during lunch rush.",
      },
      {
        id: "clue-5-counter-s3",
        text: "Underneath the polished aluminum tray runner near the cashier terminal, an operative secured an encoded badge.",
      },
    ],
  },
  {
    objectId: "cafe_menu_board",
    label: "Daily Menu Board",
    sentences: [
      {
        id: "clue-5-menu-s1",
        text: "Chalk lettering and daily specials are inscribed on a framed blackboard hung high above the order line.",
      },
      {
        id: "clue-5-menu-s2",
        text: "Read between the nutritional disclaimers and calorie counts posted on the central dining directory.",
      },
      {
        id: "clue-5-menu-s3",
        text: "Behind the dark wooden frame of the meal schedule board, a faint wireless tag was slipped into the backing paper.",
      },
    ],
  },
  {
    objectId: "cafe_recycle_station",
    label: "Recycling Station",
    sentences: [
      {
        id: "clue-5-recycle-s1",
        text: "Color-coded waste receptacles for compost, paper goods, and aluminum cans stand near the exit portal.",
      },
      {
        id: "clue-5-recycle-s2",
        text: "Inspect the eco-sorting station where blue and green bins encourage sustainable disposal across the hall.",
      },
      {
        id: "clue-5-recycle-s3",
        text: "Behind the heavy plastic panel of the beverage carton recycling bay, a waterproof data capsule was concealed.",
      },
    ],
  },
];
