import { assetUrl, DIFFICULTY_CONFIGS, SHARED_BACKS, ZONE_META } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { ActionCandidate, GameState, ToolKind } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface TableCardsPanelProps {
  state: GameState;
  onPlayAction: (actionId: string) => void;
  onInspectCard: (card: InspectedCard) => void;
}

export function TableCardsPanel({ state, onPlayAction, onInspectCard }: TableCardsPanelProps) {
  const cfg = DIFFICULTY_CONFIGS[state.difficulty];
  const { legal } = state.phase === 'TURN' ? getActionEvaluation(state) : { legal: [] };

  // Direct-play action for each Chore card in Chore Row
  const choreActionMap = new Map<string, ActionCandidate>();
  for (const act of legal) {
    if (!act.choreId) continue;
    if (act.type === 'TEAM_CHORE' || act.type === 'PICK_UP_ERRAND') {
      choreActionMap.set(act.choreId, act);
    }
  }

  // Key Toolbox playability by tool.kind so duplicate Tools in the Family Toolbox ALL highlight
  const toolKindActionMap = new Map<ToolKind, ActionCandidate>();
  for (const act of legal) {
    if (!act.toolId) continue;
    const found = state.readyTools.find((t) => t.id === act.toolId);
    if (found && !toolKindActionMap.has(found.kind)) {
      toolKindActionMap.set(found.kind, act);
    }
  }

  return (
    <section
      className="table-cards-dock area-cards"
      aria-label="Mission Row and Family Toolbox on the Table"
    >
      {/* MISSION ROW (AUTO-REFILLS TO 4) + PHYSICAL MISSION DECK STACK */}
      <div className="dock-section">
        <div className="panel-header-row">
          <h2 className="panel-title">Mission Row ({state.choreRow.length}/4)</h2>
          <div className="pile-summary-row">
            <span className="pile-pill done">
              ✓ Done <strong>{state.doneChores.length}/{cfg.totalChores}</strong>
            </span>
            <span className="pile-pill">
              Mission Deck: <strong>{state.choreDeck.length}</strong>
            </span>
          </div>
        </div>

        <div className="chore-table-row">
          {state.choreDeck.length > 0 && (
            <div
              className="deck-stack-slot"
              title={`${state.choreDeck.length} face-down Missions in Mission Deck (auto-refills Mission Row to 4)`}
            >
              <div className="physical-deck-stack">
                <img src={assetUrl(SHARED_BACKS.chores)} alt="Mission Deck" />
                <span className="deck-count-badge">{state.choreDeck.length}</span>
              </div>
              <span className="deck-caption">Mission Deck</span>
            </div>
          )}

          {state.choreRow.length === 0 ? (
            <div className="panel-hint" style={{ alignSelf: 'center' }}>
              Mission Row is empty! Deliver remaining carried Errands to win!
            </div>
          ) : (
            <div className="dock-cards-scroll">
              {state.choreRow.map((chore) => {
                const playableAction = choreActionMap.get(chore.id);
                const zoneLabel =
                  chore.type === 'ERRAND' && chore.endZone
                    ? `${ZONE_META[chore.zone].shortName} → ${ZONE_META[chore.endZone].shortName}`
                    : `${ZONE_META[chore.zone].shortName} · 2+ Helpers`;
                const inspectObj: InspectedCard = {
                  title: chore.title,
                  subtitle:
                    chore.type === 'ERRAND' && chore.endZone
                      ? `Errand · ${ZONE_META[chore.zone].shortName} → ${ZONE_META[chore.endZone].shortName}`
                      : `Team Chore · ${ZONE_META[chore.zone].shortName}`,
                  frontImage: chore.frontImage,
                  backImage: SHARED_BACKS.chores,
                };

                return (
                  <div
                    key={chore.id}
                    className={`table-card-shell ${playableAction ? 'playable' : ''}`}
                  >
                    <button
                      type="button"
                      className="table-card-item"
                      title={
                        playableAction
                          ? `Click to play: ${playableAction.label}`
                          : `${chore.title} — click to inspect full card`
                      }
                      onClick={() => {
                        if (playableAction) {
                          onPlayAction(playableAction.id);
                        } else {
                          onInspectCard(inspectObj);
                        }
                      }}
                    >
                      <img src={assetUrl(chore.frontImage)} alt={chore.title} />
                    </button>

                    <div className="table-card-caption">
                      <span className="table-card-title">{chore.title}</span>
                      <span className="table-card-meta">{zoneLabel}</span>
                      <span className="table-card-howto">
                        {chore.type === 'TEAM_CHORE'
                          ? '2+ Helpers in matching Clear room (1 Action)'
                          : 'Pick Up at Start → Deliver to End (1 Action each)'}
                      </span>
                      <div className="table-card-caption-actions">
                        {playableAction ? (
                          <button
                            type="button"
                            className="card-play-btn"
                            onClick={() => onPlayAction(playableAction.id)}
                          >
                            ▶{' '}
                            {playableAction.type === 'PICK_UP_ERRAND'
                              ? playableAction.isFree
                                ? 'Free Pick Up'
                                : 'Pick Up'
                              : 'Finish'}
                          </button>
                        ) : (
                          <span className="card-type-label">
                            {chore.type === 'TEAM_CHORE' ? 'Team Chore' : 'Errand'}
                          </span>
                        )}
                        <button
                          type="button"
                          className="card-inspect-inline-btn"
                          title={`Inspect ${chore.title}`}
                          onClick={() => onInspectCard(inspectObj)}
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAMILY TOOLBOX */}
      <div className="tools-subbox toolbox-full">
        <div className="panel-header-row">
          <strong className="subbox-title">
            Family Toolbox ({state.readyTools.length} Ready)
          </strong>
          <span className="panel-hint">1 Action · Reusable tools return to Event Discard</span>
        </div>
        {state.readyTools.length === 0 ? (
          <span className="panel-hint">
            Toolbox is empty — flip more Tools from the Friday Events Deck!
          </span>
        ) : (
          <div className="tools-mini-grid">
            {state.readyTools.map((tool) => {
              const playableAction = toolKindActionMap.get(tool.kind);
              const inspectObj: InspectedCard = {
                title: tool.title,
                subtitle: tool.badge,
                frontImage: tool.frontImage,
                backImage: SHARED_BACKS.eventsAndTools,
              };
              return (
                <div
                  key={tool.id}
                  className={`tool-card-shell ${playableAction ? 'playable' : ''}`}
                >
                  <button
                    type="button"
                    className="tool-mini-card"
                    title={
                      playableAction
                        ? `Click to use ${tool.title}`
                        : `${tool.title} — click to inspect`
                    }
                    onClick={() => {
                      if (playableAction) {
                        onPlayAction(playableAction.id);
                      } else {
                        onInspectCard(inspectObj);
                      }
                    }}
                  >
                    <img src={assetUrl(tool.frontImage)} alt={tool.title} />
                  </button>
                  <div className="tool-card-caption">
                    <span className="tool-card-title">{tool.title}</span>
                    <div className="table-card-caption-actions">
                      {playableAction ? (
                        <button
                          type="button"
                          className="card-play-btn"
                          onClick={() => onPlayAction(playableAction.id)}
                        >
                          ▶ Use
                        </button>
                      ) : (
                        <span className="card-type-label">{tool.badge.split(' ')[0]}</span>
                      )}
                      <button
                        type="button"
                        className="card-inspect-inline-btn"
                        title={`Inspect ${tool.title}`}
                        onClick={() => onInspectCard(inspectObj)}
                      >
                        🔍
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SHARED EVENT DECK & EVENT DISCARD PILE SUMMARY */}
      <div className="pile-summary-row">
        <span className="pile-pill">
          Event Deck: <strong>{state.eventDeck.length}</strong>
        </span>
        <span className="pile-pill">
          Event Discard: <strong>{state.eventDiscard.length}</strong>{' '}
          <span style={{ fontWeight: 500, opacity: 0.8 }}>(reshuffles when deck empties)</span>
        </span>
      </div>
    </section>
  );
}
