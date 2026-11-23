import { SHARED_BACKS, ZONE_META } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { ActionCandidate, GameState } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface ActiveChoreStripProps {
  state: GameState;
  onPlayAction: (actionId: string) => void;
  onInspectCard: (card: InspectedCard) => void;
}

/**
 * Compact, always-visible strip of the 4 face-up Chores so mobile and desktop players
 * can plan moves across the 3x3 House without scrolling down to the full Chore Row.
 */
export function ActiveChoreStrip({ state, onPlayAction, onInspectCard }: ActiveChoreStripProps) {
  const { legal } = state.phase === 'TURN' ? getActionEvaluation(state) : { legal: [] };

  const choreActionMap = new Map<string, ActionCandidate>();
  for (const act of legal) {
    if (!act.choreId) continue;
    if (act.type === 'TEAM_CHORE' || act.type === 'PICK_UP_ERRAND') {
      choreActionMap.set(act.choreId, act);
    }
  }

  return (
    <section className="active-chore-strip" aria-label="Active Chores Quick Reference">
      <div className="active-chore-strip-label">
        <span className="active-chore-strip-title">Active Chores</span>
        <span className="active-chore-strip-meta">
          {state.choreRow.length} up · {state.choreDeck.length} deck
        </span>
      </div>

      {state.choreRow.length === 0 ? (
        <span className="active-chore-empty">
          Chore Row empty — deliver remaining carried Errands to win!
        </span>
      ) : (
        <div className="active-chore-chips">
          {state.choreRow.map((chore) => {
            const playable = choreActionMap.get(chore.id);
            const startZone = ZONE_META[chore.zone];
            const endZone = chore.endZone ? ZONE_META[chore.endZone] : null;
            const inspectObj: InspectedCard = {
              title: chore.title,
              subtitle:
                chore.type === 'ERRAND' && endZone
                  ? `Errand · ${startZone.shortName} → ${endZone.shortName}`
                  : `Team Chore · ${startZone.shortName}`,
              frontImage: chore.frontImage,
              backImage: SHARED_BACKS.chores,
            };

            return (
              <button
                key={chore.id}
                type="button"
                className={`chore-chip ${playable ? 'playable' : ''}`}
                title={
                  playable
                    ? `Tap to play: ${playable.label}`
                    : `${chore.title} — tap to view full card`
                }
                onClick={() => {
                  if (playable) {
                    onPlayAction(playable.id);
                  } else {
                    onInspectCard(inspectObj);
                  }
                }}
              >
                <span className="chore-chip-zones">
                  <span className="chore-zone-dot" style={{ backgroundColor: startZone.color }}>
                    {startZone.shortName}
                  </span>
                  {endZone ? (
                    <>
                      <span className="chore-zone-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="chore-zone-dot" style={{ backgroundColor: endZone.color }}>
                        {endZone.shortName}
                      </span>
                    </>
                  ) : (
                    <span className="chore-team-tag">2+</span>
                  )}
                </span>
                <span className="chore-chip-title">{chore.title}</span>
                {playable && (
                  <span className="chore-chip-go">
                    {playable.type === 'PICK_UP_ERRAND'
                      ? playable.isFree
                        ? '✨ Free'
                        : '▶ Grab'
                      : '▶ Do'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
