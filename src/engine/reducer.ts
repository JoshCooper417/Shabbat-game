import { GROUP_HELPERS, HELPER_DEFS, SEAT_ORDER } from '../data/cards';
import { getActionEvaluation } from './actions';
import { advanceAfterEvent, resolveEventFlip } from './events';
import {
  appendLog,
  getHelperName,
  getOrthogonalNeighbors,
  getTeammatesInSlot,
} from './helpers';
import { getLegalMoves } from './movement';
import { ActionCandidate, GameState, HelperId } from './types';

function checkImmediateArrivalFlip(state: GameState): GameState {
  if (state.choreRow.length === 0 && state.arrivalPile.length > 0) {
    const [arrived, ...rest] = state.arrivalPile;
    const next: GameState = {
      ...state,
      choreRow: [arrived],
      arrivalPile: rest,
    };
    return appendLog(
      next,
      'ACTION',
      `Chore Row hit 0 — immediately flipped Arrival Chore: “${arrived.title}”!`,
      next.activeHelperId,
    );
  }
  return state;
}

function isAllChoresDone(state: GameState): boolean {
  if (state.choreRow.length > 0 || state.arrivalPile.length > 0) return false;
  if (state.rooms.some((r) => r.tuckedChore !== null)) return false;
  if (SEAT_ORDER.some((id) => state.helpers[id].carriedErrands.length > 0)) return false;
  return true;
}

function finalizeStep2(state: GameState, actionNote: string): GameState {
  let next = checkImmediateArrivalFlip(state);
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
  return {
    ...next,
    phase: 'EVENT_READY',
    pendingSubstep: null,
    lastActionNote: actionNote,
  };
}

/**
 * In 1-2P Group Mode, choose which Ready Helper in the active group acts next.
 */
export function applyChooseHelper(state: GameState, helperId: HelperId): GameState {
  if (state.phase !== 'CHOOSE_HELPER') return state;
  if (!GROUP_HELPERS[state.activeGroup].includes(helperId)) return state;
  if (state.helpers[helperId].resting) return state;

  return {
    ...state,
    activeHelperId: helperId,
    phase: 'MOVE',
    movedThisTurn: false,
    lastActionNote: `Group ${state.activeGroup} chose ${getHelperName(helperId)} to act.`,
  };
}

/**
 * Step 1: Move active Helper to a legal target slot (or Stay).
 */
export function applyMove(state: GameState, targetSlot: number): GameState {
  if (state.phase !== 'MOVE') return state;
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

  let next: GameState = {
    ...state,
    helpers: nextHelpers,
    phase: 'ACT',
    movedThisTurn: move.kind !== 'STAY',
    lastActionNote:
      move.kind === 'STAY'
        ? `${getHelperName(activeId)} stayed in ${state.rooms[targetSlot].card.name}.`
        : `${getHelperName(activeId)} moved to ${state.rooms[targetSlot].card.name} (${move.label}).`,
  };

  next = appendLog(next, 'MOVE', next.lastActionNote!, activeId);
  return next;
}

/**
 * Step 2: Skip optional Step 2 action freely.
 */
export function applySkipAction(state: GameState): GameState {
  if (state.phase !== 'ACT') return state;
  const activeId = state.activeHelperId;
  const note = `${getHelperName(activeId)} skipped Step 2.`;
  const next = appendLog(state, 'ACTION', note, activeId);
  return {
    ...next,
    phase: 'EVENT_READY',
    lastActionNote: note,
  };
}

/**
 * Step 2: Execute a legal ActionCandidate.
 */
