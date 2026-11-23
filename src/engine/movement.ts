import { getOrthogonalNeighbors } from './helpers';
import { GameState, LegalMove } from './types';

/**
 * D2* Move Action (1 Action):
 * - Walk: Move 1 room straight up, down, left, or right (not diagonal).
 *   Cluttered and Blocked rooms never trap you, and any number of Helpers may share a room!
 * - Mekimi's Turbo Crawl: Whenever Mekimi spends 1 Action to Move, crawl straight into ANY room!
 */
export function getLegalMoves(state: GameState): LegalMove[] {
  if (state.phase !== 'TURN' || state.actionsRemaining <= 0) return [];

  const activeId = state.activeHelperId;
  const startSlot = state.helpers[activeId].slotIndex;
  const orthogonalSet = new Set(getOrthogonalNeighbors(startSlot));
  const moves: LegalMove[] = [];

  if (activeId === 'MEKIMI') {
    for (let slot = 0; slot < 9; slot += 1) {
      if (slot === startSlot) continue;
      const isOrtho = orthogonalSet.has(slot);
      moves.push({
        targetSlot: slot,
        kind: isOrtho ? 'WALK' : 'TURBO_CRAWL',
        label: isOrtho ? 'Walk (1 Action)' : 'Turbo Crawl! (1 Action)',
        reason: isOrtho
          ? `Walk into ${state.rooms[slot].card.name}`
          : `Mekimi crawls straight across to ${state.rooms[slot].card.name}!`,
      });
    }
    return moves;
  }

  for (const neighbor of orthogonalSet) {
    moves.push({
      targetSlot: neighbor,
      kind: 'WALK',
      label: 'Walk (1 Action)',
      reason: `Walk 1 room into ${state.rooms[neighbor].card.name}`,
    });
  }

  return moves;
}
