import { DIFFICULTY_CONFIGS, HELPER_DEFS, SEAT_ORDER } from '../data/cards';
import { getActionEvaluation } from './actions';
import { advanceAfterEvent, resolveEventFlip } from './events';
import { appendLog, getHelperName } from './helpers';
import { getLegalMoves } from './movement';
import { ActionCandidate, GameState, HelperId } from './types';

function refillChoreRow(state: GameState): GameState {
  const target = DIFFICULTY_CONFIGS[state.difficulty].choreRowTarget;
  if (state.choreRow.length >= target || state.choreDeck.length === 0) return state;

  const needed = Math.min(target - state.choreRow.length, state.choreDeck.length);
  const drawn = state.choreDeck.slice(0, needed);
  const restDeck = state.choreDeck.slice(needed);
  return {
    ...state,
    choreRow: [...state.choreRow, ...drawn],
    choreDeck: restDeck,
  };
}

function isAllChoresDone(state: GameState): boolean {
  if (state.choreRow.length > 0 || state.choreDeck.length > 0) return false;
  if (SEAT_ORDER.some((id) => state.helpers[id].carriedErrands.length > 0)) return false;
  return true;
}

/**
 * After any Move, Action, or Substep resolves:
 * 1) Refill Chore Row back to 4 immediately.
 * 2) Check immediate win (skip Event & Clock flip!).
 * 3) If actionsRemaining > 0, stay in TURN.
 * 4) If actionsRemaining === 0, stay in TURN ONLY if a free action (Mommy's unused Free Errand
 *    or Free Handoff) is currently available; otherwise advance smoothly to EVENT_READY!
 */
function finalizeActionStep(state: GameState, actionNote: string): GameState {
  let next = refillChoreRow(state);

  if (isAllChoresDone(next)) {
    next = appendLog(
      next,
      'END',
      `ALL CHORES COMPLETE! ${getHelperName(next.activeHelperId)} finished the final Chore — Shabbat Shalom!`,
      next.activeHelperId,
    );
    return {
      ...next,
      phase: 'WON',
      pendingSubstep: null,
      lastActionNote: actionNote,
    };
  }

  const candidateState: GameState = {
    ...next,
    phase: 'TURN',
    pendingSubstep: null,
    lastActionNote: actionNote,
  };

  if (candidateState.actionsRemaining > 0) {
    return candidateState;
  }

  // 0 Actions remaining — check if a FREE action (Mommy's Free Errand or Free Handoff) is still legal!
  const { legal } = getActionEvaluation(candidateState);
  const hasUsefulFree = legal.some((a) => a.isFree);
  if (hasUsefulFree) {
    return candidateState;
  }

  return {
    ...candidateState,
    phase: 'EVENT_READY',
  };
}

/**
 * Move Action (costs 1 Action): Walk 1 room orthogonally, or Mekimi crawls to ANY room.
 */
export function applyMove(state: GameState, targetSlot: number): GameState {
  if (state.phase !== 'TURN' || state.actionsRemaining <= 0) return state;
  const legal = getLegalMoves(state);
  const move = legal.find((m) => m.targetSlot === targetSlot);
  if (!move) return state;

  const activeId = state.activeHelperId;
  const nextHelpers = {
    ...state.helpers,
    [activeId]: {
      ...state.helpers[activeId],
      slotIndex: targetSlot,
    },
  };

  const note =
    move.kind === 'TURBO_CRAWL'
      ? `${getHelperName(activeId)} Turbo Crawled to ${state.rooms[targetSlot].card.name}!`
      : `${getHelperName(activeId)} walked to ${state.rooms[targetSlot].card.name}.`;

  let next: GameState = {
    ...state,
    helpers: nextHelpers,
    actionsRemaining: state.actionsRemaining - 1,
  };
  next = appendLog(next, 'MOVE', note, activeId);
  return finalizeActionStep(next, note);
}

/**
 * End Step 1 early (or finish after using Free Handoff / Mommy Free Errand) -> Flip 1 Event Card.
 */
