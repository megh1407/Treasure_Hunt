/**
 * Level 1 Clue Pool: The Silent Archive (Library / Reading Hall)
 * 
 * Contains all valid hiding locations and multiple thematic clue sentence variants per location.
 * ZERO leaks: No physical campus building names, coordinates, internal IDs, or answers.
 */

export interface ClueSentenceConfig {
  readonly id: string;
  readonly text: string;
}

export interface ClueLocationConfig {
  readonly objectId: string;
  readonly label: string;
  readonly isCanonicalTarget?: boolean;
  readonly sentences: readonly ClueSentenceConfig[];
}

export const LEVEL_1_CLUE_LOCATIONS: readonly ClueLocationConfig[] = [
  {
    objectId: "lib_old_book",
    label: "Worn Book",
    isCanonicalTarget: true,
    sentences: [
      {
        id: "clue-1-book-s1",
        text: "Thousands of recorded voices rest in unbroken silence. Seek the quiet sanctuary where knowledge is bound in paper and ink.",
      },
      {
        id: "clue-1-book-s2",
        text: "Among the study tables where readers whisper, an aged volume shelters an encrypted trace within its weathered pages.",
      },
      {
        id: "clue-1-book-s3",
        text: "Seek a faded binding resting quietly on the desk, waiting for an operative to inspect what lies between its covers.",
      },
    ],
  },
  {
    objectId: "lib_shelf_a",
    label: "Tall Bookshelf",
    sentences: [
      {
        id: "clue-1-shelfa-s1",
        text: "Where towering timber stacks climb toward the ceiling, examine the vertical rows of ancient reference volumes.",
      },
      {
        id: "clue-1-shelfa-s2",
        text: "Follow the silent canyon of tall wooden bookcases where centuries of research stand shoulder to shoulder.",
      },
      {
        id: "clue-1-shelfa-s3",
        text: "High upon the eastern tiers of reference manuals, a subtle anomalous signature clings to the tall wooden stacks.",
      },
    ],
  },
  {
    objectId: "lib_shelf_b",
    label: "Archive Shelf",
    sentences: [
      {
        id: "clue-1-shelfb-s1",
        text: "Past decades of technical journals gather dust on the secondary archive racks. Trace the forgotten publications.",
      },
      {
        id: "clue-1-shelfb-s2",
        text: "Navigate toward the retrospective index where serial journals from years past lie undisturbed on metal shelves.",
      },
      {
        id: "clue-1-shelfb-s3",
        text: "A lower row of catalogued periodicals holds a clandestine frequency hidden behind historic research folios.",
      },
    ],
  },
  {
    objectId: "lib_computer",
    label: "Catalogue Terminal",
    sentences: [
      {
        id: "clue-1-computer-s1",
        text: "Beside the lending corridor, a dark catalogue monitor waits in standby mode. Check the search station.",
      },
      {
        id: "clue-1-computer-s2",
        text: "An unlit digital inventory terminal sits on the consultation desk. A hidden transmission pulses near its keyboard.",
      },
      {
        id: "clue-1-computer-s3",
        text: "Inspect the public indexing console where digital bibliographies once helped researchers trace elusive volumes.",
      },
    ],
  },
  {
    objectId: "lib_chair",
    label: "Reading Chair",
    sentences: [
      {
        id: "clue-1-chair-s1",
        text: "In the cushioned study nook where contemplative scholars rest, an operative left a subtle marker behind.",
      },
      {
        id: "clue-1-chair-s2",
        text: "A solitary leather study chair sits angled toward the windows. Check beneath the reading armrest.",
      },
      {
        id: "clue-1-chair-s3",
        text: "Near the quiet alcove reserved for deep concentration, investigate the comfortable seating area for a concealed trace.",
      },
    ],
  },
  {
    objectId: "lib_cabinet",
    label: "Filing Cabinet",
    sentences: [
      {
        id: "clue-1-cabinet-s1",
        text: "Heavy metal drawers holding archival accession records stand locked against the perimeter wall. Inspect the steel cabinet.",
      },
      {
        id: "clue-1-cabinet-s2",
        text: "Seek the grey metal filing unit labeled with past inventory dates. A magnetic beacon rests against its chassis.",
      },
      {
        id: "clue-1-cabinet-s3",
        text: "A vintage multi-drawer document vault houses historical administrative paperwork and an elusive digital marker.",
      },
    ],
  },
  {
    objectId: "lib_painting",
    label: "Founder's Portrait",
    sentences: [
      {
        id: "clue-1-painting-s1",
        text: "The stern gaze of the institution's visionary watches from a gilded frame mounted upon the central hall wall.",
      },
      {
        id: "clue-1-painting-s2",
        text: "Inspect the historic oil canvas commemorating the campus founder. A cryptic signal resonates near the wooden frame.",
      },
      {
        id: "clue-1-painting-s3",
        text: "Behind the illuminated memorial portrait hanging in the reading hall, a faint electronic signature has been detected.",
      },
    ],
  },
  {
    objectId: "lib_noticeboard",
    label: "Notice Board",
    sentences: [
      {
        id: "clue-1-notice-s1",
        text: "Pinned announcements, campus event flyers, and festival timetables overlap on a cork bulletin board near the entryway.",
      },
      {
        id: "clue-1-notice-s2",
        text: "Examine the wooden-framed bulletin board where paper circulars and technology festival schedules are displayed.",
      },
      {
        id: "clue-1-notice-s3",
        text: "Beneath layers of student notices and campus bulletins, a hidden coordinate fragment was pinned in plain sight.",
      },
    ],
  },
  {
    objectId: "lib_box",
    label: "Storage Box",
    sentences: [
      {
        id: "clue-1-box-s1",
        text: "In the corner where surplus supplies and uncollected parcel cartons sit piled, check the labeled storage container.",
      },
      {
        id: "clue-1-box-s2",
        text: "A reinforced utility carton rests tucked beneath the perimeter benches. Inspect its sealed lid.",
      },
      {
        id: "clue-1-box-s3",
        text: "Behind the reading partitions, an unattended storage container conceals an operative's encrypted hardware parcel.",
      },
    ],
  },
];
