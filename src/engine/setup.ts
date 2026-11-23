import {
  CHORE_DECK,
  CLOCK_DECK,
  DIFFICULTY_CONFIGS,
  HELPER_DEFS,
  ROOM_DECK,
  SLOW_DOWN_DECK,
  TOOL_DECK,
} from '../data/cards';
import { mulberry32, shuffleWithRng } from './helpers';
import {
  DifficultyId,
  EventCard,
  GameState,
  HelperId,
  HelperState,
  RoomCardDef,
  RoomSlot,
  ZoneId,
} from './types';

const ALL_ZONES: readonly ZoneId[] = ['KITCHEN', 'DOWNSTAIRS', 'TABLE', 'UPSTAIRS'];

export interface SetupOptions {
  difficulty?: DifficultyId;
  seed?: number;
}

/**
 * Exact v3 Simplified (D2*) Setup — 100% synced to RULES.md & Small Booklet Pages 5 & 13:
 * - 9 Rooms in 3x3 House (guarantee all 4 zone icons; swap bottom-right if missing; box 3)
 * - Fixed Starting Clutter: Center (Beginner) or Top-Center & Bottom-Center (Standard/Hard)
 * - 4 Helpers in Clear corners (Abba TL, Nael TR, Mekimi BL, Mommy BR)
 * - Single-shuffle Chore deal: 10 (Beg) / 13 (Std) / 15 (Hard) -> 4 face-up Chore Row + rest Chore Deck
 * - Shabbat Clock: 6+1 (Beg) / 5+1 (Std) / 5+1 (Hard)
 * - Tools: 2 face-up Family Toolbox (no cap) + 4 shuffled into Event Deck + 4 boxed
 * - Slow-Downs: all 18 (Beginner boxes Time Flies -> 17)
 */
export function createInitialGameState(options: SetupOptions = {}): GameState {
  const difficulty: DifficultyId = options.difficulty ?? 'BEGINNER';
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000) + 1;
  const rng = mulberry32(seed);
  const cfg = DIFFICULTY_CONFIGS[difficulty];

  // 1. Build 3x3 House
  const shuffledRooms = shuffleWithRng(ROOM_DECK, rng);
  const gridCards: RoomCardDef[] = shuffledRooms.slice(0, 9);
  const boxedRooms: RoomCardDef[] = shuffledRooms.slice(9);

  const presentZones = new Set(gridCards.map((c) => c.zone));
  const missingZone = ALL_ZONES.find((z) => !presentZones.has(z));
  if (missingZone) {
    const swapIdx = boxedRooms.findIndex((c) => c.zone === missingZone);
    if (swapIdx >= 0) {
      const displaced = gridCards[8];
      gridCards[8] = boxedRooms[swapIdx];
      boxedRooms[swapIdx] = displaced;
    }
  }

  // 2. Fixed Starting Clutter (corners always Clear!)
  const clutterSet = new Set(cfg.startingClutterSlots);
  const rooms: RoomSlot[] = gridCards.map((card, slotIndex) => ({
    slotIndex,
    card,
    state: clutterSet.has(slotIndex) ? 'CLUTTERED' : 'CLEAR',
  }));

  // 3. Place 4 Helpers in corners
  const helpers: Record<HelperId, HelperState> = {
    ABBA: { id: 'ABBA', slotIndex: HELPER_DEFS.ABBA.startSlot, carriedErrands: [] },
    NAEL: { id: 'NAEL', slotIndex: HELPER_DEFS.NAEL.startSlot, carriedErrands: [] },
    MOMMY: { id: 'MOMMY', slotIndex: HELPER_DEFS.MOMMY.startSlot, carriedErrands: [] },
    MEKIMI: { id: 'MEKIMI', slotIndex: HELPER_DEFS.MEKIMI.startSlot, carriedErrands: [] },
  };

  // 4. Single-shuffle Chore deal -> 4 face-up Chore Row + Chore Deck
  const shuffledChores = shuffleWithRng(CHORE_DECK, rng);
  const activeChores = shuffledChores.slice(0, cfg.totalChores);
  const boxedChores = shuffledChores.slice(cfg.totalChores);
  const choreRow = activeChores.slice(0, cfg.choreRowTarget);
  const choreDeck = activeChores.slice(cfg.choreRowTarget);

  // 5. Build Shabbat Clock (N Friday Afternoon + Shabbat Begins! on far right)
  const afternoonPool = CLOCK_DECK.filter((c) => !c.isShabbatBegins).map((c) => ({ ...c }));
  const shabbatBegins = CLOCK_DECK.find((c) => c.isShabbatBegins)!;
  const clockRow = [...afternoonPool.slice(0, cfg.afternoonCards), { ...shabbatBegins }];
  const boxedClockCards = afternoonPool.slice(cfg.afternoonCards);

  // 6. Tools (2 Family Toolbox + 4 Event Deck + 4 boxed) & Slow-Downs (17 Beg / 18 Std & Hard)
  const shuffledTools = shuffleWithRng(TOOL_DECK, rng);
  const readyTools = shuffledTools.slice(0, 2);
  const eventTools = shuffledTools.slice(2, 6);
  const boxedTools = shuffledTools.slice(6);

  const activeSlowDowns = cfg.boxTimeFlies
    ? SLOW_DOWN_DECK.filter((s) => s.kind !== 'TIME_FLIES')
    : [...SLOW_DOWN_DECK];
  const boxedSlowDowns = cfg.boxTimeFlies
    ? SLOW_DOWN_DECK.filter((s) => s.kind === 'TIME_FLIES')
    : [];

  const eventDeck: EventCard[] = shuffleWithRng(
    [
      ...eventTools.map((card): EventCard => ({ category: 'TOOL', card })),
      ...activeSlowDowns.map((card): EventCard => ({ category: 'SLOW_DOWN', card })),
    ],
    rng,
  );

  const clutteredNames = rooms
    .filter((r) => r.state === 'CLUTTERED')
    .map((r) => r.card.name)
    .join(' & ');

  return {
    seed,
    difficulty,
    round: 1,
    turnInRound: 1,
    totalTurns: 1,
    activeHelperId: 'ABBA',
    actionsRemaining: 2,
    mommyFreeErrandUsed: false,
    phase: 'TURN',
    rooms,
    boxedRooms,
    helpers,
    choreRow,
    choreDeck,
    doneChores: [],
    boxedChores,
    clockRow,
    boxedClockCards,
    clockShields: [],
    boxedTools,
    readyTools,
    eventDeck,
    eventDiscard: [],
    boxedSlowDowns,
    pendingSubstep: null,
    lastEvent: null,
    lastActionNote: null,
    lossReason: null,
    log: [
      {
        id: 1,
        round: 1,
        turn: 1,
        kind: 'SETUP',
        message: `${cfg.name} game started (${cfg.totalChores} Missions, ${cfg.clockLength} Clock cards). Starting clutter: ${clutteredNames}.`,
      },
    ],
    nextLogId: 2,
  };
}
