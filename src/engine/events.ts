import { GROUP_HELPERS, SEAT_ORDER, ZONE_META } from '../data/cards';
import {
  appendLog,
  getHelperName,
  isProtectedByAbba,
  mulberry32,
  shuffleWithRng,
} from './helpers';
import {
  EventCard,
  EventEffectNote,
  GameState,
  RoomSlot,
  ZoneId,
} from './types';

function pickSingleZoneTarget(rooms: RoomSlot[], zone: ZoneId, ordinal: 1 | 2 | 3): number | null {
  // Skip Blocked rooms; scan remaining Clear/Cluttered rooms of that zone in reading order (0..8)
  // Abba's room still counts unless already Blocked.
  const nonBlocked = rooms.filter((r) => r.card.zone === zone && r.state !== 'BLOCKED');
  if (nonBlocked.length === 0) return null;
  if (nonBlocked.length >= ordinal) {
    return nonBlocked[ordinal - 1].slotIndex;
  }
  // Fallback when fewer than N non-Blocked rooms of that zone exist: 1st Clear, else 1st Cluttered
  const firstClear = nonBlocked.find((r) => r.state === 'CLEAR');
  return (firstClear ?? nonBlocked[0]).slotIndex;
}

function pickFirstClearElseCluttered(rooms: RoomSlot[], zone: ZoneId): number | null {
  const nonBlocked = rooms.filter((r) => r.card.zone === zone && r.state !== 'BLOCKED');
  if (nonBlocked.length === 0) return null;
  const firstClear = nonBlocked.find((r) => r.state === 'CLEAR');
  return (firstClear ?? nonBlocked[0]).slotIndex;
}

function applyRoomHit(
  state: GameState,
  slotIndex: number | null,
  zone: ZoneId,
): {
  state: GameState;
  note: EventEffectNote;
  flippedBlocked: boolean;
  blockedRoomName?: string;
} {
  if (slotIndex === null) {
    return {
      state,
      note: {
        kind: 'ALL_BLOCKED',
        text: `All ${ZONE_META[zone].shortName} rooms are already Blocked — effect lost harmlessly!`,
      },
      flippedBlocked: false,
    };
  }

  const room = state.rooms[slotIndex];
  if (room.state === 'CLEAR') {
    const nextRooms = state.rooms.map((r) =>
      r.slotIndex === slotIndex ? { ...r, state: 'CLUTTERED' as const } : r,
    );
    return {
      state: { ...state, rooms: nextRooms },
      note: {
        slotIndex,
        roomName: room.card.name,
        kind: 'CLUTTERED',
        text: `${room.card.name} turned sideways (Cluttered)!${room.tuckedChore ? ' Tucked Chore stays safe.' : ''}`,
      },
      flippedBlocked: false,
    };
  }

  // Room is CLUTTERED -> check Abba's Balagan Barrier (Always On, Ready or Resting)
  if (isProtectedByAbba(state, slotIndex)) {
    return {
      state,
      note: {
        slotIndex,
        roomName: room.card.name,
        kind: 'BARRIER',
        text: `Abba’s Balagan Barrier protected ${room.card.name}! Flip to Blocked canceled (no Backup Tool unlocked).`,
      },
      flippedBlocked: false,
    };
  }

  // Flip to Red BLOCKED! Return any tucked Chore to Chore Row
  let nextChoreRow = state.choreRow;
  let returnedChoreTitle: string | null = null;
  if (room.tuckedChore) {
    returnedChoreTitle = room.tuckedChore.title;
    nextChoreRow = [...nextChoreRow, room.tuckedChore];
  }
  const nextRooms = state.rooms.map((r) =>
    r.slotIndex === slotIndex
      ? { ...r, state: 'BLOCKED' as const, tuckedChore: null }
      : r,
  );
  const nextState: GameState = {
    ...state,
    rooms: nextRooms,
    choreRow: nextChoreRow,
  };
  return {
    state: nextState,
    note: {
      slotIndex,
      roomName: room.card.name,
      kind: 'BLOCKED',
      text: `${room.card.name} flipped RED BLOCKED!${returnedChoreTitle ? ` “${returnedChoreTitle}” returned to Chore Row.` : ''}`,
    },
    flippedBlocked: true,
    blockedRoomName: room.card.name,
  };
}

/**
 * Step 3.1: Flip 1 Event Card & resolve its effect (Small Booklet Pages 10–12).
 */
