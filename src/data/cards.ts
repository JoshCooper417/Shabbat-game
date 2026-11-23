import {
  ChoreCardDef,
  ClockCard,
  DifficultyConfig,
  DifficultyId,
  HelperDef,
  HelperId,
  RoomCardDef,
  SlowDownCardDef,
  ToolCardDef,
  ZoneId,
  ZoneMeta,
} from '../engine/types';

export const assetUrl = (relPath: string): string => {
  const base = import.meta.env?.BASE_URL ?? './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedRel = relPath.startsWith('/') ? relPath.slice(1) : relPath;
  return `${normalizedBase}${normalizedRel}`;
};

export const SEAT_ORDER: readonly HelperId[] = ['ABBA', 'NAEL', 'MOMMY', 'MEKIMI'];

export const SHARED_BACKS = {
  chores: 'assets/cards/back_SHARED_chores.webp',
  eventsAndTools: 'assets/cards/back_SHARED_events_and_tools.webp',
  helpers: 'assets/cards/back_SHARED_helpers.webp',
  clock: 'assets/cards/back_SHARED_shabbat_clock.webp',
} as const;

export const COVER_IMAGE = 'assets/cover_family.webp';
export const TABLE_WOOD_IMAGE = 'assets/oak_tabletop.webp';

export const BOOKLET_PAGES: readonly { page: number; title: string; image: string }[] = [
  { page: 1, title: 'Cover', image: 'assets/booklet/small_booklet_page_01.webp' },
  { page: 2, title: '1. Goal & Key Basics', image: 'assets/booklet/small_booklet_page_02.webp' },
  { page: 3, title: 'Table Layout Diagram', image: 'assets/booklet/small_booklet_page_03.webp' },
  { page: 4, title: "2. What's in the Box", image: 'assets/booklet/small_booklet_page_04.webp' },
  { page: 5, title: '3. Setup (Standard Mode)', image: 'assets/booklet/small_booklet_page_05.webp' },
  { page: 6, title: '4. Players & Turn Order', image: 'assets/booklet/small_booklet_page_06.webp' },
  { page: 7, title: '5. Actions: Move & Tidy', image: 'assets/booklet/small_booklet_page_07.webp' },
  { page: 8, title: 'Room States: CAN & CANNOT', image: 'assets/booklet/small_booklet_page_08.webp' },
  { page: 9, title: '6. Actions: Chores & Errands', image: 'assets/booklet/small_booklet_page_09.webp' },
  { page: 10, title: '7. Actions: Household Tools', image: 'assets/booklet/small_booklet_page_10.webp' },
  { page: 11, title: '8. Events & End of Round', image: 'assets/booklet/small_booklet_page_11.webp' },
  { page: 12, title: '9. Meet the 4 Cooper Helpers', image: 'assets/booklet/small_booklet_page_12.webp' },
  { page: 13, title: '10. Difficulty Modes', image: 'assets/booklet/small_booklet_page_13.webp' },
  { page: 14, title: '11. Quick 1-Round Example', image: 'assets/booklet/small_booklet_page_14.webp' },
  { page: 15, title: "Kid's First-Game Guide (6+)", image: 'assets/booklet/small_booklet_page_15.webp' },
  { page: 16, title: 'Tabletop Quick Reference', image: 'assets/booklet/small_booklet_page_16.webp' },
];

export const ZONE_META: Record<ZoneId, ZoneMeta> = {
  KITCHEN: {
    id: 'KITCHEN',
    name: 'Kitchen',
    shortName: 'Kitchen',
    color: '#c96a07',
    softBg: '#fef6e4',
    border: '#ebd09b',
  },
  DOWNSTAIRS: {
    id: 'DOWNSTAIRS',
    name: 'Downstairs Balagan',
    shortName: 'Downstairs',
    color: '#0e7c66',
    softBg: '#e8f7f3',
    border: '#a5dcd0',
  },
  TABLE: {
    id: 'TABLE',
    name: 'Table',
    shortName: 'Table',
    color: '#2458c4',
    softBg: '#ebf2ff',
    border: '#b5ccf8',
  },
  UPSTAIRS: {
    id: 'UPSTAIRS',
    name: 'Upstairs',
    shortName: 'Upstairs',
    color: '#7a2fd1',
    softBg: '#f4ecff',
    border: '#d1b7f7',
  },
};

