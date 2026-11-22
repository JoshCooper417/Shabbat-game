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
  ChoreCardDef,
  DifficultyId,
  EventCard,
  GameState,
  HelperId,
  HelperState,
  RoomCardDef,
  RoomSlot,
  TurnMode,
  ZoneId,
} from './types';

const ALL_ZONES: readonly ZoneId[] = ['KITCHEN', 'DOWNSTAIRS', 'TABLE', 'UPSTAIRS'];

export interface SetupOptions {
  difficulty?: DifficultyId;
  turnMode?: TurnMode;
  seed?: number;
}

/**
 * Exact Setup Steps A–G from Preparing for Shabbat: Cooper Family Edition Small Booklet (Pages 4–5 & 14).
 */
export function createInitialGameState(options: SetupOptions = {}): GameState {
  const difficulty: DifficultyId = options.difficulty ?? 'BEGINNER';
  const turnMode: TurnMode = options.turnMode ?? 'FOUR_SEAT';
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000) + 1;
  const rng = mulberry32(seed);
  const cfg = DIFFICULTY_CONFIGS[difficulty];

  // Step A: Build the 3x3 House (9 rooms, guarantee all 4 zone icons; swap bottom-right if missing)
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

  // Step C: Starting Clutter (Beginner: 1, Standard/Hard: 2 random rooms)
  const clutterSlotIndices = new Set(
    shuffleWithRng([0, 1, 2, 3, 4, 5, 6, 7, 8], rng).slice(0, cfg.startingClutter),
  );

  const rooms: RoomSlot[] = gridCards.map((card, slotIndex) => ({
    slotIndex,
    card,
    state: clutterSlotIndices.has(slotIndex) ? 'CLUTTERED' : 'CLEAR',
    tuckedChore: null,
  }));

  // Step B: Place the 4 Helpers in corners
  const helpers: Record<HelperId, HelperState> = {
    ABBA: { id: 'ABBA', slotIndex: HELPER_DEFS.ABBA.startSlot, resting: false, carriedErrands: [] },
    NAEL: { id: 'NAEL', slotIndex: HELPER_DEFS.NAEL.startSlot, resting: false, carriedErrands: [] },
    MOMMY: { id: 'MOMMY', slotIndex: HELPER_DEFS.MOMMY.startSlot, resting: false, carriedErrands: [] },
    MEKIMI: { id: 'MEKIMI', slotIndex: HELPER_DEFS.MEKIMI.startSlot, resting: false, carriedErrands: [] },
  };

  // Step E: Deal Chores (1 guaranteed of each of the 4 types + remainder from the other 14)
  const byType: Record<ChoreCardDef['type'], ChoreCardDef[]> = {
    ROOM_CHORE: shuffleWithRng(CHORE_DECK.filter((c) => c.type === 'ROOM_CHORE'), rng),
    ERRAND: shuffleWithRng(CHORE_DECK.filter((c) => c.type === 'ERRAND'), rng),
    TEAM_PAIR: shuffleWithRng(CHORE_DECK.filter((c) => c.type === 'TEAM_PAIR'), rng),
    RESTORE_ORDER: shuffleWithRng(CHORE_DECK.filter((c) => c.type === 'RESTORE_ORDER'), rng),
  };

  const guaranteed: ChoreCardDef[] = [
    byType.ROOM_CHORE[0],
    byType.ERRAND[0],
    byType.TEAM_PAIR[0],
    byType.RESTORE_ORDER[0],
  ];
  const remainingPool = shuffleWithRng(
    [
      ...byType.ROOM_CHORE.slice(1),
      ...byType.ERRAND.slice(1),
      ...byType.TEAM_PAIR.slice(1),
      ...byType.RESTORE_ORDER.slice(1),
    ],
    rng,
  );
  const extraCount = cfg.totalChores - guaranteed.length;
  const activeChores = shuffleWithRng(
    [...guaranteed, ...remainingPool.slice(0, extraCount)],
    rng,
  );
  const boxedChores = remainingPool.slice(extraCount);

  const choreRow = activeChores.slice(0, cfg.startingChoreRow);
  const arrivalPile = activeChores.slice(cfg.startingChoreRow);

  // Step F: Build Shabbat Clock (N Friday Afternoon + Shabbat Begins! at far right)
  const afternoonPool = CLOCK_DECK.filter((c) => !c.isShabbatBegins).map((c) => ({ ...c }));
  const shabbatBegins = CLOCK_DECK.find((c) => c.isShabbatBegins)!;
  const clockRow = [
    ...afternoonPool.slice(0, cfg.afternoonCards),
    { ...shabbatBegins },
  ];
  const boxedClockCards = afternoonPool.slice(cfg.afternoonCards);

  // Step G: Tools (2 Ready + 2 Backup + 2 Event Deck + 4 boxed) & Slow-Downs (N active + rest boxed)
  const shuffledTools = shuffleWithRng(TOOL_DECK, rng);
  const readyTools = shuffledTools.slice(0, 2);
  const backupTools = shuffledTools.slice(2, 4);
  const eventTools = shuffledTools.slice(4, 6);
  const boxedTools = shuffledTools.slice(6);

  const shuffledSlowDowns = shuffleWithRng(SLOW_DOWN_DECK, rng);
  const activeSlowDowns = shuffledSlowDowns.slice(0, cfg.slowDownCount);
  const boxedSlowDowns = shuffledSlowDowns.slice(cfg.slowDownCount);

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
    .join(', ');

  return {
    seed,
    difficulty,
    turnMode,
    round: 1,
    turnInRound: 1,
    totalTurns: 1,
    activeGroup: 'A',
    activeHelperId: 'ABBA',
    phase: turnMode === 'TWO_GROUP' ? 'CHOOSE_HELPER' : 'MOVE',
    movedThisTurn: false,
    rooms,
    boxedRooms,
    helpers,
    choreRow,
    arrivalPile,
    doneChores: [],
    boxedChores,
    clockRow,
    boxedClockCards,
    clockShield: null,
    boxedTools,
    readyTools,
    backupTools,
    toolDiscard: [],
    eventDeck,
    slowDownDiscard: [],
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
        message: `${cfg.name} game started (${cfg.totalChores} Chores, ${cfg.clockLength} Clock cards). Starting clutter: ${clutteredNames}.`,
      },
    ],
    nextLogId: 2,
  };
}
