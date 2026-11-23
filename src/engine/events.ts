import { SEAT_ORDER, ZONE_META } from '../data/cards';
import {
  appendLog,
  getHelperName,
  isProtectedByAbba,
  mulberry32,
  shuffleWithRng,
} from './helpers';
import {
  EventEffectNote,
  GameState,
  RoomSlot,
  ZoneId,
} from './types';

/**
 * Universal Cluttered-First Slow-Down Targeting (D2*):
 * Scan matching rooms left to right, top to bottom (skipping Blocked):
 * 1) Flip the 1st Cluttered room to Blocked!
 * 2) If none are Cluttered, turn the 1st Clear room sideways (Cluttered)!
 * 3) If all are already Blocked, return null (harmless).
 */
function pickClutteredFirstTarget(rooms: RoomSlot[], zone: ZoneId): number | null {
  const nonBlocked = rooms.filter((r) => r.card.zone === zone && r.state !== 'BLOCKED');
  if (nonBlocked.length === 0) return null;
  const firstCluttered = nonBlocked.find((r) => r.state === 'CLUTTERED');
  return (firstCluttered ?? nonBlocked[0]).slotIndex;
}

function applyRoomHit(
  state: GameState,
  slotIndex: number | null,
  zone: ZoneId,
): { state: GameState; note: EventEffectNote } {
  if (slotIndex === null) {
    return {
      state,
      note: {
        kind: 'ALL_BLOCKED',
        text: `All ${ZONE_META[zone].shortName} rooms are already Blocked — nothing happens!`,
      },
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
        text: `${room.card.name} turned sideways (Cluttered)!`,
      },
    };
  }

  // Room is CLUTTERED -> check Abba's Balagan Barrier (Always On)
  if (isProtectedByAbba(state, slotIndex)) {
    return {
      state,
      note: {
        slotIndex,
        roomName: room.card.name,
        kind: 'BARRIER',
        text: `Abba’s Balagan Barrier protected ${room.card.name} — flip to Blocked canceled!`,
      },
    };
  }

  // Flip to Red BLOCKED!
  const nextRooms = state.rooms.map((r) =>
    r.slotIndex === slotIndex ? { ...r, state: 'BLOCKED' as const } : r,
  );
  return {
    state: { ...state, rooms: nextRooms },
    note: {
      slotIndex,
      roomName: room.card.name,
      kind: 'BLOCKED',
      text: `${room.card.name} flipped RED BLOCKED!`,
    },
  };
}

/**
 * Step 2: Flip 1 Event Card & resolve its effect (RULES.md Section 5 / Booklet Page 11).
 */
