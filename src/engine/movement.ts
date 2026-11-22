import {
  getDiagonalNeighbors,
  getHelpersInSlot,
  getHelperName,
  rowColToSlot,
  slotToRowCol,
} from './helpers';
import { GameState, LegalMove } from './types';

/**
 * Step 1: Move (Optional) — Page 6 of the Small Booklet:
 * - Stay put
 * - Hallway Slide: 1 or 2 rooms straight (up/down/left/right).
 *   * May pass through a full Clear room (2 Helpers).
 *   * Must stop in the 1st Cluttered or Blocked room you enter (can't enter if it already has 2 Helpers).
 * - Buddy-Hop: Jump straight into any room holding 1 teammate (Ready or Resting, even Cluttered or Blocked).
 * - Turbo Crawl (Mekimi only): Move 1 room diagonally into any room with fewer than 2 Helpers.
 * - Any Move may leave a Cluttered or Blocked room.
 */
export function getLegalMoves(state: GameState): LegalMove[] {
  const activeId = state.activeHelperId;
  const startSlot = state.helpers[activeId].slotIndex;
  const { row, col } = slotToRowCol(startSlot);

  const moveMap = new Map<number, LegalMove>();

  // Stay
  moveMap.set(startSlot, {
    targetSlot: startSlot,
    kind: 'STAY',
    label: 'Stay Here',
    reason: `Remain in ${state.rooms[startSlot].card.name}`,
  });

  // Hallway Slide: 4 orthogonal directions, up to 2 steps
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (const [dr, dc] of dirs) {
    for (let dist = 1; dist <= 2; dist += 1) {
      const r = row + dr * dist;
      const c = col + dc * dist;
      if (r < 0 || r >= 3 || c < 0 || c >= 3) break;

      const targetSlot = rowColToSlot(r, c);
      const room = state.rooms[targetSlot];
      const occupantCount = getHelpersInSlot(state, targetSlot).length;

      if (occupantCount < 2) {
        if (!moveMap.has(targetSlot)) {
          moveMap.set(targetSlot, {
            targetSlot,
            kind: 'HALLWAY_SLIDE',
            label: dist === 1 ? 'Hallway Slide (1)' : 'Hallway Slide (2)',
            reason:
              dist === 1
                ? `Slide 1 room into ${room.card.name}`
                : `Slide 2 rooms straight into ${room.card.name}`,
          });
        }
      }

      // Must stop in the 1st Cluttered or Blocked room entered (even if full, cannot pass through it!)
      if (room.state === 'CLUTTERED' || room.state === 'BLOCKED') {
        break;
      }
      // Note: Clear rooms (even with 2 Helpers) CAN be passed through to step 2!
    }
  }

  // Buddy-Hop: Jump into ANY room currently holding exactly 1 teammate (Ready or Resting)
  for (let slot = 0; slot < 9; slot += 1) {
    if (slot === startSlot) continue;
    const occupants = getHelpersInSlot(state, slot);
    if (occupants.length === 1) {
      const teammateName = getHelperName(occupants[0]);
      if (!moveMap.has(slot)) {
        moveMap.set(slot, {
          targetSlot: slot,
          kind: 'BUDDY_HOP',
          label: `Buddy-Hop to ${teammateName}`,
          reason: `Jump directly to ${teammateName} in ${state.rooms[slot].card.name}`,
        });
      }
    }
  }

  // Turbo Crawl (Mekimi only): 1 room diagonally into any room with fewer than 2 Helpers
  if (activeId === 'MEKIMI') {
    for (const diagSlot of getDiagonalNeighbors(startSlot)) {
      const occupantCount = getHelpersInSlot(state, diagSlot).length;
      if (occupantCount < 2 && !moveMap.has(diagSlot)) {
        moveMap.set(diagSlot, {
          targetSlot: diagSlot,
          kind: 'TURBO_CRAWL',
          label: 'Turbo Crawl (Diagonal)',
          reason: `Mekimi crawls diagonally into ${state.rooms[diagSlot].card.name}`,
        });
      }
    }
  }

  return Array.from(moveMap.values());
}
