import { HELPER_DEFS, SEAT_ORDER } from '../data/cards';
import { GameState, HelperId, LogEntry, RoomSlot } from './types';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function slotToRowCol(slot: number): { row: number; col: number } {
  return { row: Math.floor(slot / 3), col: slot % 3 };
}

export function rowColToSlot(row: number, col: number): number {
  return row * 3 + col;
}

export function getOrthogonalNeighbors(slot: number): number[] {
  const { row, col } = slotToRowCol(slot);
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const res: number[] = [];
  for (const [dr, dc] of dirs) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 3 && c >= 0 && c < 3) {
      res.push(rowColToSlot(r, c));
    }
  }
  return res;
}

export function getHelpersInSlot(state: GameState, slot: number): HelperId[] {
  return SEAT_ORDER.filter((id) => state.helpers[id].slotIndex === slot);
}

export function getTeammatesInSlot(
  state: GameState,
  slot: number,
  excludeHelperId: HelperId,
): HelperId[] {
  return SEAT_ORDER.filter(
    (id) => id !== excludeHelperId && state.helpers[id].slotIndex === slot,
  );
}

/**
 * Nael's "Learning Tower Power!" (Always On):
 * While Nael and at least 1 teammate share a Cluttered room, either one may finish a Team Chore there.
 */
export function hasNaelClutteredBoost(state: GameState, slot: number): boolean {
  const room = state.rooms[slot];
  if (room.state !== 'CLUTTERED') return false;
  const occupants = getHelpersInSlot(state, slot);
  return occupants.includes('NAEL') && occupants.length >= 2;
}

/**
 * Abba's "Balagan Barrier" (Always On):
 * While Abba stands in a Cluttered room, Slow-Downs can't flip it Blocked.
 */
export function isProtectedByAbba(state: GameState, slot: number): boolean {
  return state.rooms[slot].state === 'CLUTTERED' && state.helpers.ABBA.slotIndex === slot;
}

export function appendLog(
  state: GameState,
  kind: LogEntry['kind'],
  message: string,
  helperId?: HelperId,
): GameState {
  const entry: LogEntry = {
    id: state.nextLogId,
    round: state.round,
    turn: state.totalTurns,
    helperId,
    kind,
    message,
  };
  return {
    ...state,
    log: [...state.log, entry],
    nextLogId: state.nextLogId + 1,
  };
}

export function getHelperName(id: HelperId): string {
  return HELPER_DEFS[id].name;
}

export function getRoomFullName(room: RoomSlot): string {
  return room.card.subtitle ? `${room.card.name} (${room.card.subtitle})` : room.card.name;
}

/**
 * Conservation invariant: all 72 physical cards must always be accounted for exactly once.
 */
export function countAllPhysicalCards(state: GameState): {
  rooms: number;
  helpers: number;
  chores: number;
  clock: number;
  tools: number;
  slowDowns: number;
  total: number;
} {
  const rooms = state.rooms.length + state.boxedRooms.length;
  const helpers = Object.keys(state.helpers).length;
  const carriedChores = SEAT_ORDER.reduce(
    (sum, id) => sum + state.helpers[id].carriedErrands.length,
    0,
  );
  const chores =
    state.choreRow.length +
    state.choreDeck.length +
    state.doneChores.length +
    state.boxedChores.length +
    carriedChores;
  const clock = state.clockRow.length + state.boxedClockCards.length;
  const eventTools = state.eventDeck.filter((e) => e.category === 'TOOL').length;
  const discardTools = state.eventDiscard.filter((e) => e.category === 'TOOL').length;
  const tools =
    state.readyTools.length +
    state.boxedTools.length +
    state.clockShields.length +
    eventTools +
    discardTools;
  const eventSlowDowns = state.eventDeck.filter((e) => e.category === 'SLOW_DOWN').length;
  const discardSlowDowns = state.eventDiscard.filter((e) => e.category === 'SLOW_DOWN').length;
  const slowDowns = eventSlowDowns + discardSlowDowns + state.boxedSlowDowns.length;
  const total = rooms + helpers + chores + clock + tools + slowDowns;
  return { rooms, helpers, chores, clock, tools, slowDowns, total };
}