export function resolveEventFlip(state: GameState): GameState {
  if (state.phase !== 'EVENT_READY') return state;

  let next = { ...state };
  let reshuffledDiscard = false;

  // Empty Event Deck? Reshuffle the ENTIRE single Event Discard Pile (Slow-Downs + spent Reusable Tools!)
  if (next.eventDeck.length === 0) {
    if (next.eventDiscard.length > 0) {
      const rng = mulberry32(next.seed + next.totalTurns * 7919 + next.round * 131);
      next = {
        ...next,
        eventDeck: shuffleWithRng(next.eventDiscard, rng),
        eventDiscard: [],
      };
      reshuffledDiscard = true;
    } else {
      next = appendLog(
        next,
        'EVENT',
        'Event Deck and Event Discard are both empty — Event flip skipped.',
        next.activeHelperId,
      );
      return {
        ...next,
        phase: 'EVENT_RESOLVED',
        lastEvent: {
          drawnCard: null,
          reshuffledDiscard: false,
          notes: [
            {
              kind: 'DECK_EMPTY',
              text: 'Both Event Deck and Event Discard are empty — no Event flipped!',
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

  // Case A: Household Tool -> straight to Family Toolbox (no cap!)
  if (drawn.category === 'TOOL') {
    next = {
      ...next,
      readyTools: [...next.readyTools, drawn.card],
    };
    notes.push({
      kind: 'TOOL_READY',
      text: `Good news! ${drawn.card.title} added to the Family Toolbox.`,
    });
    next = appendLog(
      next,
      'EVENT',
      `Event flipped Tool: ${drawn.card.title} → added to Family Toolbox.`,
      next.activeHelperId,
    );

    return {
      ...next,
      phase: 'EVENT_RESOLVED',
      lastEvent: {
        drawnCard: drawn,
        reshuffledDiscard,
        notes,
        highlightedSlots,
      },
    };
  }

  // Case B: Slow-Down
  const slow = drawn.card;

  if (slow.kind === 'SINGLE_ZONE' && slow.zone) {
    const targetSlot = pickClutteredFirstTarget(next.rooms, slow.zone);
    const hit = applyRoomHit(next, targetSlot, slow.zone);
    next = hit.state;
    notes.push(hit.note);
    if (hit.note.slotIndex !== undefined) highlightedSlots.push(hit.note.slotIndex);

    next = {
      ...next,
      eventDiscard: [...next.eventDiscard, drawn],
    };
    next = appendLog(
      next,
      'EVENT',
      `Slow-Down “${slow.title}”: ${hit.note.text}`,
      next.activeHelperId,
    );
  } else if (slow.kind === 'DOUBLE_TROUBLE' && slow.zones) {
    for (const z of slow.zones) {
      const targetSlot = pickClutteredFirstTarget(next.rooms, z);
      const hit = applyRoomHit(next, targetSlot, z);
      next = hit.state;
      notes.push(hit.note);
      if (hit.note.slotIndex !== undefined && !highlightedSlots.includes(hit.note.slotIndex)) {
        highlightedSlots.push(hit.note.slotIndex);
      }
    }
    next = {
      ...next,
      eventDiscard: [...next.eventDiscard, drawn],
    };
    next = appendLog(
      next,
      'EVENT',
      `Double Trouble “${slow.title}”: ${notes.map((n) => n.text).join(' ')}`,
      next.activeHelperId,
    );
  } else if (slow.kind === 'TIME_FLIES') {
    // Always return Time Flies to the box
    next = {
      ...next,
      boxedSlowDowns: [...next.boxedSlowDowns, slow],
    };

    // 1) Trigger 1 Clock flip FIRST
    if (next.clockShields.length > 0) {
      const [spentShield, ...restShields] = next.clockShields;
      next = {
        ...next,
        clockShields: restShields,
        boxedTools: [...next.boxedTools, spentShield],
      };
      notes.push({
        kind: 'CLOCK_SHIELDED',
        text: 'Cousin Aviel Drops By! blocked the Time Flies Clock flip and returned to the box!',
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
              reshuffledDiscard,
              notes,
              highlightedSlots,
            },
          };
        } else {
          notes.push({
            kind: 'CLOCK_FLIP',
            text: 'Friday Afternoon flipped early! (Keep playing the current round.)',
          });
        }
      }
    }

    // 2) Hit Kitchen (Cluttered-First)
    const kitchenSlot = pickClutteredFirstTarget(next.rooms, 'KITCHEN');
    const hit = applyRoomHit(next, kitchenSlot, 'KITCHEN');
    next = hit.state;
    notes.push(hit.note);
    if (hit.note.slotIndex !== undefined) highlightedSlots.push(hit.note.slotIndex);

    next = appendLog(
      next,
      'EVENT',
      `Time Flies “${slow.title}” (returned to box): ${notes.map((n) => n.text).join(' ')}`,
      next.activeHelperId,
    );
  }

  return {
    ...next,
    phase: 'EVENT_RESOLVED',
    lastEvent: {
      drawnCard: drawn,
      reshuffledDiscard,
      notes,
      highlightedSlots,
    },
  };
}

/**
 * Advance clockwise to the next Helper (Abba -> Nael -> Mommy -> Mekimi).
 * After Mekimi's turn, flip 1 Shabbat Clock card (or box a Cousin Aviel shield) and start next round with Abba!
 */
export function advanceAfterEvent(state: GameState): GameState {
  if (state.phase !== 'EVENT_RESOLVED') return state;

  let next: GameState = {
    ...state,
    lastActionNote: null,
  };

  if (next.turnInRound < 4) {
    const nextHelperId = SEAT_ORDER[next.turnInRound];
    return {
      ...next,
      turnInRound: next.turnInRound + 1,
      totalTurns: next.totalTurns + 1,
      activeHelperId: nextHelperId,
      actionsRemaining: 2,
      mommyFreeErrandUsed: false,
      phase: 'TURN',
      lastEvent: null,
    };
  }

  // End of Round (after Mekimi's turn): Clock flip (or Cousin Aviel shield)
  let clockNote = '';
  if (next.clockShields.length > 0) {
    const [shield, ...restShields] = next.clockShields;
    next = {
      ...next,
      clockShields: restShields,
      boxedTools: [...next.boxedTools, shield],
    };
    clockNote = 'Cousin Aviel blocked the Clock flip!';
    next = appendLog(
      next,
      'ROUND',
      `End of Round ${next.round}: Cousin Aviel Drops By! blocked the Clock flip and returned to the box!`,
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
          `End of Round ${next.round}: Shabbat Begins! flipped — candles are lit before all Missions finished.`,
        );
        return {
          ...next,
          phase: 'LOST',
          lossReason: `Shabbat Begins! flipped at the end of Round ${next.round}.`,
          lastEvent: null,
        };
      }
      const remainingSafe = next.clockRow.filter((c) => !c.flipped).length - 1;
      clockNote =
        remainingSafe <= 0
          ? 'Clock flipped (FINAL ROUND!)'
          : `Clock flipped (${remainingSafe} safe flip${remainingSafe === 1 ? '' : 's'} left)`;
      next = appendLog(
        next,
        'ROUND',
        `End of Round ${next.round}: Friday Afternoon flipped on the Shabbat Clock.`,
      );
    }
  }

  const nextRound = next.round + 1;
  return {
    ...next,
    round: nextRound,
    turnInRound: 1,
    totalTurns: next.totalTurns + 1,
    activeHelperId: 'ABBA',
    actionsRemaining: 2,
    mommyFreeErrandUsed: false,
    phase: 'TURN',
    lastEvent: null,
    lastActionNote: `Round ${nextRound} begins — ${clockNote} ${getHelperName('ABBA')} starts with 2 Actions.`,
  };
}
