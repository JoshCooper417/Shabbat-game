import { HELPER_DEFS, ZONE_META } from '../data/cards';
import {
  getHelpersInSlot,
  getHelperName,
  getOrthogonalNeighbors,
  getTeammatesInSlot,
  hasNaelClutteredBoost,
  hasTeammateInRowColOrRoom,
} from './helpers';
import { ActionCandidate, DisabledActionHint, GameState, ToolKind } from './types';

export interface ActionEvaluation {
  legal: ActionCandidate[];
  disabledHints: DisabledActionHint[];
}

/**
 * Evaluates all legal Step 2 actions and contextual "Why can't I do other actions here?" hints.
 * Matches Small Booklet Pages 7–9 & 12–13 exactly.
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
  const canTuckedOrComboHere = isClear || naelBoost;
  const carryLimit = HELPER_DEFS[activeId].carryLimit;

  // -------------------------------------------------------------------------
  // Action 1: Tidy Room
  // -------------------------------------------------------------------------
  if (isCluttered) {
    const clutteredNeighbors = getOrthogonalNeighbors(slot).filter(
      (n) => state.rooms[n].state === 'CLUTTERED',
    );
    const hasBonus = hasTeammateHere && clutteredNeighbors.length > 0;
    legal.push({
      id: 'TIDY_CLUTTERED',
      type: 'TIDY_CLUTTERED',
      category: 'TIDY',
      label: `Tidy ${room.card.name}`,
      detail: hasBonus
        ? 'Turn this room Clear + choose up to 1 next-door Cluttered room to Clear too!'
        : 'Turn this Cluttered room back to Clear.',
      bonusTag: hasBonus ? 'Team Bonus: +1 Next-Door' : undefined,
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
            : 'With 2 Helpers here, flip this Red Blocked room straight back to Clear.',
        bonusTag: activeId === 'ABBA' && !hasTeammateHere ? 'Solo Cleanup' : undefined,
      });
    } else {
      disabledHints.push({
        label: `Unblock ${room.card.name}`,
        reason: 'Needs 2 Helpers in this room (or Abba alone with Solo Cleanup).',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Action 2: Do Chore (Start Room Chore, Finish Tucked Chore, Restore Order)
  // -------------------------------------------------------------------------
  const matchingRoomChores = state.choreRow.filter(
    (c) => c.type === 'ROOM_CHORE' && c.zone === roomZone,
  );
  for (const chore of matchingRoomChores) {
    if (isClear && room.tuckedChore === null) {
      legal.push({
        id: `START_${chore.id}`,
        type: 'START_ROOM_CHORE',
        category: 'CHORE',
        choreId: chore.id,
        cardImage: chore.frontImage,
        label: `Start: ${chore.title}`,
        detail: `Tuck under ${room.card.name} (Step 1 of 2; finish later via Room Relay).`,
      });
    } else if (!isClear) {
      disabledHints.push({
        label: `Start: ${chore.title}`,
        reason: `Starting a Room Chore requires a Clear ${ZONE_META[roomZone].shortName} room.`,
      });
    } else if (room.tuckedChore !== null) {
      disabledHints.push({
        label: `Start: ${chore.title}`,
        reason: `${room.card.name} already has a tucked Chore (max 1 per room).`,
      });
    }
  }

  if (room.tuckedChore) {
    const tucked = room.tuckedChore;
    const hasRelay = hasTeammateInRowColOrRoom(state, slot, activeId);
    if (canTuckedOrComboHere && hasRelay) {
      legal.push({
        id: `FINISH_TUCKED_${tucked.id}`,
        type: 'FINISH_TUCKED_CHORE',
        category: 'CHORE',
        choreId: tucked.id,
        cardImage: tucked.frontImage,
        label: `Finish Tucked: ${tucked.title}`,
        detail: naelBoost
          ? 'Nael’s Learning Tower Power! lets you finish this tucked Chore even while Cluttered!'
          : hasTeammateHere
            ? 'Move this tucked Room Chore to the Done Pile.'
            : 'Room Relay: teammate in your row or column lets you finish this tucked Chore!',
        bonusTag: naelBoost ? 'Learning Tower Power!' : 'Room Relay',
      });
    } else if (!canTuckedOrComboHere) {
      disabledHints.push({
        label: `Finish Tucked: ${tucked.title}`,
        reason: isBlocked
          ? 'Cannot finish Chores in a Red Blocked room.'
          : 'Room is Cluttered — Tidy it first, or team up with Nael here.',
      });
    } else {
      disabledHints.push({
        label: `Finish Tucked: ${tucked.title}`,
        reason: 'Room Relay needs at least 1 teammate in your same row, column, or room.',
      });
    }
  }

  const matchingRestoreOrders = state.choreRow.filter(
    (c) => c.type === 'RESTORE_ORDER' && c.zone === roomZone,
  );
  const orthogonalNeighbors = getOrthogonalNeighbors(slot);
  const allNeighborsClear = orthogonalNeighbors.every((n) => state.rooms[n].state === 'CLEAR');
  for (const chore of matchingRestoreOrders) {
    if (isClear && allNeighborsClear) {
      legal.push({
        id: `RESTORE_${chore.id}`,
        type: 'RESTORE_ORDER',
        category: 'CHORE',
        choreId: chore.id,
        cardImage: chore.frontImage,
        label: `Restore Order: ${chore.title}`,
        detail: `${room.card.name} and every next-door room are Clear — finish immediately!`,
      });
    } else {
      const messyNeighbors = orthogonalNeighbors
        .filter((n) => state.rooms[n].state !== 'CLEAR')
        .map((n) => state.rooms[n].card.name);
      disabledHints.push({
        label: `Restore Order: ${chore.title}`,
        reason: !isClear
          ? `${room.card.name} must be Clear (and every next-door room Clear).`
          : `Next-door room(s) still not Clear: ${messyNeighbors.join(', ')}.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Action 3: Run Errand (Pick Up, Deliver, Pass)
  // -------------------------------------------------------------------------
  const matchingPickupErrands = state.choreRow.filter(
    (c) => c.type === 'ERRAND' && c.zone === roomZone,
  );
  for (const errand of matchingPickupErrands) {
    if (canErrandHere && activeHelper.carriedErrands.length < carryLimit) {
      legal.push({
        id: `PICKUP_${errand.id}`,
        type: 'PICK_UP_ERRAND',
        category: 'ERRAND',
        choreId: errand.id,
        cardImage: errand.frontImage,
        label: `Pick Up: ${errand.title}`,
        detail: `Carry from ${ZONE_META[errand.zone].shortName} → deliver to ${ZONE_META[errand.endZone!].shortName}.`,
        bonusTag: isCluttered && activeId === 'MOMMY' ? 'Errand Express' : undefined,
      });
    } else if (!canErrandHere) {
      disabledHints.push({
        label: `Pick Up: ${errand.title}`,
        reason: isBlocked
          ? 'Cannot Pick Up Errands in a Blocked room.'
          : 'Room is Cluttered (only Mommy can Pick Up in Cluttered rooms on her turn).',
      });
    } else {
      disabledHints.push({
        label: `Pick Up: ${errand.title}`,
        reason: `${getHelperName(activeId)} is already at carry limit (${carryLimit} Errand${carryLimit > 1 ? 's' : ''}).`,
      });
    }
  }

  for (const carried of activeHelper.carriedErrands) {
    if (carried.endZone === roomZone) {
      if (canErrandHere) {
        const canBonusRecharge = state.readyTools.length < 3 && state.toolDiscard.length > 0;
        legal.push({
          id: `DELIVER_${carried.id}`,
          type: 'DELIVER_ERRAND',
          category: 'ERRAND',
          choreId: carried.id,
          cardImage: carried.frontImage,
          label: `Deliver: ${carried.title}`,
          detail: canBonusRecharge
            ? 'Finish this Errand + return 1 used Tool from Tool Discard to Ready!'
            : 'Move this Errand to the Done Pile!',
          bonusTag:
            isCluttered && activeId === 'MOMMY'
              ? canBonusRecharge
                ? 'Errand Express · +1 Tool'
                : 'Errand Express'
              : canBonusRecharge
                ? 'Bonus: +1 Used Tool'
                : undefined,
        });
      } else {
        disabledHints.push({
          label: `Deliver: ${carried.title}`,
          reason: isBlocked
            ? 'Cannot Deliver Errands in a Blocked room.'
            : 'Room is Cluttered (only Mommy can Deliver in Cluttered rooms on her turn).',
        });
      }
    }
  }

  // Pass Errand (works in ANY room — even Cluttered or Blocked!)
  if (activeHelper.carriedErrands.length > 0 && hasTeammateHere) {
    for (const teammateId of teammatesHere) {
      const teammate = state.helpers[teammateId];
      const teammateLimit = HELPER_DEFS[teammateId].carryLimit;
      if (teammate.carriedErrands.length >= teammateLimit) {
        disabledHints.push({
          label: `Pass Errand to ${getHelperName(teammateId)}`,
          reason: `${getHelperName(teammateId)} is already carrying the max (${teammateLimit}).`,
        });
        continue;
      }
      for (const carried of activeHelper.carriedErrands) {
        legal.push({
          id: `PASS_${carried.id}_TO_${teammateId}`,
          type: 'PASS_ERRAND',
          category: 'ERRAND',
          choreId: carried.id,
          targetHelperId: teammateId,
          cardImage: carried.frontImage,
          label: `Pass “${carried.title}” → ${getHelperName(teammateId)}`,
          detail: `Hand this carried Errand to ${getHelperName(teammateId)} (works in any room).`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Action 4: Team Combo (Team Pair & 1-Step Room Chore from Row)
  // -------------------------------------------------------------------------
  const matchingTeamPairs = state.choreRow.filter(
    (c) => c.type === 'TEAM_PAIR' && c.zone === roomZone,
  );
  for (const pair of matchingTeamPairs) {
    if (hasTeammateHere && canTuckedOrComboHere) {
      const canBonusRecharge = state.readyTools.length < 3 && state.toolDiscard.length > 0;
      legal.push({
        id: `PAIR_${pair.id}`,
        type: 'TEAM_PAIR',
        category: 'COMBO',
        choreId: pair.id,
        cardImage: pair.frontImage,
        label: `Team Pair: ${pair.title}`,
        detail: canBonusRecharge
          ? 'Finish together with your teammate + return 1 used Tool to Ready!'
          : 'Finish this Team Pair together with your teammate!',
        bonusTag: naelBoost
          ? canBonusRecharge
            ? 'Learning Tower · +1 Tool'
            : 'Learning Tower Power!'
          : canBonusRecharge
            ? 'Bonus: +1 Used Tool'
            : undefined,
      });
    } else if (!hasTeammateHere) {
      disabledHints.push({
        label: `Team Pair: ${pair.title}`,
        reason: 'Needs a teammate in the same room.',
      });
    } else {
      disabledHints.push({
        label: `Team Pair: ${pair.title}`,
        reason: isBlocked
          ? 'Cannot finish Chores in a Blocked room.'
          : 'Room is Cluttered — Tidy first, or team up with Nael here.',
      });
    }
  }

  for (const chore of matchingRoomChores) {
    if (hasTeammateHere && canTuckedOrComboHere) {
      legal.push({
        id: `COMBO_ROW_${chore.id}`,
        type: 'COMBO_ROOM_CHORE_ROW',
        category: 'COMBO',
        choreId: chore.id,
        cardImage: chore.frontImage,
        label: `1-Step Combo: ${chore.title}`,
        detail: 'Finish straight from the Chore Row with your teammate in 1 step (no Tool bonus).',
        bonusTag: naelBoost ? 'Learning Tower Power!' : '1-Step Combo',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Action 5: Use OR Recharge a Tool (Works in ANY room!)
  // -------------------------------------------------------------------------
  const seenToolKinds = new Set<ToolKind>();
  const hasAnyCluttered = state.rooms.some((r) => r.state === 'CLUTTERED');
  const roomOccupantCount = getHelpersInSlot(state, slot).length;

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
          detail: 'Turn 1 or 2 Cluttered rooms anywhere back to Clear, then discard Tool.',
        });
      } else {
        disabledHints.push({
          label: 'Use: Ice Coffee Boost',
          reason: 'There are currently no Cluttered rooms on the board (does not fix Blocked).',
        });
      }
    } else if (tool.kind === 'SNACK_SUMMONS') {
      if (roomOccupantCount < 2) {
        legal.push({
          id: `USE_${tool.id}`,
          type: 'USE_SNACK_SUMMONS',
          category: 'TOOL',
          toolId: tool.id,
          cardImage: tool.frontImage,
          label: 'Use: Strategic Snack Summons',
          detail: 'Pull any teammate from anywhere into your room, then discard Tool.',
        });
      } else {
        disabledHints.push({
          label: 'Use: Strategic Snack Summons',
          reason: 'Your room already has 2 Helpers (room limit is 2).',
        });
      }
    } else if (tool.kind === 'EARLY_PREP') {
      if (state.clockShield === null) {
        legal.push({
          id: `USE_${tool.id}`,
          type: 'USE_EARLY_PREP',
          category: 'TOOL',
          toolId: tool.id,
          cardImage: tool.frontImage,
          label: 'Use: Early Prep Paid Off!',
          detail: 'Place shield on the next face-down Clock card (blocks 1 Clock flip, then boxed).',
          bonusTag: '+1 Round Shield',
        });
      } else {
        disabledHints.push({
          label: 'Use: Early Prep Paid Off!',
          reason: 'The Shabbat Clock already has a shield on it (max 1 shield at a time).',
        });
      }
    }
  }

  // Recharge Action (with teammate in same room)
  if (state.toolDiscard.length > 0) {
    if (hasTeammateHere && state.readyTools.length < 3) {
      const maxReturn = Math.min(
        activeId === 'MEKIMI' ? 2 : 1,
        3 - state.readyTools.length,
        state.toolDiscard.length,
      );
      legal.push({
        id: 'RECHARGE_TOOL',
        type: 'RECHARGE_TOOL',
        category: 'TOOL',
        label:
          activeId === 'MEKIMI' && maxReturn === 2
            ? 'Recharge up to 2 Used Tools'
            : 'Recharge 1 Used Tool',
        detail:
          activeId === 'MEKIMI'
            ? 'Mekimi’s Big Smile Reset returns up to 2 used Tools from Tool Discard to Ready!'
            : 'With a teammate here, return 1 used Tool of choice from Tool Discard to Ready.',
        bonusTag: activeId === 'MEKIMI' ? 'Big Smile Reset' : undefined,
      });
    } else if (!hasTeammateHere) {
      disabledHints.push({
        label: 'Recharge Used Tool',
        reason: 'Needs a teammate in your room.',
      });
    } else if (state.readyTools.length >= 3) {
      disabledHints.push({
        label: 'Recharge Used Tool',
        reason: 'Ready Tool Row is already full (3/3 max).',
      });
    }
  }

  return { legal, disabledHints };
}