export function applyAction(state: GameState, actionId: string): GameState {
  if (state.phase !== 'ACT') return state;
  const { legal } = getActionEvaluation(state);
  const candidate: ActionCandidate | undefined = legal.find((a) => a.id === actionId);
  if (!candidate) return state;

  const activeId = state.activeHelperId;
  const activeHelper = state.helpers[activeId];
  const slot = activeHelper.slotIndex;
  const room = state.rooms[slot];
  const teammatesHere = getTeammatesInSlot(state, slot, activeId);

  switch (candidate.type) {
    case 'TIDY_CLUTTERED': {
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, state: 'CLEAR' as const } : r,
      );
      const clutteredNeighbors =
        teammatesHere.length > 0
          ? getOrthogonalNeighbors(slot).filter((n) => nextRooms[n].state === 'CLUTTERED')
          : [];
      const note = `${getHelperName(activeId)} tidied ${room.card.name} → Clear!`;
      const next = appendLog({ ...state, rooms: nextRooms }, 'ACTION', note, activeId);

      if (clutteredNeighbors.length > 0) {
        return {
          ...next,
          phase: 'SUBSTEP',
          pendingSubstep: {
            kind: 'TIDY_NEIGHBOR_BONUS',
            eligibleSlots: clutteredNeighbors,
          },
          lastActionNote: `${note} Choose up to 1 next-door Cluttered room to Clear too!`,
        };
      }
      return finalizeStep2(next, note);
    }

    case 'TIDY_BLOCKED': {
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, state: 'CLEAR' as const } : r,
      );
      const note = `${getHelperName(activeId)} unblocked ${room.card.name} → Clear!`;
      const next = appendLog({ ...state, rooms: nextRooms }, 'ACTION', note, activeId);
      return finalizeStep2(next, note);
    }

    case 'START_ROOM_CHORE': {
      const chore = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!chore) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== chore.id);
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, tuckedChore: chore } : r,
      );
      const note = `${getHelperName(activeId)} started “${chore.title}” (tucked under ${room.card.name}).`;
      const next = appendLog(
        { ...state, rooms: nextRooms, choreRow: nextChoreRow },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }

    case 'FINISH_TUCKED_CHORE': {
      const chore = room.tuckedChore;
      if (!chore) return state;
      const nextRooms = state.rooms.map((r) =>
        r.slotIndex === slot ? { ...r, tuckedChore: null } : r,
      );
      const nextDone = [...state.doneChores, chore];
      const note = `${getHelperName(activeId)} finished tucked Chore “${chore.title}”!`;
      const next = appendLog(
        { ...state, rooms: nextRooms, doneChores: nextDone },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }

    case 'RESTORE_ORDER': {
      const chore = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!chore) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== chore.id);
      const nextDone = [...state.doneChores, chore];
      const note = `${getHelperName(activeId)} completed Restore Order “${chore.title}”!`;
      const next = appendLog(
        { ...state, choreRow: nextChoreRow, doneChores: nextDone },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }

    case 'PICK_UP_ERRAND': {
      const errand = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== errand.id);
      const nextHelpers = {
        ...state.helpers,
        [activeId]: {
          ...activeHelper,
          carriedErrands: [...activeHelper.carriedErrands, errand],
        },
      };
      const note = `${getHelperName(activeId)} picked up Errand “${errand.title}”.`;
      const next = appendLog(
        { ...state, choreRow: nextChoreRow, helpers: nextHelpers },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }

    case 'DELIVER_ERRAND': {
      const errand = activeHelper.carriedErrands.find((c) => c.id === candidate.choreId);
      if (!errand) return state;
      const nextHelpers = {
        ...state.helpers,
        [activeId]: {
          ...activeHelper,
          carriedErrands: activeHelper.carriedErrands.filter((c) => c.id !== errand.id),
        },
      };
      const nextDone = [...state.doneChores, errand];
      const note = `${getHelperName(activeId)} delivered Errand “${errand.title}”!`;
      let next = appendLog(
        { ...state, helpers: nextHelpers, doneChores: nextDone },
        'ACTION',
        note,
        activeId,
      );
      next = checkImmediateArrivalFlip(next);

      if (isAllChoresDone(next)) {
        return finalizeStep2(next, note);
      }

      if (next.readyTools.length < 3 && next.toolDiscard.length > 0) {
        return {
          ...next,
          phase: 'SUBSTEP',
          pendingSubstep: {
            kind: 'RECHARGE_PICK',
            source: 'ERRAND_BONUS',
            maxCount: 1,
            selectedToolIds: [],
            canCancel: false,
          },
          lastActionNote: `${note} Bonus: Pick 1 used Tool to return to Ready!`,
        };
      }
      return finalizeStep2(next, note);
    }

    case 'PASS_ERRAND': {
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
      const note = `${getHelperName(activeId)} passed “${errand.title}” to ${getHelperName(targetId)}.`;
      const next = appendLog({ ...state, helpers: nextHelpers }, 'ACTION', note, activeId);
      return finalizeStep2(next, note);
    }

    case 'TEAM_PAIR': {
      const chore = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!chore) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== chore.id);
      const nextDone = [...state.doneChores, chore];
      const note = `${getHelperName(activeId)} & teammate finished Team Pair “${chore.title}”!`;
      let next = appendLog(
        { ...state, choreRow: nextChoreRow, doneChores: nextDone },
        'ACTION',
        note,
        activeId,
      );
      next = checkImmediateArrivalFlip(next);

      if (isAllChoresDone(next)) {
        return finalizeStep2(next, note);
      }

      if (next.readyTools.length < 3 && next.toolDiscard.length > 0) {
        return {
          ...next,
          phase: 'SUBSTEP',
          pendingSubstep: {
            kind: 'RECHARGE_PICK',
            source: 'TEAM_PAIR_BONUS',
            maxCount: 1,
            selectedToolIds: [],
            canCancel: false,
          },
          lastActionNote: `${note} Bonus: Pick 1 used Tool to return to Ready!`,
        };
      }
      return finalizeStep2(next, note);
    }

    case 'COMBO_ROOM_CHORE_ROW': {
      const chore = state.choreRow.find((c) => c.id === candidate.choreId);
      if (!chore) return state;
      const nextChoreRow = state.choreRow.filter((c) => c.id !== chore.id);
      const nextDone = [...state.doneChores, chore];
      const note = `${getHelperName(activeId)} & teammate finished “${chore.title}” in 1 step!`;
      const next = appendLog(
        { ...state, choreRow: nextChoreRow, doneChores: nextDone },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
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
      if (!tool || state.clockShield !== null) return state;
      const nextReady = state.readyTools.filter((t) => t.id !== tool.id);
      const note = `${getHelperName(activeId)} played Early Prep Paid Off! — next Clock flip is shielded!`;
      const next = appendLog(
        { ...state, readyTools: nextReady, clockShield: tool },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }

    case 'RECHARGE_TOOL': {
      const maxCount = Math.min(
        activeId === 'MEKIMI' ? 2 : 1,
        3 - state.readyTools.length,
        state.toolDiscard.length,
      );
      if (maxCount <= 0) return state;
      return {
        ...state,
        phase: 'SUBSTEP',
        pendingSubstep: {
          kind: 'RECHARGE_PICK',
          source: 'RECHARGE_ACTION',
          maxCount,
          selectedToolIds: [],
          canCancel: true,
        },
        lastActionNote:
          activeId === 'MEKIMI' && maxCount === 2
            ? 'Big Smile Reset: Pick 1 or 2 used Tools to return to Ready!'
            : 'Recharge: Pick 1 used Tool from Tool Discard to return to Ready!',
      };
    }

    default:
      return state;
  }
}