export const HELPER_DEFS: Record<HelperId, HelperDef> = {
  ABBA: {
    id: 'ABBA',
    name: 'Abba',
    startSlot: 0, // Top-Left
    accent: '#2358d4',
    softBg: '#edf3ff',
    cardImage: 'assets/cards/helper_01_abba.webp',
    avatarImage: 'assets/avatars/abba.webp',
    figurineImage: 'assets/figurines/abba.webp',
    flavor: '“Flour on the counter? Fine. Total meltdown? Not on his watch.”',
    powers: [
      {
        name: 'Solo Cleanup',
        timing: 'Your Turn',
        text: "Flip a Red Blocked room you're in back to Clear all by yourself (1 Action — no teammate needed).",
      },
      {
        name: 'Balagan Barrier',
        timing: 'Always On',
        text: "While Abba stands in a Cluttered room, Slow-Downs can't flip it Blocked.",
      },
    ],
  },
  NAEL: {
    id: 'NAEL',
    name: 'Nael',
    startSlot: 2, // Top-Right
    accent: '#0d8a5f',
    softBg: '#e8faf3',
    cardImage: 'assets/cards/helper_03_nael.webp',
    avatarImage: 'assets/avatars/nael.webp',
    figurineImage: 'assets/figurines/nael.webp',
    flavor: "“Messy room? Doesn't stop the sous-chef.”",
    powers: [
      {
        name: 'Learning Tower Power!',
        timing: 'Always On',
        text: 'While Nael and a teammate share a Cluttered room, either one can finish a Team Chore there (not Blocked).',
      },
    ],
  },
  MOMMY: {
    id: 'MOMMY',
    name: 'Mommy',
    startSlot: 8, // Bottom-Right
    accent: '#c82074',
    softBg: '#fdf0f7',
    cardImage: 'assets/cards/helper_02_mommy.webp',
    avatarImage: 'assets/avatars/mommy.webp',
    figurineImage: 'assets/figurines/mommy.webp',
    flavor: '“Tracking 47 things in her head and already three steps ahead.”',
    powers: [
      {
        name: 'Errand Express',
        timing: 'Your Turn',
        text: 'Once per turn, Pick Up or Deliver an Errand for FREE (0 Actions). You may Pick Up or Deliver Errands even in a Cluttered room (not Blocked).',
      },
    ],
  },
  MEKIMI: {
    id: 'MEKIMI',
    name: 'Mekimi',
    startSlot: 6, // Bottom-Left
    accent: '#7834d8',
    softBg: '#f3edff',
    cardImage: 'assets/cards/helper_04_mekimi.webp',
    avatarImage: 'assets/avatars/mekimi.webp',
    figurineImage: 'assets/figurines/mekimi.webp',
    flavor: "“One giant grin and suddenly she's already across the house.”",
    powers: [
      {
        name: 'Turbo Crawl',
        timing: 'Your Turn',
        text: 'Whenever you spend 1 Action to Move, crawl straight into ANY room on the board!',
      },
    ],
  },
};

export const DIFFICULTY_CONFIGS: Record<DifficultyId, DifficultyConfig> = {
  BEGINNER: {
    id: 'BEGINNER',
    name: 'Beginner',
    tagline: 'First Game · Ages 6+',
    clockLength: 7,
    afternoonCards: 6,
    totalChores: 10,
    choreRowTarget: 4,
    choreDeckStart: 6,
    slowDownCount: 17,
    boxTimeFlies: true,
    startingClutterSlots: [4], // Center
  },
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard',
    tagline: 'Balanced Family Play',
    clockLength: 6,
    afternoonCards: 5,
    totalChores: 13,
    choreRowTarget: 4,
    choreDeckStart: 9,
    slowDownCount: 18,
    boxTimeFlies: false,
    startingClutterSlots: [1, 7], // Top-Center & Bottom-Center
  },
  HARD: {
    id: 'HARD',
    name: 'Hard',
    tagline: 'Expert Friday Rush',
    clockLength: 5,
    afternoonCards: 4,
    totalChores: 15,
    choreRowTarget: 4,
    choreDeckStart: 11,
    slowDownCount: 18,
    boxTimeFlies: false,
    startingClutterSlots: [1, 7], // Top-Center & Bottom-Center
  },
};