export function resolveEventFlip(state: GameState): GameState {
  if (state.phase !== 'EVENT_READY') return state;

  let next = { ...state };
  let reshuffledSlowDowns = false;

  // Empty Event Deck? Shuffle ONLY Slow-Down Discard (never Tool Discard, never boxed Time Flies)
  if (next.eventDeck.length === 0) {
    if (next.slowDownDiscard.length > 0) {
      const rng = mulberry32(next.seed + next.totalTurns * 7919 + next.round * 131);
      const reshuffled = shuffleWithRng(next.slowDownDiscard, rng).map(
        (card): EventCard => ({ category: 'SLOW_DOWN', card }),
      );
      next = {
        ...next,
        eventDeck: reshuffled,
        slowDownDiscard: [],
      };
      reshuffledSlowDowns = true;
    } else {
      // Both Event Deck and Slow-Down Discard empty -> skip flip, still Rest
      next = appendLog(
        next,
        'EVENT',
        'Event Deck and Slow-Down Discard are both empty — Event flip skipped.',
        next.activeHelperId,
      );
      return {
        ...next,
        phase: 'EVENT_RESOLVED',
        lastEvent: {
          drawnCard: null,
          reshuffledSlowDowns: false,
          notes: [
            {
              kind: 'DECK_EMPTY',
              text: 'Both Event Deck and Slow-Down Discard are empty — no Event flipped!',
            },
          ],
          highlightedSlots: [],
        },
      };
    }
  }

  const [drawn, ...restDeck] = next.eventDeck;
  next = { ...next, eventDeck: restDeck };

  const notes: EventEffectNote[] = [];
  const highlightedSlots: number[] = [];

  // Case A: Household Tool drawn from Event Deck
  if (drawn.category === 'TOOL') {
    if (next.readyTools.length < 3) {
      next = {
        ...next,
        readyTools: [...next.readyTools, drawn.card],
      };
      notes.push({
        kind: 'TOOL_READY',
        text: `Good news! ${drawn.card.title} added to the Ready Tool Row.`,
      });
      next = appendLog(
        next,
        'EVENT',
        `Event flipped Tool: ${drawn.card.title} → added to Ready Tool Row.`,
        next.activeHelperId,
      );
    } else {
      next = {
        ...next,
        toolDiscard: [...next.toolDiscard, drawn.card],
      };
      notes.push({
        kind: 'TOOL_OVERFLOW',
        text: `Ready Tool Row is full (3/3) — ${drawn.card.title} placed in Tool Discard (can be Recharged later!).`,
      });
      next = appendLog(
        next,
        'EVENT',
        `Event flipped Tool: ${drawn.card.title} → Tool Discard (Ready Row full).`,
        next.activeHelperId,
      );
    }

    return {
      ...next,
      phase: 'EVENT_RESOLVED',
      lastEvent: {
        drawnCard: drawn,
        reshuffledSlowDowns,
        notes,
        highlightedSlots,
      },
    };
  }

  // Case B: Slow-Down drawn from Event Deck
  const slow = drawn.card;
  const blockedRoomNames: string[] = [];

  if (slow.kind === 'SINGLE_ZONE' && slow.zone && slow.ordinal) {
    const targetSlot = pickSingleZoneTarget(next.rooms, slow.zone, slow.ordinal);
    const hit = applyRoomHit(next, targetSlot, slow.zone);
    next = hit.state;
    notes.push(hit.note);
    if (hit.note.slotIndex !== undefined) highlightedSlots.push(hit.note.slotIndex);
    if (hit.flippedBlocked && hit.blockedRoomName) blockedRoomNames.push(hit.blockedRoomName);

    // Put in Slow-Down Discard
    next = {
      ...next,
      slowDownDiscard: [...next.slowDownDiscard, slow],
    };
    next = appendLog(
      next,
      'EVENT',
      `Slow-Down “${slow.title}”: ${hit.note.text}`,
      next.activeHelperId,
    );
  } else if (slow.kind === 'DOUBLE_TROUBLE' && slow.zones) {
    for (const z of slow.zones) {
      const targetSlot = pickFirstClearElseCluttered(next.rooms, z);
      const hit = applyRoomHit(next, targetSlot, z);
      next = hit.state;
      notes.push(hit.note);
      if (hit.note.slotIndex !== undefined && !highlightedSlots.includes(hit.note.slotIndex)) {
        highlightedSlots.push(hit.note.slotIndex);
      }
      if (hit.flippedBlocked && hit.blockedRoomName) blockedRoomNames.push(hit.blockedRoomName);
    }
    next = {
      ...next,
      slowDownDiscard: [...next.slowDownDiscard, slow],
    };
    next = appendLog(
      next,
      'EVENT',
      `Double Trouble “${slow.title}”: ${notes.map((n) => n.text).join(' ')}`,
      next.activeHelperId,
    );
  } else if (slow.kind === 'TIME_FLIES') {
    // Always return Time Flies to the box (even if game ends right now, keep 72-card conservation!)
    next = {
      ...next,
      boxedSlowDowns: [...next.boxedSlowDowns, slow],
    };

    // 1) Flip next Clock card FIRST (skip round-end Refresh/Arrival!)
    if (next.clockShield) {
      const spentShield = next.clockShield;
      next = {
        ...next,
        clockShield: null,
        boxedTools: [...next.boxedTools, spentShield],
      };
      notes.push({
        kind: 'CLOCK_SHIELDED',
        text: 'Early Prep Paid Off! blocked the Time Flies Clock flip and returned to the box!',
      });
    } else {
      const nextClockIdx = next.clockRow.findIndex((c) => !c.flipped);
      if (nextClockIdx >= 0) {
        const flippedCard = next.clockRow[nextClockIdx];
        const nextClockRow = next.clockRow.map((c, idx) =>
          idx === nextClockIdx ? { ...c, flipped: true } : c,
        );
        next = { ...next, clockRow: nextClockRow };
        if (flippedCard.isShabbatBegins) {
          notes.push({
            kind: 'CLOCK_FLIP',
            text: 'Shabbat Begins! flipped from Time Flies — stop right away!',
          });
          next = appendLog(
            next,
            'END',
            'Time Flies flipped Shabbat Begins! — Shabbat has begun before the house is ready.',
            next.activeHelperId,
          );
          return {
            ...next,
            phase: 'LOST',
            lossReason: '“Wait—Shabbat Is at WHAT Time?!” flipped Shabbat Begins!',
            lastEvent: {
              drawnCard: drawn,
              reshuffledSlowDowns,
              notes,
              highlightedSlots,
            },
          };
        } else {
          notes.push({
            kind: 'CLOCK_FLIP',
            text: 'Friday Afternoon flipped early! (No Refresh or Arrival flip.)',
          });
        }
      }
    }

    // 2) Hit 1st Clear Kitchen (else 1st Cluttered)
    const kitchenSlot = pickFirstClearElseCluttered(next.rooms, 'KITCHEN');
    const hit = applyRoomHit(next, kitchenSlot, 'KITCHEN');
    next = hit.state;
    notes.push(hit.note);
    if (hit.note.slotIndex !== undefined) highlightedSlots.push(hit.note.slotIndex);
    if (hit.flippedBlocked && hit.blockedRoomName) blockedRoomNames.push(hit.blockedRoomName);

    next = appendLog(
      next,
      'EVENT',
      `Time Flies “${slow.title}” (returned to box): ${notes.map((n) => n.text).join(' ')}`,
      next.activeHelperId,
    );
  }

  // Check if any room flipped Blocked -> Unlock 1 Backup Tool per flip (if Ready < 3 and Backup non-empty)
  const possiblePicks = Math.min(
    blockedRoomNames.length,
    Math.max(0, 3 - next.readyTools.length),
    next.backupTools.length,
  );

  if (possiblePicks > 0) {
    return {
      ...next,
      phase: 'SUBSTEP',
      pendingSubstep: {
        kind: 'BACKUP_TOOL_PICK',
        remainingPicks: possiblePicks,
        triggeredByRoomNames: blockedRoomNames,
      },
      lastEvent: {
        drawnCard: drawn,
        reshuffledSlowDowns,
        notes,
        highlightedSlots,
      },
    };
  }

  return {
    ...next,
    phase: 'EVENT_RESOLVED',
    lastEvent: {
      drawnCard: drawn,
      reshuffledSlowDowns,
      notes,
      highlightedSlots,
    },
  };
}

