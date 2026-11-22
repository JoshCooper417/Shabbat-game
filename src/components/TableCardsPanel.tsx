import { assetUrl, DIFFICULTY_CONFIGS, SHARED_BACKS, ZONE_META } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { GameState } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface TableCardsPanelProps {
  state: GameState;
  onInspectCard: (card: InspectedCard) => void;
}

export function TableCardsPanel({ state, onInspectCard }: TableCardsPanelProps) {
  const cfg = DIFFICULTY_CONFIGS[state.difficulty];
  const { legal } = state.phase === 'ACT' ? getActionEvaluation(state) : { legal: [] };
  const playableChoreIds = new Set(legal.map((a) => a.choreId).filter(Boolean));
  const playableToolIds = new Set(legal.map((a) => a.toolId).filter(Boolean));

  return (
    <section className="cards-dock-panel" aria-label="Chore Row and Household Tools">
      {/* CHORE ROW */}
      <div className="dock-section">
        <div className="panel-header-row">
          <h2 className="panel-title">Chore Row ({state.choreRow.length})</h2>
          <div className="pile-summary-row">
            <span className="pile-pill">
              Done: <strong>{state.doneChores.length}/{cfg.totalChores}</strong>
            </span>
            <span className="pile-pill">
              Arrival Pile: <strong>{state.arrivalPile.length}</strong> face-down
            </span>
          </div>
        </div>

        {state.choreRow.length === 0 ? (
          <div className="panel-hint">
            Chore Row is empty! Finish remaining tucked or carried Chores to win!
          </div>
        ) : (
          <div className="dock-cards-scroll">
            {state.choreRow.map((chore) => {
              const isPlayable = playableChoreIds.has(chore.id);
              return (
                <button
                  key={chore.id}
                  type="button"
                  className="table-card-item"
                  title={`${chore.title} — click to inspect`}
                  onClick={() =>
                    onInspectCard({
                      title: chore.title,
                      subtitle:
                        chore.type === 'ERRAND' && chore.endZone
                          ? `Errand · ${ZONE_META[chore.zone].shortName} → ${ZONE_META[chore.endZone].shortName}`
                          : `${chore.type.replace('_', ' ')} · ${ZONE_META[chore.zone].shortName}`,
                      frontImage: chore.frontImage,
                      backImage: SHARED_BACKS.chores,
                    })
                  }
                >
                  <img src={assetUrl(chore.frontImage)} alt={chore.title} />
                  {isPlayable && <span className="table-card-playable-tag">Playable Now</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* READY TOOLS & BACKUP TOOLS */}
      <div className="tools-split-grid">
        <div className="tools-subbox">
          <div className="panel-header-row">
            <strong style={{ fontSize: '0.86rem', color: 'var(--bg-navy)' }}>
              Ready Tool Row ({state.readyTools.length}/3)
            </strong>
            <span className="panel-hint">Step 2 only</span>
          </div>
          {state.readyTools.length === 0 ? (
            <span className="panel-hint">No Ready Tools right now — Recharge or deliver Errands!</span>
          ) : (
            <div className="tools-mini-row">
              {state.readyTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="tool-mini-card"
                  style={{ position: 'relative' }}
                  onClick={() =>
                    onInspectCard({
                      title: tool.title,
                      subtitle: tool.badge,
                      frontImage: tool.frontImage,
                      backImage: SHARED_BACKS.eventsAndTools,
                    })
                  }
                >
                  <img src={assetUrl(tool.frontImage)} alt={tool.title} />
                  {playableToolIds.has(tool.id) && (
                    <span className="table-card-playable-tag">Ready</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tools-subbox">
          <div className="panel-header-row">
            <strong style={{ fontSize: '0.86rem', color: 'var(--bg-navy)' }}>
              Backup Tools ({state.backupTools.length})
            </strong>
            <span className="panel-hint">Unlocks if Room flips Blocked</span>
          </div>
          {state.backupTools.length === 0 ? (
            <span className="panel-hint">All Backup Tools unlocked! (They never refill.)</span>
          ) : (
            <div className="tools-mini-row">
              {state.backupTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="tool-mini-card"
                  onClick={() =>
                    onInspectCard({
                      title: `${tool.title} (Backup Tool)`,
                      subtitle: 'Moves to Ready when a room flips Red Blocked (if Ready < 3)',
                      frontImage: tool.frontImage,
                      backImage: SHARED_BACKS.eventsAndTools,
                    })
                  }
                >
                  <img src={assetUrl(tool.frontImage)} alt={tool.title} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOOL DISCARD & SLOW-DOWN DISCARD */}
      <div className="pile-summary-row">
        <span className="pile-pill">
          Tool Discard (Rechargeable): <strong>{state.toolDiscard.length}</strong>
        </span>
        <span className="pile-pill">
          Event Deck: <strong>{state.eventDeck.length}</strong> · Slow-Down Discard:{' '}
          <strong>{state.slowDownDiscard.length}</strong>
        </span>
      </div>

      {state.toolDiscard.length > 0 && (
        <div className="tools-mini-row">
          {state.toolDiscard.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="tool-mini-card"
              style={{ width: 54, opacity: 0.85 }}
              title={`Used Tool: ${tool.title} (can be Recharged)`}
              onClick={() =>
                onInspectCard({
                  title: `${tool.title} (In Tool Discard)`,
                  subtitle: 'Can be returned to Ready via Recharge, Errand delivery, or Team Pair!',
                  frontImage: tool.frontImage,
                  backImage: SHARED_BACKS.eventsAndTools,
                })
              }
            >
              <img src={assetUrl(tool.frontImage)} alt={tool.title} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