export const ROOM_DECK: readonly RoomCardDef[] = [
  {
    id: 'ROOM_05',
    number: 5,
    name: 'The Giant Island',
    zone: 'KITCHEN',
    frontImage: 'assets/cards/room_05_giant_island.webp',
    blockedImage: 'assets/cards/back_room_05_giant_island_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_05_giant_island.webp',
  },
  {
    id: 'ROOM_06',
    number: 6,
    name: 'Mixer Counter',
    subtitle: 'Plata & Kumkum',
    zone: 'KITCHEN',
    frontImage: 'assets/cards/room_06_mixer_counter.webp',
    blockedImage: 'assets/cards/back_room_06_mixer_counter_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_06_mixer_counter.webp',
  },
  {
    id: 'ROOM_07',
    number: 7,
    name: 'The Fridge',
    zone: 'KITCHEN',
    frontImage: 'assets/cards/room_07_the_fridge.webp',
    blockedImage: 'assets/cards/back_room_07_the_fridge_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_07_the_fridge.webp',
  },
  {
    id: 'ROOM_08',
    number: 8,
    name: 'The Mamad',
    subtitle: 'Playroom',
    zone: 'DOWNSTAIRS',
    frontImage: 'assets/cards/room_08_the_mamad.webp',
    blockedImage: 'assets/cards/back_room_08_the_mamad_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_08_the_mamad.webp',
  },
  {
    id: 'ROOM_09',
    number: 9,
    name: 'The Salon',
    zone: 'DOWNSTAIRS',
    frontImage: 'assets/cards/room_09_the_salon.webp',
    blockedImage: 'assets/cards/back_room_09_the_salon_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_09_the_salon.webp',
  },
  {
    id: 'ROOM_10',
    number: 10,
    name: 'Sink & Dishwasher',
    zone: 'DOWNSTAIRS',
    frontImage: 'assets/cards/room_10_sink_dishwasher.webp',
    blockedImage: 'assets/cards/back_room_10_sink_dishwasher_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_10_sink_dishwasher.webp',
  },
  {
    id: 'ROOM_11',
    number: 11,
    name: 'The Dining Table',
    zone: 'TABLE',
    frontImage: 'assets/cards/room_11_dining_table.webp',
    blockedImage: 'assets/cards/back_room_11_dining_table_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_11_dining_table.webp',
  },
  {
    id: 'ROOM_12',
    number: 12,
    name: 'Shabbat Candles Cabinet',
    zone: 'TABLE',
    frontImage: 'assets/cards/room_12_candles_cabinet.webp',
    blockedImage: 'assets/cards/back_room_12_candles_cabinet_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_12_candles_cabinet.webp',
  },
  {
    id: 'ROOM_13',
    number: 13,
    name: 'Chairs',
    zone: 'TABLE',
    frontImage: 'assets/cards/room_13_chairs.webp',
    blockedImage: 'assets/cards/back_room_13_chairs_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_13_chairs.webp',
  },
  {
    id: 'ROOM_14',
    number: 14,
    name: 'The Bathtub',
    zone: 'UPSTAIRS',
    frontImage: 'assets/cards/room_14_the_bathtub.webp',
    blockedImage: 'assets/cards/back_room_14_the_bathtub_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_14_the_bathtub.webp',
  },
  {
    id: 'ROOM_15',
    number: 15,
    name: 'The Shower',
    zone: 'UPSTAIRS',
    frontImage: 'assets/cards/room_15_the_shower.webp',
    blockedImage: 'assets/cards/back_room_15_the_shower_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_15_the_shower.webp',
  },
  {
    id: 'ROOM_16',
    number: 16,
    name: 'The Bedrooms',
    zone: 'UPSTAIRS',
    frontImage: 'assets/cards/room_16_the_bedrooms.webp',
    blockedImage: 'assets/cards/back_room_16_the_bedrooms_BLOCKED.webp',
    artImage: 'assets/rooms-art/room_16_the_bedrooms.webp',
  },
];

