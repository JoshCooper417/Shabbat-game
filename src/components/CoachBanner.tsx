import { HELPER_DEFS } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { GameState, LegalMove } from '../engine/types';

interface CoachBannerProps {
  state: GameState;
  legalMoves: LegalMove[];
}

export function CoachBanner({ state, legalMoves }: CoachBannerProps) {
  const active = HELPER_DEFS[state.activeHelperId];
  const isFinalTurnOfRound = state.turnInRound === 4;

  let heading = 'Live Turn Coach';
  let summary = '';
  const tips: string[] = [];

  if (state.phase === 'CHOOSE_HELPER') {
    heading = `Group ${state.activeGroup} — Pick Your Helper`;
    summary = `Choose which Ready Helper in Group ${state.activeGroup} goes next. Both Helpers in each group will act once this round.`;
  } else if (state.phase === 'MOVE') {
    heading = `Step 1: Where should ${active.name} go?`;
    summary = `Click a highlighted room on the 3×3 House (or Stay in ${state.rooms[state.helpers[state.activeHelperId].slotIndex].card.name}).`;

    // Peek at the best opportunities reachable from each legal move!
    const opportunities: string[] = [];
    for (const move of legalMoves) {
      const simulated: GameState = {
        ...state,
        phase: 'ACT',
        helpers: {
          ...state.helpers,
          [state.activeHelperId]: {
            ...state.helpers[state.activeHelperId],
            slotIndex: move.targetSlot,
          },
        },
      };
      const { legal } = getActionEvaluation(simulated);
      const bigHit = legal.find(
        (a) =>
          a.type === 'DELIVER_ERRAND' ||
          a.type === 'TEAM_PAIR' ||
          a.type === 'RESTORE_ORDER' ||
          a.type === 'FINISH_TUCKED_CHORE' ||
          a.type === 'COMBO_ROOM_CHORE_ROW' ||
          a.type === 'TIDY_BLOCKED',
      );
      if (bigHit) {
        const roomName = state.rooms[move.targetSlot].card.name;
        opportunities.push(
          `${move.kind === 'STAY' ? `Stay in ${roomName}` : `${move.label} → ${roomName}`}: ${bigHit.label}`,
        );
      }
      if (opportunities.length >= 3) break;
    }

    if (opportunities.length > 0) {
      tips.push(...opportunities);
    } else {
      tips.push('No immediate Chore finish in range — consider Tidying a Cluttered room, Picking Up an Errand, or starting a Room Chore!');
    }

    if (state.activeHelperId === 'MOMMY') {
      tips.push('Remember Mommy’s Errand Express: she can Pick Up or Deliver Errands even in Cluttered rooms!');
    } else if (state.activeHelperId === 'MEKIMI') {
      tips.push('Remember Mekimi’s Turbo Crawl: Mekimi can jump 1 room diagonally!');
    }
  } else if (state.phase === 'ACT') {
    const { legal } = getActionEvaluation(state);
    heading = `Step 2: Choose 1 Action for ${active.name} (Optional)`;
    summary =
      legal.length > 0
        ? `Pick 1 legal action below, or Skip Step 2 freely.`
        : `No legal actions right here — click “Skip Step 2” to move to Step 3 (Event Flip).`;

    if (isFinalTurnOfRound && state.clockShield === null) {
      const hasEarlyPrep = state.readyTools.some((t) => t.kind === 'EARLY_PREP');
      if (hasEarlyPrep) {
        tips.push('Turn 4 of 4! Playing Early Prep Paid Off! right now will block tonight’s Clock flip!');
      } else {
        tips.push('Turn 4 of 4: After this turn’s Event flip, the Shabbat Clock will flip 1 card.');
      }
    }
    if (state.choreRow.length === 1 && state.arrivalPile.length > 0) {
      tips.push('Tip: Emptying the last card from the Chore Row immediately flips a new Arrival Chore face-up!');
    }
  } else if (state.phase === 'SUBSTEP') {
    heading = 'Finish Your Action Choice';
    summary = state.lastActionNote ?? 'Complete the highlighted selection to continue.';
  } else if (state.phase === 'EVENT_READY') {
    heading = 'Step 3: Flip 1 Friday Event Card';
    summary = `Click “Flip Event Card” to reveal the top card (${state.eventDeck.length} left in Event Deck).`;
    if (isFinalTurnOfRound) {
      tips.push(
        state.clockShield
          ? 'End of Round coming up — Early Prep Paid Off! is ready to block the Clock flip!'
          : 'End of Round coming up: after this Event, all 4 Helpers will Refresh and 1 Clock card will flip.',
      );
    }
  } else if (state.phase === 'EVENT_RESOLVED') {
    heading = isFinalTurnOfRound ? 'End of Round Ready' : `Rest ${active.name} & Continue`;
    summary = isFinalTurnOfRound
      ? 'Review the Event above, then click to Rest, flip the Shabbat Clock, Refresh all 4 Helpers, and reveal 1 Arrival Chore.'
      : `Review the Event above, then Rest ${active.name} (Resting Helpers still help teammates!).`;
  }

  return (
    <div className="coach-card" aria-live="polite">
      <div className="coach-title">{heading}</div>
      <p className="coach-text">{summary}</p>
      {tips.length > 0 && (
        <ul className="coach-tips-list">
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
