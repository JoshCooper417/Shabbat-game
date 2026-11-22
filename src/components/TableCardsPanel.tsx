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
  const { legal } = state.phase === 'ACT' ? getActionEvaluation(state) : { legal: [] };

  // Pick best direct-play action for each Chore card (prefer 1-Step Combo over Start Room Chore)
  const choreActionMap = new Map<string, ActionCandidate>();
  for (const act of legal) {
    if (!act.choreId) continue;
    const existing = choreActionMap.get(act.choreId);
    if (!existing || act.type === 'COMBO_ROOM_CHORE_ROW') {
      choreActionMap.set(act.choreId, act);
    }
  }

  // Key Ready Tool playability by tool.kind so duplicate Ready Tools ALL highlight as playable!
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
      aria-label="Chore Row and Household Tools on the Table"
    >
      {/* CHORE ROW + PHYSICAL ARRIVAL DECK STACK */}
      <div className="dock-section">
        <div className="panel-header-row">
          <h2 className="panel-title">Chore Row ({state.choreRow.length})</h2>
          <div className="pile-summary-row">
            <span className="pile-pill done">
              ✓ Done <strong>{state.doneChores.length}/{cfg.totalChores}</strong>
            </span>
            <span className="pile-pill">
              Arrival Stack: <strong>{state.arrivalPile.length}</strong>
            </span>
          </div>
        </div>

        <div className="chore-table-row">
          {state.arrivalPile.length > 0 && (
            <div
              className="deck-stack-slot"
              title={`${state.arrivalPile.length} face-down Chores in Arrival Pile`}
            >
              <div className="physical-deck-stack">
                <img src={assetUrl(SHARED_BACKS.chores)} alt="Arrival Pile" />
                <span className="deck-count-badge">{state.arrivalPile.length}</span>
              </div>
              <span className="deck-caption">Arrival</span>
            </div>
          )}

          {state.choreRow.length === 0 ? (
            <div className="panel-hint" style={{ alignSelf: 'center' }}>
              Chore Row is empty! Finish remaining tucked or carried Chores to win!
            </div>
          ) : (
            <div className="dock-cards-scroll">
              {state.choreRow.map((chore) => {
                const playableAction = choreActionMap.get(chore.id);
                const zoneLabel =
                  chore.type === 'ERRAND' && chore.endZone
                    ? `${ZONE_META[chore.zone].shortName} → ${ZONE_META[chore.endZone].shortName}`
                    : `${ZONE_META[chore.zone].shortName}${
                        chore.type === 'TEAM_PAIR'
                          ? ' · 2 Helpers'
                          : chore.type === 'RESTORE_ORDER'
                            ? ' · All Clear'
                            : ''
                      }`;
                const inspectObj: InspectedCard = {
                  title: chore.title,
                  subtitle:
                    chore.type === 'ERRAND' && chore.endZone
                      ? `Errand · ${ZONE_META[chore.zone].shortName} → ${ZONE_META[chore.endZone].shortName}`
                      : `${chore.type.replace('_', ' ')} · ${ZONE_META[chore.zone].shortName}`,
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
                        {chore.type === 'ROOM_CHORE'
                          ? 'Tuck solo, or finish in 1 step w/ 2 Helpers'
                          : chore.type === 'ERRAND'
                            ? 'Pick up at Start → Deliver to End (+1 Tool)'
                            : chore.type === 'TEAM_PAIR'
                              ? '2 Helpers together here (+1 Tool)'
                              : 'Room + all next-door rooms Clear'}
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
                              ? 'Pick Up'
                              : playableAction.type === 'START_ROOM_CHORE'
                                ? 'Start'
                                : 'Play'}
                          </button>
                        ) : (
                          <span className="card-type-label">
                            {chore.type === 'ROOM_CHORE'
                              ? 'Room Chore'
                              : chore.type === 'ERRAND'
                                ? 'Errand'
                                : chore.type === 'TEAM_PAIR'
                                  ? 'Team Pair'
                                  : 'Restore Order'}
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

      {/* READY TOOLS & BACKUP TOOLS */}
      <div className="tools-split-grid">
        <div className="tools-subbox">
          <div className="panel-header-row">
            <strong className="subbox-title">Ready Tools ({state.readyTools.length}/3)</strong>
            <span className="panel-hint">Step 2 only</span>
          </div>
          {state.readyTools.length === 0 ? (
            <span className="panel-hint">No Ready Tools — Recharge or deliver an Errand!</span>
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

        <div className="tools-subbox">
          <div className="panel-header-row">
            <strong className="subbox-title">Backup Tools ({state.backupTools.length})</strong>
            <span className="panel-hint">Unlocks if a room is Blocked</span>
          </div>
          {state.backupTools.length === 0 ? (
            <span className="panel-hint">All Backup Tools unlocked! (They never refill.)</span>
          ) : (
            <div className="tools-mini-grid">
              {state.backupTools.map((tool) => (
                <div key={tool.id} className="tool-card-shell">
                  <button
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
                  <div className="tool-card-caption">
                    <span className="tool-card-title">{tool.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TOOL DISCARD & DECK COUNTS */}
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
              className="discard-tool-chip"
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
              <span>{tool.title}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