// 18 Chores: 10 Team Chores + 8 Errands (exact D2* verified mapping!)
export const CHORE_DECK: readonly ChoreCardDef[] = [
  // 10 Team Chores
  {
    id: 'CHORE_18',
    number: 18,
    type: 'TEAM_CHORE',
    title: 'Fill Kumkum & Set Plata Timer',
    zone: 'KITCHEN',
    rulesText:
      'With 2 or more Helpers in a Clear Kitchen (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Water topped all the way up and the Shabbat timer is looking good.”',
    frontImage: 'assets/cards/chore_18_kumkum_plata.webp',
  },
  {
    id: 'CHORE_27',
    number: 27,
    type: 'TEAM_CHORE',
    title: 'Learning Tower Bake-Off',
    zone: 'KITCHEN',
    rulesText:
      'With 2 or more Helpers in a Clear Kitchen (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: "“Nael's on the tower—time to get the white sugar!”",
    frontImage: 'assets/cards/chore_27_learning_tower.webp',
  },
  {
    id: 'CHORE_31',
    number: 31,
    type: 'TEAM_CHORE',
    title: 'Clear the Giant Island',
    zone: 'KITCHEN',
    rulesText:
      'With 2 or more Helpers in a Clear Kitchen (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Wait... we actually have a countertop under there?!”',
    frontImage: 'assets/cards/chore_31_clear_giant_island.webp',
  },
  {
    id: 'CHORE_28',
    number: 28,
    type: 'TEAM_CHORE',
    title: 'Mamad Toy Avalanche',
    zone: 'DOWNSTAIRS',
    rulesText:
      'With 2 or more Helpers in a Clear Downstairs room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“A two-person scoop-and-bin operation.”',
    frontImage: 'assets/cards/chore_28_mamad_avalanche.webp',
  },
  {
    id: 'CHORE_32',
    number: 32,
    type: 'TEAM_CHORE',
    title: 'The Great Salon Reset',
    zone: 'DOWNSTAIRS',
    rulesText:
      'With 2 or more Helpers in a Clear Downstairs room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Not a single rogue toy underfoot.”',
    frontImage: 'assets/cards/chore_32_great_salon_reset.webp',
  },
  {
    id: 'CHORE_20',
    number: 20,
    type: 'TEAM_CHORE',
    title: 'High Chair & Chair Stack',
    zone: 'TABLE',
    rulesText:
      'With 2 or more Helpers in a Clear Table room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Unstack the extra chairs and pull the high chair into position.”',
    frontImage: 'assets/cards/chore_20_high_chair_stack.webp',
  },
  {
    id: 'CHORE_29',
    number: 29,
    type: 'TEAM_CHORE',
    title: 'Set the Shabbat Table',
    zone: 'TABLE',
    rulesText:
      'With 2 or more Helpers in a Clear Table room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Plates, cups, silverware—teamwork makes the dream work.”',
    frontImage: 'assets/cards/chore_29_set_shabbat_table.webp',
  },
  {
    id: 'CHORE_33',
    number: 33,
    type: 'TEAM_CHORE',
    title: 'Shabbat Candles Ready',
    zone: 'TABLE',
    rulesText:
      'With 2 or more Helpers in a Clear Table room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: "“Out of the cabinet, last week's wicks removed, waiting for sunset.”",
    frontImage: 'assets/cards/chore_33_shabbat_candles_ready.webp',
  },
  {
    id: 'CHORE_21',
    number: 21,
    type: 'TEAM_CHORE',
    title: 'Lay Out the Shabbat Outfits',
    zone: 'UPSTAIRS',
    rulesText:
      'With 2 or more Helpers in a Clear Upstairs room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Tiny shirts, clean diapers, and picking out super cute outfits.”',
    frontImage: 'assets/cards/chore_21_shabbat_outfits.webp',
  },
  {
    id: 'CHORE_30',
    number: 30,
    type: 'TEAM_CHORE',
    title: 'Bath Time Splash Squad',
    zone: 'UPSTAIRS',
    rulesText:
      'With 2 or more Helpers in a Clear Upstairs room (or Cluttered if Nael is here), spend 1 Action to finish this together!',
    flavor: '“Soap, soap, soap!”',
    frontImage: 'assets/cards/chore_30_bath_splash_squad.webp',
  },

  // 8 Errands (exact 2/2/2/2 Start Zones)
  {
    id: 'CHORE_17',
    number: 17,
    type: 'ERRAND',
    title: 'Challah: Mixer to Oven',
    zone: 'KITCHEN',
    endZone: 'TABLE',
    rulesText:
      '1 Action: Pick Up in a Clear Kitchen, then 1 Action: Deliver in a Clear Table room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Kneaded in the mixer, baked golden, and carried right to the table.”',
    frontImage: 'assets/cards/chore_17_challah_oven.webp',
  },
  {
    id: 'CHORE_22',
    number: 22,
    type: 'ERRAND',
    title: 'Half Baked Harvest Showstopper',
    zone: 'KITCHEN',
    endZone: 'TABLE',
    rulesText:
      '1 Action: Pick Up in a Clear Kitchen, then 1 Action: Deliver in a Clear Table room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“23 ingredients, 4 mixing bowls, zero regrets—straight to the table.”',
    frontImage: 'assets/cards/chore_22_hbh_showstopper.webp',
  },
  {
    id: 'CHORE_23',
    number: 23,
    type: 'ERRAND',
    title: 'Shabbat Flowers to the Center',
    zone: 'DOWNSTAIRS',
    endZone: 'TABLE',
    rulesText:
      '1 Action: Pick Up in a Clear Downstairs room, then 1 Action: Deliver in a Clear Table room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Put them with water in a vase on the table.”',
    frontImage: 'assets/cards/chore_23_shabbat_flowers.webp',
  },
  {
    id: 'CHORE_25',
    number: 25,
    type: 'ERRAND',
    title: 'Herd the Kids Upstairs for Baths',
    zone: 'DOWNSTAIRS',
    endZone: 'UPSTAIRS',
    rulesText:
      '1 Action: Pick Up in a Clear Downstairs room, then 1 Action: Deliver in a Clear Upstairs room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Peel everyone away from the toys and up the stairs.”',
    frontImage: 'assets/cards/chore_25_herd_kids_baths.webp',
  },
  {
    id: 'CHORE_19',
    number: 19,
    type: 'ERRAND',
    title: 'Dishwasher Round #3',
    zone: 'TABLE',
    endZone: 'DOWNSTAIRS',
    rulesText:
      '1 Action: Pick Up in a Clear Table room, then 1 Action: Deliver in a Clear Downstairs room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Clear the last dishes off the table for strategic Friday dish-tetris.”',
    frontImage: 'assets/cards/chore_19_dishwasher_round3.webp',
  },
  {
    id: 'CHORE_24',
    number: 24,
    type: 'ERRAND',
    title: 'Mystery Table Pile',
    zone: 'TABLE',
    endZone: 'KITCHEN',
    rulesText:
      '1 Action: Pick Up in a Clear Table room, then 1 Action: Deliver in a Clear Kitchen. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Why is there a toy truck next to the Kiddush cup?”',
    frontImage: 'assets/cards/chore_24_mystery_table_pile.webp',
  },
  {
    id: 'CHORE_26',
    number: 26,
    type: 'ERRAND',
    title: "Dressed Kids Downstairs—Keep 'Em Clean!",
    zone: 'UPSTAIRS',
    endZone: 'DOWNSTAIRS',
    rulesText:
      '1 Action: Pick Up in a Clear Upstairs room, then 1 Action: Deliver in a Clear Downstairs room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Steer freshly dressed kids straight down without touching anything sticky.”',
    frontImage: 'assets/cards/chore_26_dressed_kids_clean.webp',
  },
  {
    id: 'CHORE_34',
    number: 34,
    type: 'ERRAND',
    title: 'Everyone in Shabbat Clothes!',
    zone: 'UPSTAIRS',
    endZone: 'TABLE',
    rulesText:
      '1 Action: Pick Up in a Clear Upstairs room, then 1 Action: Deliver in a Clear Table room. (Mommy can do either in Cluttered rooms, plus 1 Free Errand/turn!)',
    flavor: '“Clean, dressed, and spotless—straight to the Shabbat table!”',
    frontImage: 'assets/cards/chore_34_everyone_shabbat_clothes.webp',
  },
];

