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

  const isFirstTurnEver = state.round === 1 && state.turnInRound === 1;

  if (state.phase === 'CHOOSE_HELPER') {
    heading = `Group ${state.activeGroup} — Pick Your Helper`;
    summary = `Choose which Ready Helper in Group ${state.activeGroup} goes next. Both Helpers in each group act once per round.`;
  } else if (state.phase === 'MOVE') {
    heading = isFirstTurnEver
      ? `Welcome! Step 1: Move ${active.name}`
      : `Step 1: Where should ${active.name} move?`;
    summary = isFirstTurnEver
      ? `Work together to finish all Chores before Shabbat Begins! flips on the Clock above. Select any blue-outlined room to move ${active.name} (slide 1–2 straight or Buddy-Hop to a teammate), or Stay.`
      : `Select any blue-outlined room on the House board (or Stay in ${state.rooms[state.helpers[state.activeHelperId].slotIndex].card.name}), or use a move button below.`;

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
      tips.push(
        'No immediate Chore finish in range — move toward a matching Chore zone, a tilted Cluttered room to Tidy, or a teammate for a Team Combo.',
      );
    }

    if (state.activeHelperId === 'MOMMY') {
      tips.push(
        'Mommy’s Errand Express: she can Pick Up or Deliver Errands even in tilted Cluttered rooms!',
      );
    } else if (state.activeHelperId === 'MEKIMI') {
      tips.push('Mekimi’s Turbo Crawl: Mekimi can also jump 1 room diagonally!');
    }
  } else if (state.phase === 'ACT') {
    const { legal } = getActionEvaluation(state);
    heading = `Step 2: Choose 1 Action for ${active.name} (Optional)`;
    summary =
      legal.length > 0
        ? 'Pick 1 action below, or click any green-outlined “Play / Use” card on the table.'
        : 'No legal actions available in this room — click Continue to Event below.';

    if (isFinalTurnOfRound && state.clockShield === null) {
      const hasEarlyPrep = state.readyTools.some((t) => t.kind === 'EARLY_PREP');
      if (hasEarlyPrep) {
        tips.push(
          'Turn 4 of 4! Playing Cousin Aviel Drops By! right now will block tonight’s Clock flip!',
        );
      } else {
        tips.push('Turn 4 of 4: After this turn’s Event flip, the Shabbat Clock will flip 1 card.');
      }
    }
    if (state.choreRow.length === 1 && state.arrivalPile.length > 0) {
      tips.push(
        'Tip: Emptying the last card from the Chore Row immediately flips a new Arrival Chore face-up!',
      );
    }
  } else if (state.phase === 'SUBSTEP' && state.pendingSubstep) {
    const sub = state.pendingSubstep;
    if (sub.kind === 'BACKUP_TOOL_PICK') {
      heading = 'Step 3: Unlock a Backup Tool!';
      summary = `A room flipped Red Blocked — pick ${sub.remainingPicks} Backup Tool${
        sub.remainingPicks > 1 ? 's' : ''
      } below to add to your Ready Tools!`;
    } else if (sub.kind === 'ICE_COFFEE_PICK') {
      heading = 'Ice Coffee Boost — Select 1 or 2 Cluttered Rooms';
      summary = 'Select 1 or 2 tilted Cluttered rooms on the board (or buttons below), then confirm.';
    } else if (sub.kind === 'SNACK_SUMMONS_PICK') {
      heading = 'Strategic Snack Summons — Pick a Teammate';
      summary = `Choose any teammate below to move straight into ${
        state.rooms[state.helpers[state.activeHelperId].slotIndex].card.name
      }.`;
    } else if (sub.kind === 'TIDY_NEIGHBOR_BONUS') {
      heading = 'Team Tidy Bonus (Optional)';
      summary =
        'Because a teammate is in your room, you may also Clear 1 next-door Cluttered room marked “+ Clear Bonus”.';
    } else if (sub.kind === 'RECHARGE_PICK') {
      heading =
        sub.source === 'RECHARGE_ACTION'
          ? 'Recharge Used Tool'
          : 'Bonus: Return 1 Used Tool to Ready!';
      summary = `Select up to ${sub.maxCount} Tool${sub.maxCount > 1 ? 's' : ''} from Tool Discard below and confirm.`;
    }
  } else if (state.phase === 'EVENT_READY') {
    heading = 'Step 3: Flip 1 Friday Event Card';
    summary = `Every turn ends with 1 Event card (either a bonus Tool or a Slow-Down that clutters a room). Click the stacked Friday Events Deck below (${state.eventDeck.length} left).`;
    if (isFinalTurnOfRound) {
      tips.push(
        state.clockShield
          ? 'End of Round next — Cousin Aviel Drops By! is ready to block the Clock flip!'
          : 'End of Round next: after this Event, all 4 Helpers will refresh and 1 Clock card will flip.',
      );
    }
  } else if (state.phase === 'EVENT_RESOLVED') {
    heading = isFinalTurnOfRound ? 'End of Round Ready' : `Rest ${active.name} & Next Turn`;
    summary = isFinalTurnOfRound
      ? 'Review the Event result below, then click to Rest, flip the Shabbat Clock, refresh all 4 Helpers, and reveal 1 Arrival Chore.'
      : `Review the Event result below, then Rest ${active.name}. (Resting just means ${active.name} already went this round — Resting teammates still help with combos & powers!)`;
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
