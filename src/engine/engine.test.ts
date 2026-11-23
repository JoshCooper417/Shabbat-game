import { describe, expect, it } from 'vitest';
import { CHORE_DECK, SEAT_ORDER, SLOW_DOWN_DECK, TOOL_DECK } from '../data/cards';
import { getActionEvaluation } from './actions';
import { countAllPhysicalCards } from './helpers';
import { getLegalMoves } from './movement';
import {
  applyAction,
  applyAdvanceTurn,
  applyEndTurnActions,
  applyEventFlip,
  applyMove,
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

describe('Preparing for Shabbat: Cooper Family Edition — D2* Rules Engine', () => {
  it('sets up exact 72-card counts and difficulty invariants for Beginner, Standard, and Hard', () => {
    const cases: {
      diff: DifficultyId;
      clock: number;
      row: number;
      deck: number;
      slow: number;
      clutterSlots: number[];
      boxTimeFlies: boolean;
    }[] = [
      { diff: 'BEGINNER', clock: 7, row: 4, deck: 6, slow: 17, clutterSlots: [4], boxTimeFlies: true },
      { diff: 'STANDARD', clock: 6, row: 4, deck: 9, slow: 18, clutterSlots: [1, 7], boxTimeFlies: false },
      { diff: 'HARD', clock: 5, row: 4, deck: 11, slow: 18, clutterSlots: [1, 7], boxTimeFlies: false },
    ];

    for (const tc of cases) {
      for (let seed = 1; seed <= 10; seed += 1) {
        const s = createInitialGameState({ difficulty: tc.diff, seed });
        assert72Cards(s);
        expect(s.phase).toBe('TURN');
        expect(s.activeHelperId).toBe('ABBA');
        expect(s.actionsRemaining).toBe(2);
        expect(s.rooms).toHaveLength(9);
        expect(new Set(s.rooms.map((r) => r.card.zone)).size).toBe(4);
        const cluttered = s.rooms.filter((r) => r.state === 'CLUTTERED').map((r) => r.slotIndex);
        expect(cluttered).toEqual(tc.clutterSlots);
        expect(s.clockRow).toHaveLength(tc.clock);
        expect(s.clockRow[s.clockRow.length - 1].isShabbatBegins).toBe(true);
        expect(s.choreRow).toHaveLength(tc.row);
        expect(s.choreDeck).toHaveLength(tc.deck);

        // Guaranteed mix of Team Chores + Errands
        const allChores = [...s.choreRow, ...s.choreDeck];
        expect(allChores.some((c) => c.type === 'TEAM_CHORE')).toBe(true);
        expect(allChores.some((c) => c.type === 'ERRAND')).toBe(true);

        // Tools: 2 in Family Toolbox, 4 in Event Deck, 4 Boxed
        expect(s.readyTools).toHaveLength(2);
        expect(s.eventDeck.filter((e) => e.category === 'TOOL')).toHaveLength(4);
        expect(s.boxedTools).toHaveLength(4);

        // Slow-Downs: 17 on Beginner (Time Flies boxed), 18 on Standard/Hard
        const slowInDeck = s.eventDeck.filter((e) => e.category === 'SLOW_DOWN');
        expect(slowInDeck).toHaveLength(tc.slow);
        if (tc.boxTimeFlies) {
          expect(s.boxedSlowDowns.some((sd) => sd.kind === 'TIME_FLIES')).toBe(true);
          expect(slowInDeck.some((e) => e.category === 'SLOW_DOWN' && e.card.kind === 'TIME_FLIES')).toBe(
            false,
          );
        } else {
          expect(s.boxedSlowDowns).toHaveLength(0);
          expect(slowInDeck.some((e) => e.category === 'SLOW_DOWN' && e.card.kind === 'TIME_FLIES')).toBe(
            true,
          );
        }
      }
    }
  });

  it('enforces 1-step orthogonal Walk (no room occupancy limit) and Mekimi Turbo Crawl anywhere', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 42 });
    const rooms: RoomSlot[] = base.rooms.map((r) => ({ ...r, state: 'CLEAR' }));
    rooms[1] = { ...rooms[1], state: 'BLOCKED' };

    // Put Nael, Mommy, Mekimi all in slot 1 (Blocked) — Abba in slot 0 can STILL walk into slot 1 (no cap, can enter Blocked!)
    const state: GameState = {
      ...base,
      rooms,
      activeHelperId: 'ABBA',
      actionsRemaining: 2,
      phase: 'TURN',
      helpers: {
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
        NAEL: { ...base.helpers.NAEL, slotIndex: 1 },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 1 },
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 1 },
      },
    };

    const abbaMoves = getLegalMoves(state).map((m) => m.targetSlot).sort();
    expect(abbaMoves).toEqual([1, 3]); // Orthogonal only (no diagonal slot 4, no 2-step slot 2)

    // Walk all 4 Helpers into slot 1!
    const crowded = applyMove(state, 1);
    expect(crowded.helpers.ABBA.slotIndex).toBe(1);
    expect(crowded.actionsRemaining).toBe(1);

    // Mekimi in slot 1 can Turbo Crawl straight to ANY of the other 8 rooms (0, 2, 3, 4, 5, 6, 7, 8)
    const mekimiState: GameState = { ...state, activeHelperId: 'MEKIMI' };
    const mekimiMoves = getLegalMoves(mekimiState);
    expect(mekimiMoves).toHaveLength(8);
    expect(mekimiMoves.find((m) => m.targetSlot === 0)?.kind).toBe('WALK');
    expect(mekimiMoves.find((m) => m.targetSlot === 8)?.kind).toBe('TURBO_CRAWL');
  });

  it('supports 2-Action combos in any order (e.g., Tidy -> Team Chore -> auto-advance to EVENT_READY)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 9 });
    const room0Zone = base.rooms[0].card.zone;
    const teamChore = CHORE_DECK.find((c) => c.type === 'TEAM_CHORE' && c.zone === room0Zone)!;

    const state: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) => (i === 0 ? { ...r, state: 'CLUTTERED' } : { ...r, state: 'CLEAR' })),
      choreRow: [teamChore, ...base.choreRow.filter((c) => c.id !== teamChore.id).slice(0, 3)],
      choreDeck: base.choreDeck.filter((c) => c.id !== teamChore.id),
      activeHelperId: 'ABBA',
      actionsRemaining: 2,
      phase: 'TURN',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 0, carriedErrands: [] },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 0, carriedErrands: [] },
      },
    };

    // Room 0 is Cluttered without Nael -> Team Chore disabled, Tidy enabled
    const eval1 = getActionEvaluation(state);
    expect(eval1.legal.some((a) => a.type === 'TIDY_CLUTTERED')).toBe(true);
    expect(eval1.legal.some((a) => a.type === 'TEAM_CHORE' && a.choreId === teamChore.id)).toBe(false);

    // Action 1: Tidy Room 0 -> Clear (1 Action left)
    const afterTidy = applyAction(state, 'TIDY_CLUTTERED');
    expect(afterTidy.rooms[0].state).toBe('CLEAR');
    expect(afterTidy.actionsRemaining).toBe(1);
    expect(afterTidy.phase).toBe('TURN');

    // Action 2: Finish Team Chore! Instant auto-refill to 4 & advance to EVENT_READY
    const afterChore = applyAction(afterTidy, `TEAM_${teamChore.id}`);
    expect(afterChore.doneChores.some((c) => c.id === teamChore.id)).toBe(true);
    expect(afterChore.choreRow).toHaveLength(4);
    expect(afterChore.actionsRemaining).toBe(0);
    expect(afterChore.phase).toBe('EVENT_READY');
  });

  it('enforces Abba Solo Cleanup and Always-On Balagan Barrier', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 7 });
    const rooms: RoomSlot[] = base.rooms.map((r, i) =>
      i === 0 ? { ...r, state: 'BLOCKED' } : { ...r, state: 'CLEAR' },
    );

    const abbaSolo: GameState = {
      ...base,
      rooms,
      activeHelperId: 'ABBA',
      actionsRemaining: 2,
      phase: 'TURN',
      helpers: {
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
        NAEL: { ...base.helpers.NAEL, slotIndex: 2 },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 8 },
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 6 },
      },
    };

    // Abba unblocks alone in 1 Action
    expect(getActionEvaluation(abbaSolo).legal.some((a) => a.type === 'TIDY_BLOCKED')).toBe(true);
    const afterUnblock = applyAction(abbaSolo, 'TIDY_BLOCKED');
    expect(afterUnblock.rooms[0].state).toBe('CLEAR');
    expect(afterUnblock.actionsRemaining).toBe(1);

    // Nael alone CANNOT unblock a Blocked room
    const naelSolo: GameState = {
      ...abbaSolo,
      activeHelperId: 'NAEL',
      helpers: { ...abbaSolo.helpers, NAEL: { ...abbaSolo.helpers.NAEL, slotIndex: 0 }, ABBA: { ...abbaSolo.helpers.ABBA, slotIndex: 2 } },
    };
    expect(getActionEvaluation(naelSolo).legal.some((a) => a.type === 'TIDY_BLOCKED')).toBe(false);

    // Balagan Barrier: Cluttered room where Abba stands cannot flip Blocked!
    const zone0 = rooms[0].card.zone;
    const zoneSlowDown = SLOW_DOWN_DECK.find((s) => s.kind === 'SINGLE_ZONE' && s.zone === zone0)!;
    const barrierState: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) =>
        i === 0 ? { ...r, state: 'CLUTTERED' } : { ...r, state: 'CLEAR' },
      ),
      activeHelperId: 'NAEL',
      phase: 'EVENT_READY',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 0 },
      },
      eventDeck: [{ category: 'SLOW_DOWN', card: zoneSlowDown }],
    };

    const afterEvent = applyEventFlip(barrierState);
    expect(afterEvent.rooms[0].state).toBe('CLUTTERED'); // Protected!
    expect(afterEvent.lastEvent?.notes.some((n) => n.kind === 'BARRIER')).toBe(true);
  });

  it('enforces Nael Learning Tower Power! (either Nael or teammate can finish Cluttered Team Chore)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 13 });
    const zone0 = base.rooms[0].card.zone;
    const teamChore = CHORE_DECK.find((c) => c.type === 'TEAM_CHORE' && c.zone === zone0)!;

    const state: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) => (i === 0 ? { ...r, state: 'CLUTTERED' } : { ...r, state: 'CLEAR' })),
      choreRow: [teamChore],
      activeHelperId: 'MOMMY', // Teammate's turn, sharing Cluttered room with Nael!
      actionsRemaining: 2,
      phase: 'TURN',
      helpers: {
        ...base.helpers,
        NAEL: { ...base.helpers.NAEL, slotIndex: 0 },
        MOMMY: { ...base.helpers.MOMMY, slotIndex: 0 },
      },
    };

    expect(
      getActionEvaluation(state).legal.some(
        (a) => a.type === 'TEAM_CHORE' && a.bonusTag === 'Learning Tower Power!',
      ),
    ).toBe(true);

    // Does NOT work if room is Blocked
    const blocked = {
      ...state,
      rooms: state.rooms.map((r, i) => (i === 0 ? { ...r, state: 'BLOCKED' as const } : r)),
    };
    expect(getActionEvaluation(blocked).legal.some((a) => a.type === 'TEAM_CHORE')).toBe(false);
  });

  it('enforces Mommy Errand Express (1 FREE Pick Up/Deliver per turn, works in Cluttered, stays in TURN after 2nd Walk if Free Errand ready)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 21 });
    // Build a controlled board where slot 0 is KITCHEN (Cluttered) and slot 1 is TABLE (Cluttered)
    const kitchenIdx = base.rooms.findIndex((r) => r.card.zone === 'KITCHEN');
    const tableIdx = base.rooms.findIndex((r) => r.card.zone === 'TABLE');
    const errandKT = CHORE_DECK.find((c) => c.type === 'ERRAND' && c.zone === 'KITCHEN' && c.endZone === 'TABLE')!;
    const errandKT2 = CHORE_DECK.find(
      (c) => c.type === 'ERRAND' && c.zone === 'KITCHEN' && c.endZone === 'TABLE' && c.id !== errandKT.id,
    )!;

    const state: GameState = {
      ...base,
      rooms: base.rooms.map((r) => ({ ...r, state: 'CLUTTERED' })),
      choreRow: [errandKT, errandKT2],
      activeHelperId: 'MOMMY',
      actionsRemaining: 2,
      mommyFreeErrandUsed: false,
      phase: 'TURN',
      helpers: {
        ...base.helpers,
        MOMMY: { ...base.helpers.MOMMY, slotIndex: kitchenIdx, carriedErrands: [] },
      },
    };

    // 1st Pick Up in Cluttered Kitchen is FREE (0 Actions spent, mommyFreeErrandUsed becomes true!)
    const afterFreePickup = applyAction(state, `PICKUP_${errandKT.id}`);
    expect(afterFreePickup.actionsRemaining).toBe(2);
    expect(afterFreePickup.mommyFreeErrandUsed).toBe(true);
    expect(afterFreePickup.helpers.MOMMY.carriedErrands).toHaveLength(1);

    // 2nd Pick Up in Cluttered Kitchen STILL works (Cluttered permission) and costs 1 Action (cap = 1 free/turn)
    const afterPaidPickup = applyAction(afterFreePickup, `PICKUP_${errandKT2.id}`);
    expect(afterPaidPickup.actionsRemaining).toBe(1);
    expect(afterPaidPickup.helpers.MOMMY.carriedErrands).toHaveLength(2); // No carry limit!

    // Test Free Deliver at 0 Actions remaining (Walk -> Walk -> Free Deliver window!)
    const zeroAPMommy: GameState = {
      ...state,
      actionsRemaining: 0,
      mommyFreeErrandUsed: false,
      choreRow: [errandKT2],
      helpers: {
        ...state.helpers,
        MOMMY: { ...state.helpers.MOMMY, slotIndex: tableIdx, carriedErrands: [errandKT] },
      },
    };
    const evalZero = getActionEvaluation(zeroAPMommy);
    expect(evalZero.legal.some((a) => a.type === 'DELIVER_ERRAND' && a.isFree)).toBe(true);
    const afterFreeDeliver = applyAction(zeroAPMommy, `DELIVER_${errandKT.id}`);
    expect(afterFreeDeliver.doneChores.some((c) => c.id === errandKT.id)).toBe(true);
    expect(afterFreeDeliver.phase).toBe('EVENT_READY'); // No free actions left -> advances smoothly!
  });

  it('supports Free Handoff (give & take, 0 Actions, works even in Blocked rooms)', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 5 });
    const errand = CHORE_DECK.find((c) => c.type === 'ERRAND')!;

    const state: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) => (i === 4 ? { ...r, state: 'BLOCKED' } : r)),
      activeHelperId: 'ABBA',
      actionsRemaining: 2,
      phase: 'TURN',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: 4, carriedErrands: [errand] },
        MEKIMI: { ...base.helpers.MEKIMI, slotIndex: 4, carriedErrands: [] },
      },
    };

    const afterGive = applyAction(state, `GIVE_${errand.id}_TO_MEKIMI`);
    expect(afterGive.actionsRemaining).toBe(2); // 0 Actions!
    expect(afterGive.helpers.ABBA.carriedErrands).toHaveLength(0);
    expect(afterGive.helpers.MEKIMI.carriedErrands).toHaveLength(1);

    const afterTake = applyAction(afterGive, `TAKE_${errand.id}_FROM_MEKIMI`);
    expect(afterTake.actionsRemaining).toBe(2); // 0 Actions!
    expect(afterTake.helpers.ABBA.carriedErrands).toHaveLength(1);
    expect(afterTake.helpers.MEKIMI.carriedErrands).toHaveLength(0);
  });

  it('applies Universal Cluttered-First Slow-Downs, single Event Discard reshuffle, and stackable Cousin Aviel shields', () => {
    const base = createInitialGameState({ difficulty: 'STANDARD', seed: 30 });
    const kitchenSlots = base.rooms
      .filter((r) => r.card.zone === 'KITCHEN')
      .map((r) => r.slotIndex);
    expect(kitchenSlots.length).toBeGreaterThanOrEqual(2);

    const firstK = kitchenSlots[0];
    const secondK = kitchenSlots[1];
    const kitchenSlow = SLOW_DOWN_DECK.find((s) => s.kind === 'SINGLE_ZONE' && s.zone === 'KITCHEN')!;

    // Make firstK CLEAR and secondK CLUTTERED -> Universal Cluttered-First MUST hit secondK (Cluttered -> Blocked) before firstK!
    const rooms: RoomSlot[] = base.rooms.map((r) => {
      if (r.slotIndex === firstK) return { ...r, state: 'CLEAR' };
      if (r.slotIndex === secondK) return { ...r, state: 'CLUTTERED' };
      return { ...r, state: 'CLEAR' };
    });

    const slowState: GameState = {
      ...base,
      rooms,
      activeHelperId: 'NAEL',
      phase: 'EVENT_READY',
      helpers: {
        ...base.helpers,
        ABBA: { ...base.helpers.ABBA, slotIndex: (secondK + 1) % 9 }, // Abba NOT in secondK
      },
      eventDeck: [{ category: 'SLOW_DOWN', card: kitchenSlow }],
      eventDiscard: [],
    };

    const afterSlow = applyEventFlip(slowState);
    expect(afterSlow.rooms[secondK].state).toBe('BLOCKED'); // Cluttered flipped to Blocked first!
    expect(afterSlow.rooms[firstK].state).toBe('CLEAR');
    expect(afterSlow.eventDiscard).toHaveLength(1);

    // Reusable Tool (Ice Coffee) goes into the SAME shared eventDiscard when used!
    const coffee = TOOL_DECK.find((t) => t.kind === 'ICE_COFFEE')!;
    const coffeeState: GameState = {
      ...base,
      rooms: base.rooms.map((r, i) => (i === 0 ? { ...r, state: 'CLUTTERED' } : { ...r, state: 'CLEAR' })),
      readyTools: [coffee],
      eventDeck: [],
      eventDiscard: [{ category: 'SLOW_DOWN', card: kitchenSlow }],
      activeHelperId: 'ABBA',
      actionsRemaining: 1,
      phase: 'TURN',
    };
    const sub = applyAction(coffeeState, `USE_${coffee.id}`);
    expect(sub.phase).toBe('SUBSTEP');
    const picked = applySubstepChoice(sub, { type: 'TOGGLE_ICE_COFFEE_SLOT', slotIndex: 0 });
    const confirmed = applySubstepChoice(picked, { type: 'CONFIRM_ICE_COFFEE' });
    expect(confirmed.rooms[0].state).toBe('CLEAR');
    expect(confirmed.eventDiscard).toHaveLength(2); // Slow-Down + Ice Coffee both in Event Discard!
    expect(confirmed.phase).toBe('EVENT_READY');

    // Flipping from empty eventDeck reshuffles BOTH Slow-Down + spent Ice Coffee back in!
    const reshuffled = applyEventFlip(confirmed);
    expect(reshuffled.lastEvent?.reshuffledDiscard).toBe(true);
    expect(reshuffled.eventDeck.length + reshuffled.eventDiscard.length + reshuffled.readyTools.length).toBe(2);

    // Stackable Cousin Aviel shields block consecutive Clock flips and get boxed when consumed
    const shields = TOOL_DECK.filter((t) => t.kind === 'EARLY_PREP').slice(0, 2);
    const shieldState: GameState = {
      ...base,
      readyTools: shields,
      clockShields: [],
      boxedTools: [],
      activeHelperId: 'MEKIMI',
      turnInRound: 4,
      actionsRemaining: 2,
      phase: 'TURN',
    };
    const s1 = applyAction(shieldState, `USE_${shields[0].id}`);
    const s2 = applyAction(s1, `USE_${shields[1].id}`);
    expect(s2.clockShields).toHaveLength(2);
    expect(s2.phase).toBe('EVENT_READY');

    // Simulate end-of-round after Mekimi's Event -> consumes 1 shield, 0 Clock cards flipped, 1 shield remains!
    const endRound = applyAdvanceTurn({ ...s2, phase: 'EVENT_RESOLVED' });
    expect(endRound.clockRow.filter((c) => c.flipped)).toHaveLength(0);
    expect(endRound.clockShields).toHaveLength(1);
    expect(endRound.boxedTools).toHaveLength(1);
    expect(endRound.round).toBe(2);
    expect(endRound.activeHelperId).toBe('ABBA');
  });

  it('cycles fixed clockwise order Abba -> Nael -> Mommy -> Mekimi and triggers immediate win on final Chore', () => {
    let s = createInitialGameState({ difficulty: 'BEGINNER', seed: 101 });
    for (let i = 0; i < 4; i += 1) {
      expect(s.activeHelperId).toBe(SEAT_ORDER[i]);
      expect(s.turnInRound).toBe(i + 1);
      s = applyEndTurnActions(s);
      s = applyEventFlip(s);
      s = applyAdvanceTurn(s);
    }
    expect(s.round).toBe(2);
    expect(s.turnInRound).toBe(1);
    expect(s.activeHelperId).toBe('ABBA');
    expect(s.clockRow.filter((c) => c.flipped)).toHaveLength(1);

    // Immediate win check on final Chore (skips Event & Clock flip!)
    const lastErrand = CHORE_DECK.find((c) => c.type === 'ERRAND')!;
    const endIdx = s.rooms.findIndex((r) => r.card.zone === lastErrand.endZone);
    const almostWon: GameState = {
      ...s,
      rooms: s.rooms.map((r) => ({ ...r, state: 'CLEAR' })),
      choreRow: [],
      choreDeck: [],
      activeHelperId: 'ABBA',
      actionsRemaining: 1,
      phase: 'TURN',
      helpers: {
        ABBA: { id: 'ABBA', slotIndex: endIdx, carriedErrands: [lastErrand] },
        NAEL: { id: 'NAEL', slotIndex: 0, carriedErrands: [] },
        MOMMY: { id: 'MOMMY', slotIndex: 1, carriedErrands: [] },
        MEKIMI: { id: 'MEKIMI', slotIndex: 2, carriedErrands: [] },
      },
    };
    const won = applyAction(almostWon, `DELIVER_${lastErrand.id}`);
    expect(won.phase).toBe('WON');
  });

  it('maintains exact 72-card conservation with 0 deadlocks across 60 full randomized games (20 per difficulty)', () => {
    const diffs: DifficultyId[] = ['BEGINNER', 'STANDARD', 'HARD'];
    for (const diff of diffs) {
      for (let seed = 1; seed <= 20; seed += 1) {
        let s = createInitialGameState({ difficulty: diff, seed: seed * 17 });
        let steps = 0;
        while (s.phase !== 'WON' && s.phase !== 'LOST' && steps < 600) {
          assert72Cards(s);
          steps += 1;

          if (s.phase === 'TURN') {
            const { legal } = getActionEvaluation(s);
            const moves = getLegalMoves(s);
            // Prefer non-handoff progress actions, then moves, then end turn
            const preferred = legal.find((a) => !a.isFree || a.type === 'DELIVER_ERRAND' || a.type === 'PICK_UP_ERRAND');
            if (preferred) {
              s = applyAction(s, preferred.id);
            } else if (moves.length > 0 && s.actionsRemaining > 0) {
              const pick = moves[(steps + seed) % moves.length];
              s = applyMove(s, pick.targetSlot);
            } else {
              s = applyEndTurnActions(s);
            }
          } else if (s.phase === 'SUBSTEP' && s.pendingSubstep) {
            if (s.pendingSubstep.kind === 'ICE_COFFEE_PICK') {
              const slot0 = s.pendingSubstep.eligibleSlots[0];
              s = applySubstepChoice(s, { type: 'TOGGLE_ICE_COFFEE_SLOT', slotIndex: slot0 });
              s = applySubstepChoice(s, { type: 'CONFIRM_ICE_COFFEE' });
            } else if (s.pendingSubstep.kind === 'SNACK_SUMMONS_PICK') {
              const hid = s.pendingSubstep.eligibleHelpers[0];
              s = applySubstepChoice(s, { type: 'PICK_SNACK_HELPER', helperId: hid });
            }
          } else if (s.phase === 'EVENT_READY') {
            s = applyEventFlip(s);
          } else if (s.phase === 'EVENT_RESOLVED') {
            s = applyAdvanceTurn(s);
          }
        }
        assert72Cards(s);
        expect(['WON', 'LOST']).toContain(s.phase);
      }
    }
  });
});