export const TOOL_DECK: readonly ToolCardDef[] = [
  ...([35, 36, 37, 38] as const).map(
    (n): ToolCardDef => ({
      id: `TOOL_${n}`,
      kind: 'ICE_COFFEE',
      title: 'Ice Coffee Boost',
      badge: 'Reusable Tool',
      rulesText:
        "1 Action (any room): Turn 1 or 2 Cluttered rooms anywhere back to Clear (doesn't work on Blocked rooms), then put this card in Event Discard.",
      flavor: '“Caffeine hits and two rooms get cleared in record time.”',
      frontImage: 'assets/cards/tool_35_38_ice_coffee_boost_QTY4.webp',
    }),
  ),
  ...([39, 40, 41] as const).map(
    (n): ToolCardDef => ({
      id: `TOOL_${n}`,
      kind: 'SNACK_SUMMONS',
      title: 'Strategic Snack Summons',
      badge: 'Reusable Tool',
      rulesText:
        '1 Action (any room): Move any teammate from anywhere straight into your room (carried Errands travel with them!), then put this card in Event Discard.',
      flavor: '“Crinkle one snack bag and watch everyone materialize.”',
      frontImage: 'assets/cards/tool_39_41_strategic_snack_summons_QTY3.webp',
    }),
  ),
  ...([42, 43, 44] as const).map(
    (n): ToolCardDef => ({
      id: `TOOL_${n}`,
      kind: 'EARLY_PREP',
      title: 'Cousin Aviel Drops By!',
      badge: 'One-Time Shield',
      rulesText:
        '1 Action (any room): Place on the next unshielded face-down Clock card. When it blocks a Clock flip, return this card to the box.',
      flavor: '“Game co-designer to the rescue—buying you extra time before sunset!”',
      frontImage: 'assets/cards/tool_42_44_cousin_aviel_drops_by_QTY3.webp',
    }),
  ),
];

const singleZoneRules = (zoneName: string) =>
  `Scan ${zoneName} rooms left to right, top to bottom (skip Blocked): Flip the 1st Cluttered room to Blocked! If none are Cluttered, turn the 1st Clear room sideways (Cluttered).`;

