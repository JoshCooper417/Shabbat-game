export type ZoneId = 'KITCHEN' | 'DOWNSTAIRS' | 'TABLE' | 'UPSTAIRS';

export type HelperId = 'ABBA' | 'NAEL' | 'MOMMY' | 'MEKIMI';

export type DifficultyId = 'BEGINNER' | 'STANDARD' | 'HARD';

export type RoomState = 'CLEAR' | 'CLUTTERED' | 'BLOCKED';

export type ChoreType = 'TEAM_CHORE' | 'ERRAND';

export type ToolKind = 'ICE_COFFEE' | 'SNACK_SUMMONS' | 'EARLY_PREP';

export type SlowDownKind = 'SINGLE_ZONE' | 'DOUBLE_TROUBLE' | 'TIME_FLIES';

export interface ZoneMeta {
  id: ZoneId;
  name: string;
  shortName: string;
  color: string;
  softBg: string;
  border: string;
}

export interface HelperDef {
  id: HelperId;
  name: string;
  startSlot: number;
  accent: string;
  softBg: string;
  cardImage: string;
  avatarImage: string;
  figurineImage: string;
  flavor: string;
  powers: {
    name: string;
    timing: 'Your Turn' | 'Always On';
    text: string;
  }[];
}

export interface RoomCardDef {
  id: string;
  number: number;
  name: string;
  subtitle?: string;
  zone: ZoneId;
  frontImage: string;
  blockedImage: string;
  artImage: string;
}

export interface ChoreCardDef {
  id: string;
  number: number;
  type: ChoreType;
  title: string;
  zone: ZoneId;
  endZone?: ZoneId; // Only for ERRAND
  rulesText: string;
  flavor: string;
  frontImage: string;
}

export interface ToolCardDef {
  id: string;
  kind: ToolKind;
  title: string;
  badge: 'Reusable Tool' | 'One-Time Shield';
  rulesText: string;
  flavor: string;
  frontImage: string;
}

export interface SlowDownCardDef {
  id: string;
  number: number;
  kind: SlowDownKind;
  title: string;
  zone?: ZoneId; // SINGLE_ZONE
  zones?: [ZoneId, ZoneId]; // DOUBLE_TROUBLE
  rulesText: string;
  flavor: string;
  frontImage: string;
}

export type EventCard =
  | { category: 'TOOL'; card: ToolCardDef }
  | { category: 'SLOW_DOWN'; card: SlowDownCardDef };

export interface ClockCard {
  id: string;
  isShabbatBegins: boolean;
  flipped: boolean;
  title: string;
  frontImage: string;
}

export interface RoomSlot {
  slotIndex: number; // 0..8 in reading order
  card: RoomCardDef;
  state: RoomState;
}

export interface HelperState {
  id: HelperId;
  slotIndex: number;
  carriedErrands: ChoreCardDef[];
}

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  tagline: string;
  clockLength: number; // Total clock cards including Shabbat Begins!
  afternoonCards: number;
  totalChores: number;
  choreRowTarget: number; // Always 4
  choreDeckStart: number;
  slowDownCount: number; // 17 on Beginner (box Time Flies), 18 on Standard/Hard
  boxTimeFlies: boolean;
  startingClutterSlots: readonly number[]; // [4] Center on Beginner; [1, 7] Top-Center & Bottom-Center on Standard/Hard
}

export interface LegalMove {
  targetSlot: number;
  kind: 'WALK' | 'TURBO_CRAWL';
  label: string;
  reason: string;
}

export type ActionType =
  | 'TIDY_CLUTTERED'
  | 'TIDY_BLOCKED'
  | 'TEAM_CHORE'
  | 'PICK_UP_ERRAND'
  | 'DELIVER_ERRAND'
  | 'GIVE_ERRAND'
  | 'TAKE_ERRAND'
  | 'USE_ICE_COFFEE'
  | 'USE_SNACK_SUMMONS'
  | 'USE_EARLY_PREP';

export interface ActionCandidate {
  id: string;
  type: ActionType;
  label: string;
  detail: string;
  category: 'TIDY' | 'CHORE' | 'ERRAND' | 'HANDOFF' | 'TOOL';
  isFree?: boolean;
  choreId?: string;
  toolId?: string;
  targetHelperId?: HelperId;
  cardImage?: string;
  bonusTag?: string;
}

export interface DisabledActionHint {
  label: string;
  reason: string;
}

export type PendingSubstep =
  | {
      kind: 'ICE_COFFEE_PICK';
      toolId: string;
      selectedSlots: number[];
      eligibleSlots: number[];
    }
  | {
      kind: 'SNACK_SUMMONS_PICK';
      toolId: string;
      eligibleHelpers: HelperId[];
    };

export interface EventEffectNote {
  slotIndex?: number;
  roomName?: string;
  kind:
    | 'CLUTTERED'
    | 'BLOCKED'
    | 'BARRIER'
    | 'ALL_BLOCKED'
    | 'CLOCK_FLIP'
    | 'CLOCK_SHIELDED'
    | 'TOOL_READY'
    | 'DECK_EMPTY';
  text: string;
}

export interface EventResolutionSummary {
  drawnCard: EventCard | null;
  reshuffledDiscard: boolean;
  notes: EventEffectNote[];
  highlightedSlots: number[];
}

export interface LogEntry {
  id: number;
  round: number;
  turn: number;
  helperId?: HelperId;
  kind: 'SETUP' | 'MOVE' | 'ACTION' | 'EVENT' | 'ROUND' | 'END';
  message: string;
}

export type GamePhase =
  | 'TURN'
  | 'SUBSTEP'
  | 'EVENT_READY'
  | 'EVENT_RESOLVED'
  | 'WON'
  | 'LOST';

export interface GameState {
  seed: number;
  difficulty: DifficultyId;
  round: number;
  turnInRound: number; // 1..4 (Abba -> Nael -> Mommy -> Mekimi)
  totalTurns: number;
  activeHelperId: HelperId;
  actionsRemaining: number; // Starts at 2 each turn
  mommyFreeErrandUsed: boolean; // Mommy gets 1 FREE Pick Up or Deliver per turn
  phase: GamePhase;
  rooms: RoomSlot[]; // length 9
  boxedRooms: RoomCardDef[]; // length 3
  helpers: Record<HelperId, HelperState>;
  choreRow: ChoreCardDef[]; // Auto-refills to 4 face-up
  choreDeck: ChoreCardDef[];
  doneChores: ChoreCardDef[];
  boxedChores: ChoreCardDef[];
  clockRow: ClockCard[];
  boxedClockCards: ClockCard[];
  clockShields: ToolCardDef[]; // Cousin Aviel shields on consecutive leftmost unflipped Clock cards
  boxedTools: ToolCardDef[]; // 4 unused at setup + spent Cousin Aviel shields
  readyTools: ToolCardDef[]; // Family Toolbox (no cap!)
  eventDeck: EventCard[];
  eventDiscard: EventCard[]; // Single shared Event Discard (Slow-Downs + spent Reusable Tools)
  boxedSlowDowns: SlowDownCardDef[]; // Time Flies on Beginner + boxed Time Flies after resolving
  pendingSubstep: PendingSubstep | null;
  lastEvent: EventResolutionSummary | null;
  lastActionNote: string | null;
  lossReason: string | null;
  log: LogEntry[];
  nextLogId: number;
}
