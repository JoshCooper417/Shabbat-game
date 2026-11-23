import { SEAT_ORDER, ZONE_META } from '../data/cards';
import {
  getHelperName,
  getTeammatesInSlot,
  hasNaelClutteredBoost,
} from './helpers';
import { ActionCandidate, DisabledActionHint, GameState, ToolKind } from './types';

export interface ActionEvaluation {
  legal: ActionCandidate[];
  disabledHints: DisabledActionHint[];
}

/**
 * Evaluates all legal non-Move actions in the current D2* TURN phase:
 * - If actionsRemaining > 0: Tidy, Team Chores, Pick Up / Deliver Errands, Tools, and Free Handoff.
 * - If actionsRemaining === 0: Only FREE actions (Mommy's unused 1 Free Errand + Free Handoff).
 */
export function getActionEvaluation(state: GameState): ActionEvaluation {
  const legal: ActionCandidate[] = [];
  const disabledHints: DisabledActionHint[] = [];

  const activeId = state.activeHelperId;
  const activeHelper = state.helpers[activeId];
  const slot = activeHelper.slotIndex;
  const room = state.rooms[slot];
  const roomZone = room.card.zone;
  const teammatesHere = getTeammatesInSlot(state, slot, activeId);
  const hasTeammateHere = teammatesHere.length > 0;
  const naelBoost = hasNaelClutteredBoost(state, slot);
  const isClear = room.state === 'CLEAR';
  const isCluttered = room.state === 'CLUTTERED';
  const isBlocked = room.state === 'BLOCKED';
  const canErrandHere = isClear || (isCluttered && activeId === 'MOMMY');
  const canTeamChoreHere = isClear || naelBoost;
  const hasAP = state.actionsRemaining > 0;
  const mommyHasFreeErrand = activeId === 'MOMMY' && !state.mommyFreeErrandUsed;

  // -------------------------------------------------------------------------
  // 1. Tidy Room (1 Action)
  // -------------------------------------------------------------------------
  if (hasAP) {
    if (isCluttered) {
      legal.push({
        id: 'TIDY_CLUTTERED',
        type: 'TIDY_CLUTTERED',
        category: 'TIDY',
        label: `Tidy ${room.card.name}`,
        detail: 'Turn this Cluttered room upright (Clear) — 1 Action.',
      });
    } else if (isBlocked) {
      if (hasTeammateHere || activeId === 'ABBA') {
        legal.push({
          id: 'TIDY_BLOCKED',
          type: 'TIDY_BLOCKED',
          category: 'TIDY',
          label: `Unblock ${room.card.name}`,
          detail:
            activeId === 'ABBA' && !hasTeammateHere
              ? 'Abba’s Solo Cleanup flips this Red Blocked room straight back to Clear alone!'
              : 'With 2+ Helpers here, flip this Red Blocked room straight back to Clear.',
          bonusTag: activeId === 'ABBA' && !hasTeammateHere ? 'Solo Cleanup' : undefined,
        });
      } else {
        disabledHints.push({
          label: `Unblock ${room.card.name}`,
          reason: 'Needs 2+ Helpers in this room (or Abba alone with Solo Cleanup).',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Team Chores (1 Action — 2+ Helpers in matching Clear room, or Cluttered w/ Nael)
  // -------------------------------------------------------------------------
  if (hasAP) {
    const matchingTeamChores = state.choreRow.filter(
      (c) => c.type === 'TEAM_CHORE' && c.zone === roomZone,
    );
    for (const chore of matchingTeamChores) {
      if (hasTeammateHere && canTeamChoreHere) {
        legal.push({
          id: `TEAM_${chore.id}`,
          type: 'TEAM_CHORE',
          category: 'CHORE',
          choreId: chore.id,
          cardImage: chore.frontImage,
          label: `Team Chore: ${chore.title}`,
          detail: naelBoost
            ? 'Nael’s Learning Tower Power! lets you finish this Team Chore even while Cluttered!'
            : 'Finish this Team Chore together with your teammate (1 Action)!',
          bonusTag: naelBoost ? 'Learning Tower Power!' : undefined,
        });
      } else if (!hasTeammateHere) {
        disabledHints.push({
          label: `Team Chore: ${chore.title}`,
          reason: 'Needs at least 1 teammate in this room.',
        });
      } else {
        disabledHints.push({
          label: `Team Chore: ${chore.title}`,
          reason: isBlocked
            ? 'Cannot finish Chores in a Red Blocked room — Unblock it first!'
            : 'Room is Cluttered — Tidy it first, or team up with Nael here.',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Errands: Pick Up & Deliver (1 Action, OR FREE once/turn for Mommy!)
  // -------------------------------------------------------------------------
  const canTakeErrandAction = hasAP || mommyHasFreeErrand;
  if (canTakeErrandAction) {
    const matchingPickupErrands = state.choreRow.filter(
      (c) => c.type === 'ERRAND' && c.zone === roomZone,
    );
    for (const errand of matchingPickupErrands) {
      if (canErrandHere) {
        legal.push({
          id: `PICKUP_${errand.id}`,
          type: 'PICK_UP_ERRAND',
          category: 'ERRAND',
          isFree: mommyHasFreeErrand,
          choreId: errand.id,
          cardImage: errand.frontImage,
          label: `Pick Up: ${errand.title}`,
          detail: mommyHasFreeErrand
            ? `FREE via Errand Express! Carry from ${ZONE_META[errand.zone].shortName} → deliver to ${ZONE_META[errand.endZone!].shortName}.`
            : `Carry from ${ZONE_META[errand.zone].shortName} → deliver to ${ZONE_META[errand.endZone!].shortName} (1 Action).`,
          bonusTag: mommyHasFreeErrand
            ? 'FREE · Errand Express!'
            : isCluttered && activeId === 'MOMMY'
              ? 'Errand Express'
              : undefined,
        });
      } else if (hasAP) {
        disabledHints.push({
          label: `Pick Up: ${errand.title}`,
          reason: isBlocked
            ? 'Cannot Pick Up Errands in a Red Blocked room.'
            : 'Room is Cluttered — Tidy it first (or Mommy can Pick Up in Cluttered rooms!).',
        });
      }
    }

    for (const carried of activeHelper.carriedErrands) {
      if (carried.endZone !== roomZone) continue;
      if (canErrandHere) {
        legal.push({
          id: `DELIVER_${carried.id}`,
          type: 'DELIVER_ERRAND',
          category: 'ERRAND',
          isFree: mommyHasFreeErrand,
          choreId: carried.id,
          cardImage: carried.frontImage,
          label: `Deliver: ${carried.title}`,
          detail: mommyHasFreeErrand
            ? 'FREE via Errand Express! Move this Errand straight to the Done Pile!'
            : 'Move this Errand to the Done Pile (1 Action)!',
          bonusTag: mommyHasFreeErrand
            ? 'FREE · Errand Express!'
            : isCluttered && activeId === 'MOMMY'
              ? 'Errand Express'
              : undefined,
        });
      } else if (hasAP) {
        disabledHints.push({
          label: `Deliver: ${carried.title}`,
          reason: isBlocked
            ? 'Cannot Deliver Errands in a Red Blocked room.'
            : 'Room is Cluttered — Tidy it first (or Mommy can Deliver in Cluttered rooms!).',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. Free Handoff (0 Actions — Anytime on Your Turn, Any Room!)
  // -------------------------------------------------------------------------
  if (hasTeammateHere) {
    for (const teammateId of teammatesHere) {
      // Give carried Errand to teammate
      for (const carried of activeHelper.carriedErrands) {
        legal.push({
          id: `GIVE_${carried.id}_TO_${teammateId}`,
          type: 'GIVE_ERRAND',
          category: 'HANDOFF',
          isFree: true,
          choreId: carried.id,
          targetHelperId: teammateId,
          cardImage: carried.frontImage,
          label: `Give “${carried.title}” → ${getHelperName(teammateId)}`,
          detail: `Free Handoff (0 Actions, works in any room). Deliver to ${ZONE_META[carried.endZone!].shortName}.`,
          bonusTag: 'FREE Handoff',
        });
      }
      // Take carried Errand from teammate
      for (const carried of state.helpers[teammateId].carriedErrands) {
        legal.push({
          id: `TAKE_${carried.id}_FROM_${teammateId}`,
          type: 'TAKE_ERRAND',
          category: 'HANDOFF',
          isFree: true,
          choreId: carried.id,
          targetHelperId: teammateId,
          cardImage: carried.frontImage,
          label: `Take “${carried.title}” ← ${getHelperName(teammateId)}`,
          detail: `Free Handoff (0 Actions, works in any room). Deliver to ${ZONE_META[carried.endZone!].shortName}.`,
          bonusTag: 'FREE Handoff',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Use Household Tool from Family Toolbox (1 Action — Any Room!)
  // -------------------------------------------------------------------------
  if (hasAP) {
    const seenToolKinds = new Set<ToolKind>();
    const hasAnyCluttered = state.rooms.some((r) => r.state === 'CLUTTERED');
    const unflippedClockCount = state.clockRow.filter((c) => !c.flipped).length;
    const summonableHelpers = SEAT_ORDER.filter(
      (id) => id !== activeId && state.helpers[id].slotIndex !== slot,
    );

    for (const tool of state.readyTools) {
      if (seenToolKinds.has(tool.kind)) continue;
      seenToolKinds.add(tool.kind);

      if (tool.kind === 'ICE_COFFEE') {
        if (hasAnyCluttered) {
          legal.push({
            id: `USE_${tool.id}`,
            type: 'USE_ICE_COFFEE',
            category: 'TOOL',
            toolId: tool.id,
            cardImage: tool.frontImage,
            label: 'Use: Ice Coffee Boost',
            detail: 'Turn 1 or 2 Cluttered rooms anywhere back to Clear, then put in Event Discard.',
          });
        } else {
          disabledHints.push({
            label: 'Use: Ice Coffee Boost',
            reason: 'There are currently no Cluttered rooms on the board (does not fix Blocked).',
          });
        }
      } else if (tool.kind === 'SNACK_SUMMONS') {
        if (summonableHelpers.length > 0) {
          legal.push({
            id: `USE_${tool.id}`,
            type: 'USE_SNACK_SUMMONS',
            category: 'TOOL',
            toolId: tool.id,
            cardImage: tool.frontImage,
            label: 'Use: Strategic Snack Summons',
            detail: 'Pull any teammate from anywhere straight into your room, then put in Event Discard.',
          });
        } else {
          disabledHints.push({
            label: 'Use: Strategic Snack Summons',
            reason: 'Every teammate is already in your room!',
          });
        }
      } else if (tool.kind === 'EARLY_PREP') {
        if (state.clockShields.length < unflippedClockCount) {
          legal.push({
            id: `USE_${tool.id}`,
            type: 'USE_EARLY_PREP',
            category: 'TOOL',
            toolId: tool.id,
            cardImage: tool.frontImage,
            label: 'Use: Cousin Aviel Drops By!',
            detail: 'Place shield on the next unshielded Clock card (blocks 1 Clock flip, then boxed).',
            bonusTag: '+1 Round Shield',
          });
        } else {
          disabledHints.push({
            label: 'Use: Cousin Aviel Drops By!',
            reason: 'Every remaining face-down Clock card is already shielded!',
          });
        }
      }
    }
  }

  return { legal, disabledHints };
}