export const SLOW_DOWN_DECK: readonly SlowDownCardDef[] = [
  // Kitchen (3)
  {
    id: 'SLOW_45',
    number: 45,
    kind: 'SINGLE_ZONE',
    title: "Wait—Where's That Ingredient?!",
    zone: 'KITCHEN',
    rulesText: singleZoneRules('Kitchen'),
    flavor: '“Fridge and cabinet excavation begins.”',
    frontImage: 'assets/cards/slowdown_45_missing_ingredient.webp',
  },
  {
    id: 'SLOW_46',
    number: 46,
    kind: 'SINGLE_ZONE',
    title: 'Sticky Counter Situation',
    zone: 'KITCHEN',
    rulesText: singleZoneRules('Kitchen'),
    flavor: '“Every spoon in the house is somehow dirty.”',
    frontImage: 'assets/cards/slowdown_46_sticky_counter.webp',
  },
  {
    id: 'SLOW_47',
    number: 47,
    kind: 'SINGLE_ZONE',
    title: 'Fridge Tetris Crisis',
    zone: 'KITCHEN',
    rulesText: singleZoneRules('Kitchen'),
    flavor: '“How are we fitting three giant Shabbat pots in here?!”',
    frontImage: 'assets/cards/slowdown_47_fridge_tetris.webp',
  },

  // Downstairs (4)
  {
    id: 'SLOW_48',
    number: 48,
    kind: 'SINGLE_ZONE',
    title: 'Fresh Toy Dump!',
    zone: 'DOWNSTAIRS',
    rulesText: singleZoneRules('Downstairs'),
    flavor: '“One entire bin just got flipped upside down.”',
    frontImage: 'assets/cards/slowdown_48_fresh_toy_dump.webp',
  },
  {
    id: 'SLOW_49',
    number: 49,
    kind: 'SINGLE_ZONE',
    title: 'Mekimi Found Something!',
    zone: 'DOWNSTAIRS',
    rulesText: singleZoneRules('Downstairs'),
    flavor: '“Fastest crawler in Givot Eden strikes again.”',
    frontImage: 'assets/cards/slowdown_49_mekimi_found_something.webp',
  },
  {
    id: 'SLOW_50',
    number: 50,
    kind: 'SINGLE_ZONE',
    title: 'Surprise Sink Stack',
    zone: 'DOWNSTAIRS',
    rulesText: singleZoneRules('Downstairs'),
    flavor: '“Where did four more pots just come from?!”',
    frontImage: 'assets/cards/slowdown_50_surprise_sink_stack.webp',
  },
  {
    id: 'SLOW_51',
    number: 51,
    kind: 'SINGLE_ZONE',
    title: 'Dishwasher Still Running!',
    zone: 'DOWNSTAIRS',
    rulesText: singleZoneRules('Downstairs'),
    flavor: '“45 minutes left and the sink is already full again.”',
    frontImage: 'assets/cards/slowdown_51_dishwasher_running.webp',
  },

  // Table (4)
  {
    id: 'SLOW_52',
    number: 52,
    kind: 'SINGLE_ZONE',
    title: 'The Table Magnet Effect',
    zone: 'TABLE',
    rulesText: singleZoneRules('Table'),
    flavor: '“Mail, keys, backpacks, and random stuff appear.”',
    frontImage: 'assets/cards/slowdown_52_table_magnet.webp',
  },
  {
    id: 'SLOW_53',
    number: 53,
    kind: 'SINGLE_ZONE',
    title: 'Kiddush Cup Takeover!',
    zone: 'TABLE',
    rulesText: singleZoneRules('Table'),
    flavor: '“Nael just emptied the entire kiddush cup shelf.”',
    frontImage: 'assets/cards/slowdown_53_kiddush_cup_takeover.webp',
  },
  {
    id: 'SLOW_54',
    number: 54,
    kind: 'SINGLE_ZONE',
    title: 'Out of Shabbat Candles!',
    zone: 'TABLE',
    rulesText: singleZoneRules('Table'),
    flavor: '“Empty box in the cabinet—emergency backup hunt!”',
    frontImage: 'assets/cards/slowdown_54_out_of_candles.webp',
  },
  {
    id: 'SLOW_55',
    number: 55,
    kind: 'SINGLE_ZONE',
    title: 'Wrong Tablecloth Size!',
    zone: 'TABLE',
    rulesText: singleZoneRules('Table'),
    flavor: '“Grabbed the giant chag tablecloth by mistake.”',
    frontImage: 'assets/cards/slowdown_55_wrong_tablecloth.webp',
  },

  // Upstairs (4)
  {
    id: 'SLOW_56',
    number: 56,
    kind: 'SINGLE_ZONE',
    title: 'Diaper Detour!',
    zone: 'UPSTAIRS',
    rulesText: singleZoneRules('Upstairs'),
    flavor: '“Stop everything—we need wipes and a backup outfit.”',
    frontImage: 'assets/cards/slowdown_56_diaper_detour.webp',
  },
  {
    id: 'SLOW_57',
    number: 57,
    kind: 'SINGLE_ZONE',
    title: 'Bath-Time Escape Artist!',
    zone: 'UPSTAIRS',
    rulesText: singleZoneRules('Upstairs'),
    flavor: '“Fresh out of the tub and sprinting down the hallway.”',
    frontImage: 'assets/cards/slowdown_57_bath_escape_artist.webp',
  },
  {
    id: 'SLOW_58',
    number: 58,
    kind: 'SINGLE_ZONE',
    title: '“Not THAT Shirt!”',
    zone: 'UPSTAIRS',
    rulesText: singleZoneRules('Upstairs'),
    flavor: '“Last-minute Shabbat outfit negotiation.”',
    frontImage: 'assets/cards/slowdown_58_not_that_shirt.webp',
  },
  {
    id: 'SLOW_59',
    number: 59,
    kind: 'SINGLE_ZONE',
    title: 'Surprise Book Pile',
    zone: 'UPSTAIRS',
    rulesText: singleZoneRules('Upstairs'),
    flavor: '“Twenty picture books just materialized on the bedroom floor.”',
    frontImage: 'assets/cards/slowdown_59_surprise_book_pile.webp',
  },

  // Double Trouble (2)
  {
    id: 'SLOW_60',
    number: 60,
    kind: 'DOUBLE_TROUBLE',
    title: 'Challah Flour Trail!',
    zones: ['KITCHEN', 'DOWNSTAIRS'],
    rulesText:
      'Hit Kitchen first, then Downstairs (left to right, top to bottom, skip Blocked): flip the 1st Cluttered room to Blocked, or if none are Cluttered, turn the 1st Clear room Cluttered!',
    flavor: '“Started at the island, left tiny handprints on the couch.”',
    frontImage: 'assets/cards/slowdown_60_bamba_trail.webp',
  },
  {
    id: 'SLOW_61',
    number: 61,
    kind: 'DOUBLE_TROUBLE',
    title: 'Upstairs-Downstairs Whirlwind!',
    zones: ['TABLE', 'UPSTAIRS'],
    rulesText:
      'Hit Table first, then Upstairs (left to right, top to bottom, skip Blocked): flip the 1st Cluttered room to Blocked, or if none are Cluttered, turn the 1st Clear room Cluttered!',
    flavor: '“Two zones hit in one sweep.”',
    frontImage: 'assets/cards/slowdown_61_whirlwind.webp',
  },

  // Time Flies (1)
  {
    id: 'SLOW_62',
    number: 62,
    kind: 'TIME_FLIES',
    title: '“Wait—Shabbat Is at WHAT Time?!”',
    rulesText:
      '1. Flip the next Clock card (unless Cousin Aviel blocks it). 2. Hit Kitchen: flip 1st Cluttered to Blocked, else turn 1st Clear Cluttered. 3. Return this card to the box.',
    flavor: '“Winter Friday strikes again!”',
    frontImage: 'assets/cards/slowdown_62_what_time.webp',
  },
];

