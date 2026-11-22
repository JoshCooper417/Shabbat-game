import { describe, expect, it } from 'vitest';
import { CHORE_DECK, SLOW_DOWN_DECK, TOOL_DECK } from '../data/cards';
import { getActionEvaluation } from './actions';
import { countAllPhysicalCards } from './helpers';
import { getLegalMoves } from './movement';
import {
  applyAction,
  applyAdvanceTurn,
  applyChooseHelper,
  applyEventFlip,
  applyMove,
  applySkipAction,
  applySubstepChoice,
} from './reducer';
import { createInitialGameState } from './setup';
import { DifficultyId, GameState, RoomSlot } from './types';

function assert72Cards(state: GameState) {
  const c = countAllPhysicalCards(state);
  expect(c.rooms).toBe(12);
  expect(c.helpers).toBe(4);
  expect(c.chores).toBe(18);
  expect(c.clock).toBe(10);
  expect(c.tools).toBe(10);
  expect(c.slowDowns).toBe(18);
  expect(c.total).toBe(72);
}

describe('Preparing for Shabbat: Cooper Family Edition — Rules Engine', () => {
  it('sets up exact 72-card counts and invariants for Beginner, Standard, and Hard', () => {
    const cases: {
      diff: DifficultyId;
      clock: number;
      row: number;
      arrival: number;
      slow: number;
      clutter: number;
    }[] = [
      { diff: 'BEGINNER', clock: 9, row: 3, arrival: 4, slow: 14, clutter: 1 },
      { diff: 'STANDARD', clock: 8, row: 5, arrival: 4, slow: 15, clutter: 2 },
      { diff: 'HARD', clock: 6, row: 6, arrival: 4, slow: 16, clutter: 2 },
    ];

    for (const tc of cases) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const s = createInitialGameState({ difficulty: tc.diff, seed });
        assert72Cards(s);
        expect(s.rooms).toHaveLength(9);
        expect(new Set(s.rooms.map((r) => r.card.zone)).size).toBe(4);
        expect(s.rooms.filter((r) => r.state === 'CLUTTERED')).toHaveLength(tc.clutter);
        expect(s.clockRow).toHaveLength(tc.clock);
        expect(s.clockRow[s.clockRow.length - 1].isShabbatBegins).toBe(true);
        expect(s.choreRow).toHaveLength(tc.row);
        expect(s.arrivalPile).toHaveLength(tc.arrival);

        const activeTypes = new Set([...s.choreRow, ...s.arrivalPile].map((c) => c.type));
        expect(activeTypes.size).toBe(4);

        expect(s.readyTools).toHaveLength(2);
        expect(s.backupTools).toHaveLength(2);
        expect(s.eventDeck.filter((e) => e.category === 'TOOL')).toHaveLength(2);
        expect(s.eventDeck.filter((e) => e.category === 'SLOW_DOWN')).toHaveLength(tc.slow);
        expect(s.boxedTools).toHaveLength(4);
      }
    }
  });

  it('enforces Hallway Slide (pass full Clear, stop on Cluttered/Blocked), Buddy-Hop, and Mekimi Turbo Crawl', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 42 });
    const rooms: RoomSlot[] = base.rooms.map((r) => ({ ...r, state: 'CLEAR' }));
    rooms[3] = { ...rooms[3], state: 'CLUTTERED' }; // Mid-Left is Cluttered

    // Put Nael & Mommy in slot 1 (Top-Center, Clear, full with 2 Helpers) so Abba (slot 0) can slide THROUGH slot 1 to slot 2!
    const state: GameState = {
      ...base,
      rooms,
      activeHelperId: 'ABBA',
      phase: 'MOVE',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
        NAEL: { ...base.helpers.NAEL, slotIndex: 1, resting: true },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 1 },
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 8, resting: true },
      },
    };

    const moves = getLegalMoves(state);
    const targets = new Set(moves.map((m) => m.targetSlot));
    expect(targets.has(0)).toBe(true); // Stay
    expect(targets.has(1)).toBe(false); // Full (2 Helpers)
    expect(targets.has(2)).toBe(true); // Passed through full Clear slot 1!
    expect(targets.has(3)).toBe(true); // Entered Cluttered slot 3...
    expect(targets.has(6)).toBe(false); // ...but MUST STOP in Cluttered slot 3!
    expect(targets.has(8)).toBe(true); // Buddy-Hop to Resting Mekimi!
    expect(targets.has(4)).toBe(false); // Abba cannot move diagonally

    // Mekimi CAN move diagonally via Turbo Crawl (from slot 8 -> slot 4)
    const mekimiState: GameState = { ...state, activeHelperId: 'MEKIMI' };
    const mekimiTargets = new Set(getLegalMoves(mekimiState).map((m) => m.targetSlot));
    expect(mekimiTargets.has(4)).toBe(true);
  });

  it('enforces Abba Solo Cleanup & Always-On Balagan Barrier (even while Resting)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 7 });
    const rooms: RoomSlot[] = base.rooms.map((r) => ({ ...r, state: 'CLEAR' }));
    rooms[0] = { ...rooms[0], state: 'BLOCKED' };

    const abbaSolo: GameState = {
      ...base,
      rooms,
      activeHelperId: 'ABBA',
      phase: 'ACT',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
        NAEL: { ...base.helpers.NAEL, slotIndex: 2 },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 8 },
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 6 },
      },
    };

    const { legal } = getActionEvaluation(abbaSolo);
    expect(legal.some((a) => a.type === 'TIDY_BLOCKED')).toBe(true);
    const afterTidy = applyAction(abbaSolo, 'TIDY_BLOCKED');
    expect(afterTidy.rooms[0].state).toBe('CLEAR');

    // Now test Balagan Barrier while Abba is RESTING in a Cluttered room!
    const zoneOf0 = rooms[0].card.zone;
    const slow1st = SLOW_DOWN_DECK.find(
      (s) => s.kind === 'SINGLE_ZONE' && s.zone === zoneOf0 && s.ordinal === 1,
    )!;
    const barrierState: GameState = {
      ...base,
      rooms: rooms.map((r, i) => (i === 0 ? { ...r, state: 'CLUTTERED' } : r)),
      activeHelperId: 'NAEL',
      phase: 'EVENT_READY',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 0, resting: true },
      },
      eventDeck: [{ category: 'SLOW_DOWN', card: slow1st }],
    };

    const afterEvent = applyEventFlip(barrierState);
    expect(afterEvent.rooms[0].state).toBe('CLUTTERED'); // Did NOT flip Blocked!
    expect(afterEvent.phase).toBe('EVENT_RESOLVED'); // No Backup Tool unlocked!
    expect(afterEvent.backupTools).toHaveLength(2);
  });

  it('enforces Mommy Errand Express (Cluttered Errands on own turn only, not Blocked, not for others)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 11 });
    const hbhErrand = CHORE_DECK.find((c) => c.id === 'CHORE_22')!; // KITCHEN -> TABLE
    const kitchenIdx = base.rooms.findIndex((r) => r.card.zone === 'KITCHEN');
    const tableIdx = base.rooms.findIndex((r) => r.card.zone === 'TABLE');

    const clutteredRooms = base.rooms.map((r) => ({ ...r, state: 'CLUTTERED' as const }));
    const stateMommyPickup: GameState = {
      ...base,
      rooms: clutteredRooms,
      choreRow: [hbhErrand],
      activeHelperId: 'MOMMY',
      phase: 'ACT',
      helpers: {
        ...base.helpers,
        MOMMY: { ...base.helpers.MOMMY, slotIndex: kitchenIdx, carriedErrands: [] },
      },
    };

    expect(
      getActionEvaluation(stateMommyPickup).legal.some((a) => a.type === 'PICK_UP_ERRAND'),
    ).toBe(true);

    // Other Helpers (e.g., Abba) CANNOT Pick Up in Cluttered rooms
    const stateAbbaPickup: GameState = {
      ...stateMommyPickup,
      activeHelperId: 'ABBA',
      helpers: {
        ...stateMommyPickup.helpers,
        ABBA: { ...stateMommyPickup.helpers.ABBA, slotIndex: kitchenIdx },
      },
    };
    expect(
      getActionEvaluation(stateAbbaPickup).legal.some((a) => a.type === 'PICK_UP_ERRAND'),
    ).toBe(false);

    // Mommy CANNOT Pick Up in Blocked room
    const blockedRooms = clutteredRooms.map((r, i) =>
      i === kitchenIdx ? { ...r, state: 'BLOCKED' as const } : r,
    );
    expect(
      getActionEvaluation({ ...stateMommyPickup, rooms: blockedRooms }).legal.some(
        (a) => a.type === 'PICK_UP_ERRAND',
      ),
    ).toBe(false);

    // Mommy CAN Deliver in Cluttered Table room
    const stateMommyDeliver: GameState = {
      ...stateMommyPickup,
      choreRow: [],
      helpers: {
        ...stateMommyPickup.helpers,
        MOMMY: { ...stateMommyPickup.helpers.MOMMY, slotIndex: tableIdx, carriedErrands: [hbhErrand] },
      },
    };
    expect(
      getActionEvaluation(stateMommyDeliver).legal.some((a) => a.type === 'DELIVER_ERRAND'),
    ).toBe(true);
  });

  it('enforces Nael Learning Tower Power! (Always On in Cluttered rooms for tucked Chores & Team Combos only)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 19 });
    const kitchenIdx = base.rooms.findIndex((r) => r.card.zone === 'KITCHEN');
    const roomChore = CHORE_DECK.find((c) => c.id === 'CHORE_17')!; // Kitchen Room Chore
    const teamPair = CHORE_DECK.find((c) => c.id === 'CHORE_27')!; // Kitchen Team Pair
    const restoreOrder = CHORE_DECK.find((c) => c.id === 'CHORE_31')!; // Kitchen Restore Order

    const rooms = base.rooms.map((r, i) =>
      i === kitchenIdx
        ? { ...r, state: 'CLUTTERED' as const, tuckedChore: roomChore }
        : { ...r, state: 'CLEAR' as const },
    );

    const state: GameState = {
      ...base,
      rooms,
      choreRow: [teamPair, restoreOrder],
      activeHelperId: 'ABBA', // Abba is acting while Nael is RESTING in same Cluttered room!
      phase: 'ACT',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: kitchenIdx, resting: false },
        NAEL: { ...base.helpers.NAEL, slotIndex: kitchenIdx, resting: true },
      },
    };

    const { legal } = getActionEvaluation(state);
    expect(legal.some((a) => a.type === 'FINISH_TUCKED_CHORE')).toBe(true);
    expect(legal.some((a) => a.type === 'TEAM_PAIR')).toBe(true);
    expect(legal.some((a) => a.type === 'RESTORE_ORDER')).toBe(false); // Still needs Clear!
  });

  it('enforces Mekimi Big Smile Reset (up to 2 Tools on Recharge action, only 1 on Deliver bonus)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 23 });
    const state: GameState = {
      ...base,
      activeHelperId: 'MEKIMI',
      phase: 'ACT',
      readyTools: [TOOL_DECK[0]],
      toolDiscard: [TOOL_DECK[1], TOOL_DECK[2]],
      helpers: {
        ...base.helpers,
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 0 },
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
      },
    };

    let next = applyAction(state, 'RECHARGE_TOOL');
    expect(next.phase).toBe('SUBSTEP');
    expect(next.pendingSubstep?.kind).toBe('RECHARGE_PICK');
    if (next.pendingSubstep?.kind === 'RECHARGE_PICK') {
      expect(next.pendingSubstep.maxCount).toBe(2);
    }
    next = applySubstepChoice(next, { type: 'TOGGLE_RECHARGE_TOOL', toolId: TOOL_DECK[1].id });
    next = applySubstepChoice(next, { type: 'TOGGLE_RECHARGE_TOOL', toolId: TOOL_DECK[2].id });
    next = applySubstepChoice(next, { type: 'CONFIRM_RECHARGE' });
    expect(next.readyTools).toHaveLength(3);
    expect(next.toolDiscard).toHaveLength(0);
  });

  it('enforces Time Flies (Clock first, Early Prep shield, immediate Loss on Shabbat Begins!, always boxed)', () => {
    const base = createInitialGameState({ difficulty: 'HARD', seed: 31 });
    const timeFlies = SLOW_DOWN_DECK.find((s) => s.kind === 'TIME_FLIES')!;
    const earlyPrep = TOOL_DECK.find((t) => t.kind === 'EARLY_PREP')!;

    // Case 1: Early Prep shields Time Flies Clock flip and returns to box; Time Flies returns to box
    const shieldedState: GameState = {
      ...base,
      phase: 'EVENT_READY',
      clockShield: earlyPrep,
      eventDeck: [{ category: 'SLOW_DOWN', card: timeFlies }],
      boxedTools: base.boxedTools.filter((t) => t.id !== earlyPrep.id),
      boxedSlowDowns: base.boxedSlowDowns.filter((s) => s.id !== timeFlies.id),
    };
    const afterShielded = applyEventFlip(shieldedState);
    expect(afterShielded.clockShield).toBeNull();
    expect(afterShielded.clockRow.every((c) => !c.flipped)).toBe(true);
    expect(afterShielded.boxedTools.some((t) => t.id === earlyPrep.id)).toBe(true);
    expect(afterShielded.boxedSlowDowns.some((s) => s.id === timeFlies.id)).toBe(true);
    expect(afterShielded.slowDownDiscard.some((s) => s.id === timeFlies.id)).toBe(false);

    // Case 2: Only Shabbat Begins! left -> immediate LOSS skipping Kitchen hit
    const lastClock = base.clockRow.map((c) => (c.isShabbatBegins ? { ...c, flipped: false } : { ...c, flipped: true }));
    const doomState: GameState = {
      ...base,
      phase: 'EVENT_READY',
      clockRow: lastClock,
      clockShield: null,
      rooms: base.rooms.map((r) => ({ ...r, state: 'CLEAR' as const })),
      eventDeck: [{ category: 'SLOW_DOWN', card: timeFlies }],
    };
    const afterDoom = applyEventFlip(doomState);
    expect(afterDoom.phase).toBe('LOST');
    expect(afterDoom.rooms.every((r) => r.state === 'CLEAR')).toBe(true); // Kitchen hit skipped!
  });

  it('enforces Immediate Arrival Flip on empty Chore Row and Immediate Win skipping Step 3', () => {
    const base = createInitialGameState({ difficulty: 'BEGINNER', seed: 55 });
    const kitchenIdx = base.rooms.findIndex((r) => r.card.zone === 'KITCHEN');
    const chore1 = CHORE_DECK.find((c) => c.id === 'CHORE_17')!;
    const chore2 = CHORE_DECK.find((c) => c.id === 'CHORE_18')!;

    // Immediate Arrival Flip when tucking last card in Chore Row
    const arrivalTest: GameState = {
      ...base,
      rooms: base.rooms.map((r) => ({ ...r, state: 'CLEAR' as const, tuckedChore: null })),
      choreRow: [chore1],
      arrivalPile: [chore2],
      activeHelperId: 'ABBA',
      phase: 'ACT',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: kitchenIdx },
      },
    };
    const afterTuck = applyAction(arrivalTest, `START_${chore1.id}`);
    expect(afterTuck.choreRow).toHaveLength(1);
    expect(afterTuck.choreRow[0].id).toBe(chore2.id);
    expect(afterTuck.arrivalPile).toHaveLength(0);

    // Immediate Win when finishing the very last Chore
    const winTest: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) => ({
        ...r,
        state: 'CLEAR' as const,
        tuckedChore: i === kitchenIdx ? chore1 : null,
      })),
      choreRow: [],
      arrivalPile: [],
      activeHelperId: 'ABBA',
      phase: 'ACT',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: kitchenIdx, carriedErrands: [] },
        NAEL: { ...base.helpers.NAEL, slotIndex: kitchenIdx, carriedErrands: [] },
        MOMMY: { ...base.helpers.MOMMY, carriedErrands: [] },
        MEKIMI: { ...base.helpers.MEKIMI, carriedErrands: [] },
      },
    };
    const afterWin = applyAction(winTest, `FINISH_TUCKED_${chore1.id}`);
    expect(afterWin.phase).toBe('WON');
  });

  it('maintains exact 72-card conservation and zero deadlocks across 60 random full games (4-seat & 2-group)', () => {
    const diffs: DifficultyId[] = ['BEGINNER', 'STANDARD', 'HARD'];
    for (let g = 0; g < 60; g += 1) {
      const difficulty = diffs[g % 3];
      const turnMode = g % 4 === 0 ? 'TWO_GROUP' : 'FOUR_SEAT';
      let s = createInitialGameState({ difficulty, turnMode, seed: 1000 + g });
      assert72Cards(s);

      for (let step = 0; step < 300; step += 1) {
        if (s.phase === 'WON' || s.phase === 'LOST') break;

        if (s.phase === 'CHOOSE_HELPER') {
          const groupHelpers = s.activeGroup === 'A' ? (['ABBA', 'NAEL'] as const) : (['MEKIMI', 'MOMMY'] as const);
          const pick = groupHelpers.find((id) => !s.helpers[id].resting)!;
          s = applyChooseHelper(s, pick);
        } else if (s.phase === 'MOVE') {
          const moves = getLegalMoves(s);
          expect(moves.length).toBeGreaterThan(0);
          s = applyMove(s, moves[step % moves.length].targetSlot);
        } else if (s.phase === 'ACT') {
          const { legal } = getActionEvaluation(s);
          if (legal.length > 0) {
            s = applyAction(s, legal[step % legal.length].id);
          } else {
            s = applySkipAction(s);
          }
        } else if (s.phase === 'SUBSTEP' && s.pendingSubstep) {
          const sub = s.pendingSubstep;
          if (sub.kind === 'TIDY_NEIGHBOR_BONUS') {
            s = applySubstepChoice(s, { type: 'PICK_TIDY_NEIGHBOR', slotIndex: sub.eligibleSlots[0] });
          } else if (sub.kind === 'ICE_COFFEE_PICK') {
            s = applySubstepChoice(s, { type: 'TOGGLE_ICE_COFFEE_SLOT', slotIndex: sub.eligibleSlots[0] });
            s = applySubstepChoice(s, { type: 'CONFIRM_ICE_COFFEE' });
          } else if (sub.kind === 'SNACK_SUMMONS_PICK') {
            s = applySubstepChoice(s, { type: 'PICK_SNACK_HELPER', helperId: sub.eligibleHelpers[0] });
          } else if (sub.kind === 'RECHARGE_PICK') {
            s = applySubstepChoice(s, { type: 'TOGGLE_RECHARGE_TOOL', toolId: s.toolDiscard[0].id });
            s = applySubstepChoice(s, { type: 'CONFIRM_RECHARGE' });
          } else if (sub.kind === 'BACKUP_TOOL_PICK') {
            s = applySubstepChoice(s, { type: 'PICK_BACKUP_TOOL', toolId: s.backupTools[0].id });
          }
        } else if (s.phase === 'EVENT_READY') {
          s = applyEventFlip(s);
        } else if (s.phase === 'EVENT_RESOLVED') {
          s = applyAdvanceTurn(s);
        }

        assert72Cards(s);
      }

      expect(['WON', 'LOST']).toContain(s.phase);
    }
  });
});
