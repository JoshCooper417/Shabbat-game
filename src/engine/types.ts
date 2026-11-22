export type ZoneId = 'KITCHEN' | 'DOWNSTAIRS' | 'TABLE' | 'UPSTAIRS';

export type HelperId = 'ABBA' | 'NAEL' | 'MOMMY' | 'MEKIMI';

export type DifficultyId = 'BEGINNER' | 'STANDARD' | 'HARD';

export type TurnMode = 'FOUR_SEAT' | 'TWO_GROUP';

export type RoomState = 'CLEAR' | 'CLUTTERED' | 'BLOCKED';

export type ChoreType = 'ROOM_CHORE' | 'ERRAND' | 'TEAM_PAIR' | 'RESTORE_ORDER';

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
  carryLimit: number;
  group: 'A' | 'B';
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
  ordinal?: 1 | 2 | 3; // SINGLE_ZONE
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
  tuckedChore: ChoreCardDef | null;
}

export interface HelperState {
  id: HelperId;
  slotIndex: number;
  resting: boolean;
  carriedErrands: ChoreCardDef[];
}

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  tagline: string;
  clockLength: number; // Total clock cards including Shabbat Begins!
  afternoonCards: number;
  totalChores: number;
  startingChoreRow: number;
  arrivalChores: number;
  slowDownCount: number;
  startingClutter: number;
}

export interface LegalMove {
  targetSlot: number;
  kind: 'STAY' | 'HALLWAY_SLIDE' | 'BUDDY_HOP' | 'TURBO_CRAWL';
  label: string;
  reason: string;
}

export type ActionType =
  | 'TIDY_CLUTTERED'
  | 'TIDY_BLOCKED'
  | 'START_ROOM_CHORE'
  | 'FINISH_TUCKED_CHORE'
  | 'RESTORE_ORDER'
  | 'PICK_UP_ERRAND'
  | 'DELIVER_ERRAND'
  | 'PASS_ERRAND'
  | 'TEAM_PAIR'
  | 'COMBO_ROOM_CHORE_ROW'
  | 'USE_ICE_COFFEE'
  | 'USE_SNACK_SUMMONS'
  | 'USE_EARLY_PREP'
  | 'RECHARGE_TOOL';

export interface ActionCandidate {
  id: string;
  type: ActionType;
  label: string;
  detail: string;
  category: 'TIDY' | 'CHORE' | 'ERRAND' | 'COMBO' | 'TOOL';
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
      kind: 'TIDY_NEIGHBOR_BONUS';
      eligibleSlots: number[];
    }
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
    }
  | {
      kind: 'RECHARGE_PICK';
      source: 'RECHARGE_ACTION' | 'ERRAND_BONUS' | 'TEAM_PAIR_BONUS';
      maxCount: number;
      selectedToolIds: string[];
      canCancel: boolean; // True only for RECHARGE_ACTION before completing
    }
  | {
      kind: 'BACKUP_TOOL_PICK';
      remainingPicks: number;
      triggeredByRoomNames: string[];
    };

export interface EventEffectNote {
  slotIndex?: number;
  roomName?: string;
  kind: 'CLUTTERED' | 'BLOCKED' | 'BARRIER' | 'ALL_BLOCKED' | 'CLOCK_FLIP' | 'CLOCK_SHIELDED' | 'TOOL_READY' | 'TOOL_OVERFLOW' | 'DECK_EMPTY';
  text: string;
}

export interface EventResolutionSummary {
  drawnCard: EventCard | null;
  reshuffledSlowDowns: boolean;
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
  | 'CHOOSE_HELPER' // Used in 1-2P Group Mode when both Helpers in current group are Ready
  | 'MOVE'
  | 'ACT'
  | 'SUBSTEP'
  | 'EVENT_READY'
  | 'EVENT_RESOLVED'
  | 'WON'
  | 'LOST';

export interface GameState {
  seed: number;
  difficulty: DifficultyId;
  turnMode: TurnMode;
  round: number;
  turnInRound: number; // 1..4
  totalTurns: number;
  activeGroup: 'A' | 'B'; // Used in TWO_GROUP mode
  activeHelperId: HelperId;
  phase: GamePhase;
  movedThisTurn: boolean;
  rooms: RoomSlot[]; // length 9
  boxedRooms: RoomCardDef[]; // length 3
  helpers: Record<HelperId, HelperState>;
  choreRow: ChoreCardDef[];
  arrivalPile: ChoreCardDef[];
  doneChores: ChoreCardDef[];
  boxedChores: ChoreCardDef[];
  clockRow: ClockCard[];
  boxedClockCards: ClockCard[];
  clockShield: ToolCardDef | null; // Early Prep Paid Off! on next face-down Clock card
  boxedTools: ToolCardDef[]; // Unused at setup + boxed Early Prep shields
  readyTools: ToolCardDef[]; // max 3
  backupTools: ToolCardDef[]; // starts with 2, never refills
  toolDiscard: ToolCardDef[]; // never reshuffled into Event Deck
  eventDeck: EventCard[];
  slowDownDiscard: SlowDownCardDef[];
  boxedSlowDowns: SlowDownCardDef[]; // Unused at setup + boxed Time Flies
  pendingSubstep: PendingSubstep | null;
  lastEvent: EventResolutionSummary | null;
  lastActionNote: string | null;
  lossReason: string | null;
  log: LogEntry[];
  nextLogId: number;
}