/**
 * Resolve or interact with an active PendingSubstep.
 */
export function applySubstepChoice(
  state: GameState,
  payload:
    | { type: 'PICK_TIDY_NEIGHBOR'; slotIndex: number | null }
    | { type: 'TOGGLE_ICE_COFFEE_SLOT'; slotIndex: number }
    | { type: 'CONFIRM_ICE_COFFEE' }
    | { type: 'PICK_SNACK_HELPER'; helperId: HelperId }
    | { type: 'TOGGLE_RECHARGE_TOOL'; toolId: string }
    | { type: 'CONFIRM_RECHARGE' }
    | { type: 'PICK_BACKUP_TOOL'; toolId: string }
    | { type: 'CANCEL_SUBSTEP' },
): GameState {
  if (state.phase !== 'SUBSTEP' || !state.pendingSubstep) return state;
  const sub = state.pendingSubstep;
  const activeId = state.activeHelperId;

  if (payload.type === 'CANCEL_SUBSTEP') {
    if (
      sub.kind === 'ICE_COFFEE_PICK' ||
      sub.kind === 'SNACK_SUMMONS_PICK' ||
      (sub.kind === 'RECHARGE_PICK' && sub.canCancel)
    ) {
      return {
        ...state,
        phase: 'ACT',
        pendingSubstep: null,
        lastActionNote: null,
      };
    }
    return state;
  }

  // 1. Tidy Neighbor Bonus
  if (sub.kind === 'TIDY_NEIGHBOR_BONUS' && payload.type === 'PICK_TIDY_NEIGHBOR') {
    if (payload.slotIndex === null) {
      return finalizeStep2(state, 'Skipped optional next-door Tidy bonus.');
    }
    if (!sub.eligibleSlots.includes(payload.slotIndex)) return state;
    const targetRoom = state.rooms[payload.slotIndex];
    const nextRooms = state.rooms.map((r) =>
      r.slotIndex === payload.slotIndex ? { ...r, state: 'CLEAR' as const } : r,
    );
    const note = `Team Tidy bonus: also cleared next-door ${targetRoom.card.name}!`;
    const next = appendLog({ ...state, rooms: nextRooms }, 'ACTION', note, activeId);
    return finalizeStep2(next, note);
  }

  // 2. Ice Coffee Boost: toggle 1–2 Cluttered rooms, then confirm
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
        // Replace oldest selection so picking feels effortless
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
      const nextDiscard = [...state.toolDiscard, tool];
      const note = `${getHelperName(activeId)} used Ice Coffee Boost → cleared ${clearedNames.join(' & ')}!`;
      const next = appendLog(
        {
          ...state,
          rooms: nextRooms,
          readyTools: nextReady,
          toolDiscard: nextDiscard,
        },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }
  }

  // 3. Strategic Snack Summons: pick teammate
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
    const nextDiscard = [...state.toolDiscard, tool];
    const note = `${getHelperName(activeId)} used Strategic Snack Summons → ${getHelperName(payload.helperId)} joined ${state.rooms[targetSlot].card.name}!`;
    const next = appendLog(
      {
        ...state,
        helpers: nextHelpers,
        readyTools: nextReady,
        toolDiscard: nextDiscard,
      },
      'ACTION',
      note,
      activeId,
    );
    return finalizeStep2(next, note);
  }

  // 4. Recharge Tool (action OR Errand/Team Pair bonus)
  if (sub.kind === 'RECHARGE_PICK') {
    if (payload.type === 'TOGGLE_RECHARGE_TOOL') {
      const exists = state.toolDiscard.some((t) => t.id === payload.toolId);
      if (!exists) return state;
      const already = sub.selectedToolIds.includes(payload.toolId);
      let nextIds: string[];
      if (already) {
        nextIds = sub.selectedToolIds.filter((id) => id !== payload.toolId);
      } else if (sub.selectedToolIds.length < sub.maxCount) {
        nextIds = [...sub.selectedToolIds, payload.toolId];
      } else if (sub.maxCount === 1) {
        nextIds = [payload.toolId];
      } else {
        nextIds = [sub.selectedToolIds[sub.selectedToolIds.length - 1], payload.toolId];
      }
      return {
        ...state,
        pendingSubstep: { ...sub, selectedToolIds: nextIds },
      };
    }

    if (payload.type === 'CONFIRM_RECHARGE') {
      if (sub.selectedToolIds.length === 0) return state;
      const pickedSet = new Set(sub.selectedToolIds);
      const pickedTools = state.toolDiscard.filter((t) => pickedSet.has(t.id));
      const nextDiscard = state.toolDiscard.filter((t) => !pickedSet.has(t.id));
      const nextReady = [...state.readyTools, ...pickedTools];
      const names = pickedTools.map((t) => t.title).join(' & ');
      const note =
        sub.source === 'RECHARGE_ACTION'
          ? `${getHelperName(activeId)} recharged ${names} → Ready Tool Row!`
          : `Bonus Tool Recharge: returned ${names} → Ready Tool Row!`;
      const next = appendLog(
        { ...state, readyTools: nextReady, toolDiscard: nextDiscard },
        'ACTION',
        note,
        activeId,
      );
      return finalizeStep2(next, note);
    }
  }

  // 5. Backup Tool Unlock (when a room flips Red Blocked during Event resolution)
  if (sub.kind === 'BACKUP_TOOL_PICK' && payload.type === 'PICK_BACKUP_TOOL') {
    const picked = state.backupTools.find((t) => t.id === payload.toolId);
    if (!picked) return state;
    const nextBackup = state.backupTools.filter((t) => t.id !== picked.id);
    const nextReady = [...state.readyTools, picked];
    const remaining = Math.min(
      sub.remainingPicks - 1,
      Math.max(0, 3 - nextReady.length),
      nextBackup.length,
    );
    const note = `Unlocked Backup Tool: ${picked.title} moved to Ready Tool Row!`;
    let next = appendLog(
      { ...state, readyTools: nextReady, backupTools: nextBackup },
      'EVENT',
      note,
      activeId,
    );
    if (remaining > 0) {
      return {
        ...next,
        phase: 'SUBSTEP',
        pendingSubstep: {
          ...sub,
          remainingPicks: remaining,
        },
        lastActionNote: `${note} Pick 1 more Backup Tool.`,
      };
    }
    return {
      ...next,
      phase: 'EVENT_RESOLVED',
      pendingSubstep: null,
      lastActionNote: note,
    };
  }

  return state;
}

export { resolveEventFlip as applyEventFlip, advanceAfterEvent as applyAdvanceTurn };
export { HELPER_DEFS };