export function applyEndTurnActions(state: GameState): GameState {
  if (state.phase !== 'TURN') return state;
  const activeId = state.activeHelperId;
  const note =
    state.actionsRemaining > 0
      ? `${getHelperName(activeId)} ended actions early (${state.actionsRemaining} unused) — ready to flip Event.`
      : `${getHelperName(activeId)} finished turn actions — ready to flip Event.`;
  const next = appendLog(state, 'ACTION', note, activeId);
  return {
    ...next,
    actionsRemaining: 0,
    phase: 'EVENT_READY',
    lastActionNote: note,
  };
}

/**
 * Execute any legal non-Move action (Tidy, Team Chore, Pick Up/Deliver Errand, Free Handoff, Use Tool).
 */
export function applyAction(state: GameState, actionId: string): GameState {
  if (state.phase !== 'TURN') return state;
  const { legal } = getActionEvaluation(state);
  const candidate: ActionCandidate | undefined = legal.find((a) => a.id === actionId);
  if (!candidate) return state;

  const activeId = state.activeHelperId;
  const activeHelper = state.helpers[activeId];
  const slot = activeHelper.slotIndex;
  const room = state.rooms[slot];

  switch (candidate.type) {
    case 'TIDY_CLUTTERED': {
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, state: 'CLEAR' as const } : r,
      );
      const note = `${getHelperName(activeId)} tidied ${room.card.name} → Clear!`;
      const next = appendLog(
        { ...state, rooms: nextRooms, actionsRemaining: state.actionsRemaining - 1 },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    case 'TIDY_BLOCKED': {
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, state: 'CLEAR' as const } : r,
      );
      const note = `${getHelperName(activeId)} unblocked ${room.card.name} → Clear!`;
      const next = appendLog(
        { ...state, rooms: nextRooms, actionsRemaining: state.actionsRemaining - 1 },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    case 'TEAM_CHORE': {
      const chore = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!chore) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== chore.id);
      const nextDone = [...state.doneChores, chore];
      const note = `${getHelperName(activeId)} & teammate finished Team Chore “${chore.title}”!`;
      const next = appendLog(
        {
          ...state,
          choreRow: nextChoreRow,
          doneChores: nextDone,
          actionsRemaining: state.actionsRemaining - 1,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    case 'PICK_UP_ERRAND': {
      const errand = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const isFree = Boolean(candidate.isFree);
      const nextChoreRow = state.choreRow.filter((c) => c.id !== errand.id);
      const nextHelpers = {
        ...state.helpers,
        [activeId]: {
          ...activeHelper,
          carriedErrands: [...activeHelper.carriedErrands, errand],
        },
      };
      const note = isFree
        ? `${getHelperName(activeId)} picked up Errand “${errand.title}” for FREE (Errand Express)!`
        : `${getHelperName(activeId)} picked up Errand “${errand.title}”.`;
      const next = appendLog(
        {
          ...state,
          choreRow: nextChoreRow,
          helpers: nextHelpers,
          actionsRemaining: isFree ? state.actionsRemaining : state.actionsRemaining - 1,
          mommyFreeErrandUsed: isFree ? true : state.mommyFreeErrandUsed,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    case 'DELIVER_ERRAND': {
      const errand = activeHelper.carriedErrands.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const isFree = Boolean(candidate.isFree);
      const nextHelpers = {
        ...state.helpers,
        [activeId]: {
          ...activeHelper,
          carriedErrands: activeHelper.carriedErrands.filter((c) => c.id !== errand.id),
        },
      };
      const nextDone = [...state.doneChores, errand];
      const note = isFree
        ? `${getHelperName(activeId)} delivered Errand “${errand.title}” for FREE (Errand Express)!`
        : `${getHelperName(activeId)} delivered Errand “${errand.title}”!`;
      const next = appendLog(
        {
          ...state,
          helpers: nextHelpers,
          doneChores: nextDone,
          actionsRemaining: isFree ? state.actionsRemaining : state.actionsRemaining - 1,
          mommyFreeErrandUsed: isFree ? true : state.mommyFreeErrandUsed,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    case 'GIVE_ERRAND': {
      const targetId = candidate.targetHelperId;
      if (!targetId) return state;
      const errand = activeHelper.carriedErrands.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const targetHelper = state.helpers[targetId];
      const nextHelpers = {
        ...state.helpers,
        [activeId]: {
          ...activeHelper,
          carriedErrands: activeHelper.carriedErrands.filter((c) => c.id !== errand.id),
        },
        [targetId]: {
          ...targetHelper,
          carriedErrands: [...targetHelper.carriedErrands, errand],
        },
      };
      const note = `Free Handoff: ${getHelperName(activeId)} gave “${errand.title}” to ${getHelperName(targetId)}.`;
      const next = appendLog({ ...state, helpers: nextHelpers }, 'ACTION', note, activeId);
      return finalizeActionStep(next, note);
    }

    case 'TAKE_ERRAND': {
      const targetId = candidate.targetHelperId;
      if (!targetId) return state;
      const targetHelper = state.helpers[targetId];
      const errand = targetHelper.carriedErrands.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const nextHelpers = {
        ...state.helpers,
        [targetId]: {
          ...targetHelper,
          carriedErrands: targetHelper.carriedErrands.filter((c) => c.id !== errand.id),
        },
        [activeId]: {
          ...activeHelper,
          carriedErrands: [...activeHelper.carriedErrands, errand],
        },
      };
      const note = `Free Handoff: ${getHelperName(activeId)} took “${errand.title}” from ${getHelperName(targetId)}.`;
      const next = appendLog({ ...state, helpers: nextHelpers }, 'ACTION', note, activeId);
      return finalizeActionStep(next, note);
    }

    case 'USE_ICE_COFFEE': {
      if (!candidate.toolId) return state;
      const eligibleSlots = state.rooms
        .filter((r) => r.state === 'CLUTTERED')
        .map((r) => r.slotIndex);
      if (eligibleSlots.length === 0) return state;
      return {
        ...state,
        phase: 'SUBSTEP',
        pendingSubstep: {
          kind: 'ICE_COFFEE_PICK',
          toolId: candidate.toolId,
          selectedSlots: [],
          eligibleSlots,
        },
        lastActionNote: 'Ice Coffee Boost: Click 1 or 2 Cluttered rooms to Clear!',
      };
    }

    case 'USE_SNACK_SUMMONS': {
      if (!candidate.toolId) return state;
      const eligibleHelpers = SEAT_ORDER.filter(
        (id) => id !== activeId && state.helpers[id].slotIndex !== slot,
      );
      if (eligibleHelpers.length === 0) return state;
      return {
        ...state,
        phase: 'SUBSTEP',
        pendingSubstep: {
          kind: 'SNACK_SUMMONS_PICK',
          toolId: candidate.toolId,
          eligibleHelpers,
        },
        lastActionNote: `Strategic Snack Summons: Choose a teammate to summon into ${room.card.name}!`,
      };
    }

    case 'USE_EARLY_PREP': {
      const tool = state.readyTools.find((t) => t.id === candidate.toolId);
      if (!tool) return state;
      const nextReady = state.readyTools.filter((t) => t.id !== tool.id);
      const note = `${getHelperName(activeId)} played Cousin Aviel Drops By! — Clock flip shielded!`;
      const next = appendLog(
        {
          ...state,
          readyTools: nextReady,
          clockShields: [...state.clockShields, tool],
          actionsRemaining: state.actionsRemaining - 1,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }

    default:
      return state;
  }
}

/**
 * Resolve an active Tool substep (Ice Coffee Boost or Strategic Snack Summons).
 */
export function applySubstepChoice(
  state: GameState,
  payload:
    | { type: 'TOGGLE_ICE_COFFEE_SLOT'; slotIndex: number }
    | { type: 'CONFIRM_ICE_COFFEE' }
    | { type: 'PICK_SNACK_HELPER'; helperId: HelperId }
    | { type: 'CANCEL_SUBSTEP' },
): GameState {
  if (state.phase !== 'SUBSTEP' || !state.pendingSubstep) return state;
  const sub = state.pendingSubstep;
  const activeId = state.activeHelperId;

  if (payload.type === 'CANCEL_SUBSTEP') {
    return {
      ...state,
      phase: 'TURN',
      pendingSubstep: null,
      lastActionNote: null,
    };
  }

  // 1. Ice Coffee Boost: pick 1-2 Cluttered rooms -> Event Discard
  if (sub.kind === 'ICE_COFFEE_PICK') {
    if (payload.type === 'TOGGLE_ICE_COFFEE_SLOT') {
      if (!sub.eligibleSlots.includes(payload.slotIndex)) return state;
      const already = sub.selectedSlots.includes(payload.slotIndex);
      let nextSelected: number[];
      if (already) {
        nextSelected = sub.selectedSlots.filter((s) => s !== payload.slotIndex);
      } else if (sub.selectedSlots.length < 2) {
        nextSelected = [...sub.selectedSlots, payload.slotIndex];
      } else {
        nextSelected = [sub.selectedSlots[1], payload.slotIndex];
      }
      return {
        ...state,
        pendingSubstep: { ...sub, selectedSlots: nextSelected },
      };
    }

    if (payload.type === 'CONFIRM_ICE_COFFEE') {
      if (sub.selectedSlots.length === 0) return state;
      const tool = state.readyTools.find((t) => t.id === sub.toolId);
      if (!tool) return state;
      const selectedSet = new Set(sub.selectedSlots);
      const clearedNames = sub.selectedSlots.map((s) => state.rooms[s].card.name);
      const nextRooms = state.rooms.map((r) =>
        selectedSet.has(r.slotIndex) ? { ...r, state: 'CLEAR' as const } : r,
      );
      const nextReady = state.readyTools.filter((t) => t.id !== tool.id);
      const nextEventDiscard = [...state.eventDiscard, { category: 'TOOL' as const, card: tool }];
      const note = `${getHelperName(activeId)} used Ice Coffee Boost → cleared ${clearedNames.join(' & ')}!`;
      const next = appendLog(
        {
          ...state,
          rooms: nextRooms,
          readyTools: nextReady,
          eventDiscard: nextEventDiscard,
          actionsRemaining: state.actionsRemaining - 1,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeActionStep(next, note);
    }
  }

  // 2. Strategic Snack Summons: pull teammate into room -> Event Discard
  if (sub.kind === 'SNACK_SUMMONS_PICK' && payload.type === 'PICK_SNACK_HELPER') {
    if (!sub.eligibleHelpers.includes(payload.helperId)) return state;
    const tool = state.readyTools.find((t) => t.id === sub.toolId);
    if (!tool) return state;
    const targetSlot = state.helpers[activeId].slotIndex;
    const nextHelpers = {
      ...state.helpers,
      [payload.helperId]: {
        ...state.helpers[payload.helperId],
        slotIndex: targetSlot,
      },
    };
    const nextReady = state.readyTools.filter((t) => t.id !== tool.id);
    const nextEventDiscard = [...state.eventDiscard, { category: 'TOOL' as const, card: tool }];
    const note = `${getHelperName(activeId)} used Strategic Snack Summons → ${getHelperName(payload.helperId)} joined ${state.rooms[targetSlot].card.name}!`;
    const next = appendLog(
      {
        ...state,
        helpers: nextHelpers,
        readyTools: nextReady,
        eventDiscard: nextEventDiscard,
        actionsRemaining: state.actionsRemaining - 1,
      },
      'ACTION',
      note,
      activeId,
    );
    return finalizeActionStep(next, note);
  }

  return state;
}

export { resolveEventFlip as applyEventFlip, advanceAfterEvent as applyAdvanceTurn };
export { HELPER_DEFS };
