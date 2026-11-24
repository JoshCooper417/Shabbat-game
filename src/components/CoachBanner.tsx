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
  const isFirstActionEver =
    state.round === 1 && state.turnInRound === 1 && state.actionsRemaining === 2;

  let heading = 'Live Turn Coach';
  let summary = '';
  const tips: string[] = [];

  if (state.phase === 'TURN') {
    const { legal } = getActionEvaluation(state);

    if (state.actionsRemaining === 0) {
      heading = `Free Bonus Window for ${active.name}`;
      summary =
        'You used both Actions, and you still have a FREE action right here! Take it now or click Done to flip 1 Event card.';
    } else if (isFirstActionEver) {
      heading = `Welcome! Take 2 Actions for ${active.name}`;
      summary =
        'Finish all Missions together before Shabbat Begins! flips on the Clock above. Every turn: take 2 Actions (Walk, Tidy, Do a Mission, or Use a Tool — any order, repeats allowed!), then flip 1 Event card.';
    } else {
      const actionNum = 3 - state.actionsRemaining;
      heading = `Step 1 — Action ${actionNum} of 2 for ${active.name}`;
      summary =
        legal.length > 0
          ? 'Pick an action below, click a green “Play / Use” card on the table, or click a blue room on the board to move.'
          : 'Click any blue-outlined room on the board (or a Move button below) to walk closer to a Mission or teammate.';
    }

    // Lookahead 1-move opportunities when player still has actions left
    if (state.actionsRemaining > 0) {
      const immediateWins = legal.filter(
        (a) =>
          a.type === 'DELIVER_ERRAND' ||
          a.type === 'TEAM_CHORE' ||
          a.type === 'TIDY_BLOCKED' ||
          a.type === 'PICK_UP_ERRAND',
      );
      if (immediateWins.length > 0) {
        tips.push(`Right here: ${immediateWins[0].label}`);
      }

      if (state.actionsRemaining >= 2 || (state.activeHelperId === 'MOMMY' && !state.mommyFreeErrandUsed)) {
        const oneMoveHits: string[] = [];
        for (const move of legalMoves) {
          const simulated: GameState = {
            ...state,
            actionsRemaining: Math.max(0, state.actionsRemaining - 1),
            helpers: {
              ...state.helpers,
              [state.activeHelperId]: {
                ...state.helpers[state.activeHelperId],
                slotIndex: move.targetSlot,
              },
            },
          };
          const simEval = getActionEvaluation(simulated);
          const hit = simEval.legal.find(
            (a) =>
              a.type === 'DELIVER_ERRAND' ||
              a.type === 'TEAM_CHORE' ||
              a.type === 'TIDY_BLOCKED' ||
              a.type === 'PICK_UP_ERRAND',
          );
          if (hit) {
            const roomName = state.rooms[move.targetSlot].card.name;
            oneMoveHits.push(`Move → ${roomName}: then ${hit.label}`);
          }
          if (oneMoveHits.length >= 2) break;
        }
        tips.push(...oneMoveHits);
      }
    }

    // Superpower reminders
    if (state.activeHelperId === 'MOMMY' && !state.mommyFreeErrandUsed) {
      tips.push(
        'Mommy’s Errand Express: your first Pick Up or Deliver this turn is FREE (in addition to your 2 Actions!) and works even in tilted Cluttered rooms!',
      );
    } else if (state.activeHelperId === 'MEKIMI' && state.actionsRemaining > 0) {
      tips.push('Mekimi’s Turbo Crawl: 1 Move crawls straight to ANY room on the 3×3 board!');
    } else if (state.activeHelperId === 'NAEL') {
      tips.push(
        'Nael’s Learning Tower Power!: with any teammate in a Cluttered room, either of you can still finish a Team Chore!',
      );
    } else if (state.activeHelperId === 'ABBA') {
      tips.push(
        'Abba’s Powers: Abba unblocks Red Blocked rooms alone (1 Action), and his room can’t flip Blocked while Cluttered (the Slow-Down is canceled!).',
      );
    }

    // End-of-round Clock reminder
    if (isFinalTurnOfRound && state.clockShields.length === 0) {
      const hasShieldTool = state.readyTools.some((t) => t.kind === 'EARLY_PREP');
      if (hasShieldTool) {
        tips.push(
          'Turn 4 of 4! Playing Cousin Aviel Drops By! from the Toolbox will shield this round’s Clock flip!',
        );
      } else {
        tips.push('Turn 4 of 4: After this turn’s Event flip, 1 Shabbat Clock card will flip.');
      }
    }
  } else if (state.phase === 'SUBSTEP' && state.pendingSubstep) {
    const sub = state.pendingSubstep;
    if (sub.kind === 'ICE_COFFEE_PICK') {
      heading = 'Ice Coffee Boost — Select 1 or 2 Cluttered Rooms';
      summary =
        'Click 1 or 2 tilted Cluttered rooms on the board (or buttons below), then confirm to Clear them!';
    } else if (sub.kind === 'SNACK_SUMMONS_PICK') {
      heading = 'Strategic Snack Summons — Pick a Teammate';
      summary = `Choose any teammate below to pull straight into ${
        state.rooms[state.helpers[state.activeHelperId].slotIndex].card.name
      } for an instant Team Chore or Free Handoff!`;
    }
  } else if (state.phase === 'EVENT_READY') {
    heading = 'Step 2: Flip 1 Friday Event Card';
    summary = `Every turn ends by flipping 1 card from the Friday Events Deck (${state.eventDeck.length} left) — either a helpful Tool for the Family Toolbox or a Friday Slow-Down!`;
    if (isFinalTurnOfRound) {
      tips.push(
        state.clockShields.length > 0
          ? `End of Round ${state.round} next — Cousin Aviel Drops By! is shielding the Clock flip!`
          : `End of Round ${state.round} next: after this Event, 1 Shabbat Clock card will flip.`,
      );
    }
  } else if (state.phase === 'EVENT_RESOLVED') {
    heading = isFinalTurnOfRound
      ? `End of Round ${state.round} Ready`
      : `Event Complete — Next Helper Ready`;
    summary = isFinalTurnOfRound
      ? state.clockShields.length > 0
        ? 'Review the Event result below, then end the round — Cousin Aviel’s shield will block the Clock flip!'
        : 'Review the Event result below, then end the round to flip 1 Shabbat Clock card and start the next round with Abba!'
      : 'Review the Event result below, then click to pass the turn clockwise to the next Helper.';
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