/**
 * Step 3.2 & 3.3: Rest the active Helper; if all 4 Helpers are Resting, resolve End of Round
 * (Clock Flip / Early Prep check, Refresh all 4 Helpers, Flip 1 Arrival Chore).
 */
export function advanceAfterEvent(state: GameState): GameState {
  if (state.phase !== 'EVENT_RESOLVED') return state;

  const restingHelperId = state.activeHelperId;
  const nextHelpers = {
    ...state.helpers,
    [restingHelperId]: {
      ...state.helpers[restingHelperId],
      resting: true,
    },
  };

  let next: GameState = {
    ...state,
    helpers: nextHelpers,
    lastActionNote: null,
  };

  const allResting = SEAT_ORDER.every((id) => next.helpers[id].resting);

  if (!allResting) {
    const nextTurnInRound = next.turnInRound + 1;
    const nextTotalTurns = next.totalTurns + 1;

    if (next.turnMode === 'TWO_GROUP') {
      const nextGroup: 'A' | 'B' = next.activeGroup === 'A' ? 'B' : 'A';
      const readyInGroup = GROUP_HELPERS[nextGroup].filter((id) => !next.helpers[id].resting);
      const nextActiveHelper = readyInGroup[0];
      return {
        ...next,
        turnInRound: nextTurnInRound,
        totalTurns: nextTotalTurns,
        activeGroup: nextGroup,
        activeHelperId: nextActiveHelper,
        phase: readyInGroup.length > 1 ? 'CHOOSE_HELPER' : 'MOVE',
        movedThisTurn: false,
        lastEvent: null,
      };
    }

    const currentSeatIdx = SEAT_ORDER.indexOf(restingHelperId);
    const nextHelperId = SEAT_ORDER[(currentSeatIdx + 1) % SEAT_ORDER.length];
    return {
      ...next,
      turnInRound: nextTurnInRound,
      totalTurns: nextTotalTurns,
      activeHelperId: nextHelperId,
      phase: 'MOVE',
      movedThisTurn: false,
      lastEvent: null,
    };
  }

  // -------------------------------------------------------------------------
  // End of Round (All 4 Helpers Resting):
  // 1) Clock Flip (or Early Prep shield absorbs & boxes)
  // 2) Refresh all 4 Helpers to Ready
  // 3) Flip 1 Arrival Chore into Chore Row (if any remain)
  // -------------------------------------------------------------------------
  if (next.clockShield) {
    const shield = next.clockShield;
    next = {
      ...next,
      clockShield: null,
      boxedTools: [...next.boxedTools, shield],
    };
    next = appendLog(
      next,
      'ROUND',
      `End of Round ${next.round}: Early Prep Paid Off! blocked the Clock flip and returned to the box!`,
    );
  } else {
    const nextClockIdx = next.clockRow.findIndex((c) => !c.flipped);
    if (nextClockIdx >= 0) {
      const flippedCard = next.clockRow[nextClockIdx];
      next = {
        ...next,
        clockRow: next.clockRow.map((c, idx) =>
          idx === nextClockIdx ? { ...c, flipped: true } : c,
        ),
      };
      if (flippedCard.isShabbatBegins) {
        next = appendLog(
          next,
          'END',
          `End of Round ${next.round}: Shabbat Begins! flipped — candles are lit before all Chores finished.`,
        );
        return {
          ...next,
          phase: 'LOST',
          lossReason: `Shabbat Begins! flipped at the end of Round ${next.round}.`,
          lastEvent: null,
        };
      }
      next = appendLog(
        next,
        'ROUND',
        `End of Round ${next.round}: Friday Afternoon flipped on the Shabbat Clock.`,
      );
    }
  }

  // Refresh all 4 Helpers upright (Ready)
  const refreshedHelpers = { ...next.helpers };
  for (const id of SEAT_ORDER) {
    refreshedHelpers[id] = { ...refreshedHelpers[id], resting: false };
  }
  next = { ...next, helpers: refreshedHelpers };

  // Flip 1 Arrival Chore into Chore Row (if any remain)
  if (next.arrivalPile.length > 0) {
    const [arrived, ...restArrival] = next.arrivalPile;
    next = {
      ...next,
      choreRow: [...next.choreRow, arrived],
      arrivalPile: restArrival,
    };
    next = appendLog(
      next,
      'ROUND',
      `Arrival Chore flipped into Chore Row: “${arrived.title}”. All 4 Helpers are Ready for Round ${next.round + 1}!`,
    );
  } else {
    next = appendLog(
      next,
      'ROUND',
      `All 4 Helpers are Ready for Round ${next.round + 1}! (Arrival Pile empty.)`,
    );
  }

  const nextRound = next.round + 1;
  return {
    ...next,
    round: nextRound,
    turnInRound: 1,
    totalTurns: next.totalTurns + 1,
    activeGroup: 'A',
    activeHelperId: 'ABBA',
    phase: next.turnMode === 'TWO_GROUP' ? 'CHOOSE_HELPER' : 'MOVE',
    movedThisTurn: false,
    lastEvent: null,
    lastActionNote:
      next.turnMode === 'TWO_GROUP'
        ? `Round ${nextRound} begins! Group A starts.`
        : `Round ${nextRound} begins! ${getHelperName('ABBA')} starts.`,
  };
}