export const CLOCK_DECK: readonly ClockCard[] = [
  ...([63, 64, 65, 66, 67, 68, 69, 70, 71] as const).map((n) => ({
    id: `CLOCK_${n}`,
    isShabbatBegins: false,
    flipped: false,
    title: 'Friday Afternoon',
    frontImage: 'assets/cards/clock_63_71_friday_afternoon_QTY9.webp',
  })),
  {
    id: 'CLOCK_72',
    isShabbatBegins: true,
    flipped: false,
    title: 'Shabbat Begins!',
    frontImage: 'assets/cards/clock_72_shabbat_begins_QTY1.webp',
  },
];

export interface GalleryItem {
  id: string;
  category: 'Helpers' | 'Rooms' | 'Chores' | 'Tools' | 'Slow-Downs' | 'Clock' | 'Card Backs';
  title: string;
  subtitle: string;
  qty: number;
  frontImage: string;
  backImage?: string;
}

export const GALLERY_ITEMS: readonly GalleryItem[] = [
  ...(['ABBA', 'NAEL', 'MOMMY', 'MEKIMI'] as const).map((id) => ({
    id: `GAL_${id}`,
    category: 'Helpers' as const,
    title: HELPER_DEFS[id].name,
    subtitle: `2 Actions/Turn · ${HELPER_DEFS[id].powers.map((p) => p.name).join(' & ')}`,
    qty: 1,
    frontImage: HELPER_DEFS[id].cardImage,
    backImage: SHARED_BACKS.helpers,
  })),
  ...ROOM_DECK.map((r) => ({
    id: `GAL_${r.id}`,
    category: 'Rooms' as const,
    title: r.subtitle ? `${r.name} (${r.subtitle})` : r.name,
    subtitle: `${ZONE_META[r.zone].name} · Front & Red Blocked Back`,
    qty: 1,
    frontImage: r.frontImage,
    backImage: r.blockedImage,
  })),
  ...CHORE_DECK.map((c) => ({
    id: `GAL_${c.id}`,
    category: 'Chores' as const,
    title: c.title,
    subtitle:
      c.type === 'ERRAND' && c.endZone
        ? `Errand · ${ZONE_META[c.zone].shortName} → ${ZONE_META[c.endZone].shortName}`
        : `Team Chore (2+ Helpers) · ${ZONE_META[c.zone].shortName}`,
    qty: 1,
    frontImage: c.frontImage,
    backImage: SHARED_BACKS.chores,
  })),
  {
    id: 'GAL_TOOL_ICE_COFFEE',
    category: 'Tools',
    title: 'Ice Coffee Boost',
    subtitle: 'Reusable Tool · Clear 1–2 Cluttered rooms',
    qty: 4,
    frontImage: 'assets/cards/tool_35_38_ice_coffee_boost_QTY4.webp',
    backImage: SHARED_BACKS.eventsAndTools,
  },
  {
    id: 'GAL_TOOL_SNACK',
    category: 'Tools',
    title: 'Strategic Snack Summons',
    subtitle: 'Reusable Tool · Pull any teammate into your room',
    qty: 3,
    frontImage: 'assets/cards/tool_39_41_strategic_snack_summons_QTY3.webp',
    backImage: SHARED_BACKS.eventsAndTools,
  },
  {
    id: 'GAL_TOOL_EARLY_PREP',
    category: 'Tools',
    title: 'Cousin Aviel Drops By!',
    subtitle: 'One-Time Shield · Block next Clock flip',
    qty: 3,
    frontImage: 'assets/cards/tool_42_44_cousin_aviel_drops_by_QTY3.webp',
    backImage: SHARED_BACKS.eventsAndTools,
  },
  ...SLOW_DOWN_DECK.map((s) => ({
    id: `GAL_${s.id}`,
    category: 'Slow-Downs' as const,
    title: s.title,
    subtitle:
      s.kind === 'SINGLE_ZONE' && s.zone
        ? `${ZONE_META[s.zone].shortName} · Cluttered → Blocked, else Clear → Cluttered`
        : s.kind === 'DOUBLE_TROUBLE' && s.zones
          ? `Double Trouble · ${ZONE_META[s.zones[0]].shortName} + ${ZONE_META[s.zones[1]].shortName}`
          : 'Time Flies · +1 Clock Flip + Kitchen (then box)',
    qty: 1,
    frontImage: s.frontImage,
    backImage: SHARED_BACKS.eventsAndTools,
  })),
  {
    id: 'GAL_CLOCK_AFTERNOON',
    category: 'Clock',
    title: 'Friday Afternoon',
    subtitle: "Flip after Mekimi's turn, then start next round with Abba",
    qty: 9,
    frontImage: 'assets/cards/clock_63_71_friday_afternoon_QTY9.webp',
    backImage: SHARED_BACKS.clock,
  },
  {
    id: 'GAL_CLOCK_SHABBAT',
    category: 'Clock',
    title: 'Shabbat Begins!',
    subtitle: 'Placed rightmost · Finish all Chores before this flips!',
    qty: 1,
    frontImage: 'assets/cards/clock_72_shabbat_begins_QTY1.webp',
    backImage: SHARED_BACKS.clock,
  },
  {
    id: 'GAL_BACK_CHORES',
    category: 'Card Backs',
    title: 'Chores Deck Back',
    subtitle: 'Shared back for all 18 Chore cards',
    qty: 18,
    frontImage: SHARED_BACKS.chores,
  },
  {
    id: 'GAL_BACK_EVENTS',
    category: 'Card Backs',
    title: 'Friday Events & Tools Back',
    subtitle: 'Shared back for all 18 Slow-Downs + 10 Tools',
    qty: 28,
    frontImage: SHARED_BACKS.eventsAndTools,
  },
  {
    id: 'GAL_BACK_HELPERS',
    category: 'Card Backs',
    title: 'Helper Cards Back',
    subtitle: 'Shared back for all 4 Family Helper cards',
    qty: 4,
    frontImage: SHARED_BACKS.helpers,
  },
  {
    id: 'GAL_BACK_CLOCK',
    category: 'Card Backs',
    title: 'Shabbat Clock Back',
    subtitle: 'Identical back for all 10 Clock cards',
    qty: 10,
    frontImage: SHARED_BACKS.clock,
  },
];
