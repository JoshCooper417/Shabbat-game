import { assetUrl, HELPER_DEFS, SEAT_ORDER, SHARED_BACKS } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { GameState, HelperId, LegalMove } from '../engine/types';
import { InspectedCard } from './CardInspectModal';
import { CoachBanner } from './CoachBanner';

interface ActionPanelProps {
  state: GameState;
  legalMoves: LegalMove[];
  coachEnabled: boolean;
  onMove: (targetSlot: number) => void;
  onAction: (actionId: string) => void;
  onEndActions: () => void;
  onSubstepChoice: (
    payload:
      | { type: 'TOGGLE_ICE_COFFEE_SLOT'; slotIndex: number }
      | { type: 'CONFIRM_ICE_COFFEE' }
      | { type: 'PICK_SNACK_HELPER'; helperId: HelperId }
      | { type: 'CANCEL_SUBSTEP' },
  ) => void;
  onFlipEvent: () => void;
  onAdvanceTurn: () => void;
  onInspectCard: (card: InspectedCard) => void;
}

export function ActionPanel({
  state,
  legalMoves,
  coachEnabled,
  onMove,
  onAction,
  onEndActions,
  onSubstepChoice,
  onFlipEvent,
  onAdvanceTurn,
  onInspectCard,
}: ActionPanelProps) {
  const activeDef = HELPER_DEFS[state.activeHelperId];
  const activeSlot = state.helpers[state.activeHelperId].slotIndex;
  const activeRoom = state.rooms[activeSlot];
  const { legal, disabledHints } = getActionEvaluation(state);
  const sub = state.pendingSubstep;
  const isFinalTurn = state.turnInRound === 4;

  const nextIdx = (SEAT_ORDER.indexOf(state.activeHelperId) + 1) % SEAT_ORDER.length;
  const nextHelperName = HELPER_DEFS[SEAT_ORDER[nextIdx]].name;

  const step1State =
    state.phase === 'TURN' || state.phase === 'SUBSTEP' ? 'current' : 'done';
  const step2State =
    state.phase === 'EVENT_READY' || state.phase === 'EVENT_RESOLVED'
      ? 'current'
      : state.phase === 'WON' || state.phase === 'LOST'
        ? 'done'
        : '';

  return (
    <section className="action-panel area-actions" aria-label="Turn Actions">
      <div className="turn-banner">
        <div className="turn-helper-id">
          <div
            className="turn-figurine-badge"
            style={{ '--helper-color': activeDef.accent } as React.CSSProperties}
          >
            <img
              src={assetUrl(activeDef.figurineImage)}
              alt={`${activeDef.name} 3D figurine`}
              className="turn-helper-figurine"
            />
          </div>
          <div>
            <h2 className="turn-helper-title">{activeDef.name}’s Turn</h2>
            <div className="turn-helper-sub">
              Round {state.round} · Turn {state.turnInRound} of 4 · In {activeRoom.card.name}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            onInspectCard({
              title: `${activeDef.name} — Helper Power Card`,
              subtitle: 'Turn Order: Abba → Nael → Mommy → Mekimi',
              frontImage: activeDef.cardImage,
              backImage: SHARED_BACKS.helpers,
            })
          }
        >
          🔍 Helper Card
        </button>
      </div>

      {/* 2-STEP TURN TRACKER */}
      <div className="step-tracker">
        <div className={`step-pill ${step1State}`}>1. Take 2 Actions</div>
        <div className={`step-pill ${step2State}`}>2. Flip 1 Event</div>
      </div>

      {/* ACTION PIPS + ACTIVE POWER BADGE */}
      {(state.phase === 'TURN' || state.phase === 'SUBSTEP') && (
        <div className="action-pips-row">
          <div className="action-pips-group" aria-label={`${state.actionsRemaining} of 2 Actions remaining`}>
            <span className="action-pips-label">Actions Left:</span>
            <span className={`action-pip ${state.actionsRemaining >= 1 ? 'ready' : 'spent'}`} />
            <span className={`action-pip ${state.actionsRemaining >= 2 ? 'ready' : 'spent'}`} />
            <strong className="action-pips-count">{state.actionsRemaining}/2</strong>
          </div>
          {state.activeHelperId === 'MOMMY' && (
            <span
              className={`action-bonus-tag ${!state.mommyFreeErrandUsed ? 'free' : 'used'}`}
            >
              {!state.mommyFreeErrandUsed ? '✨ FREE Errand Ready' : '✓ Free Errand Used'}
            </span>
          )}
          {state.activeHelperId === 'MEKIMI' && (
            <span className="action-bonus-tag">Turbo Crawl: Any Room</span>
          )}
          {state.activeHelperId === 'ABBA' && (
            <span className="action-bonus-tag">Solo Unblock &amp; Barrier</span>
          )}
          {state.activeHelperId === 'NAEL' && (
            <span className="action-bonus-tag">Cluttered Team Chores</span>
          )}
        </div>
      )}

      {coachEnabled && <CoachBanner state={state} legalMoves={legalMoves} />}

      {state.lastActionNote && state.phase !== 'SUBSTEP' && (
        <div className="action-note-banner">{state.lastActionNote}</div>
      )}

      {/* STEP 1: TAKE 2 ACTIONS (ANY ORDER, REPEATS ALLOWED + FREE HANDOFF / MOMMY FREE ERRAND) */}
      {state.phase === 'TURN' && (
        <>
          <div className="action-list">
            {legal.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`action-btn-card ${action.isFree ? 'free-action-card' : ''}`}
                onClick={() => onAction(action.id)}
              >
                {action.cardImage && (
                  <img
                    src={assetUrl(action.cardImage)}
                    alt={action.label}
                    className="action-btn-thumb"
                  />
                )}
                <div className="action-btn-body">
                  <div className="action-btn-title-row">
                    <span className="action-btn-label">{action.label}</span>
                    {action.bonusTag && (
                      <span className={`action-bonus-tag ${action.isFree ? 'free' : ''}`}>
                        {action.bonusTag}
                      </span>
                    )}
                  </div>
                  <span className="action-btn-detail">{action.detail}</span>
                </div>
              </button>
            ))}

            {/* QUICK MOVE BUTTONS (mirrors clicking any blue-outlined room on the board) */}
            {state.actionsRemaining > 0 && legalMoves.length > 0 && (
              <div className="move-section-block">
                {legalMoves.length > 4 ? (
                  <>
                    <div className="move-section-header">
                      <span className="move-section-title">
                        Turbo Crawl to Any Room (1 Action)
                      </span>
                      <span className="panel-hint">Tap any room on the 3×3 House</span>
                    </div>
                    <details className="turbo-list-details">
                      <summary>Or choose from room list ({legalMoves.length})</summary>
                      <div className="move-quick-grid">
                        {legalMoves.map((move) => (
                          <button
                            key={move.targetSlot}
                            type="button"
                            className="move-quick-btn"
                            onClick={() => onMove(move.targetSlot)}
                          >
                            <span className="action-btn-label">
                              {state.rooms[move.targetSlot].card.name}
                            </span>
                            <span className="action-btn-detail">{move.label}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <div className="move-section-header">
                      <span className="move-section-title">
                        Walk 1 Room (1 Action · not diagonal)
                      </span>
                      <span className="panel-hint">or tap room on board</span>
                    </div>
                    <div className="move-quick-grid">
                      {legalMoves.map((move) => (
                        <button
                          key={move.targetSlot}
                          type="button"
                          className="move-quick-btn"
                          onClick={() => onMove(move.targetSlot)}
                        >
                          <span className="action-btn-label">
                            {state.rooms[move.targetSlot].card.name}
                          </span>
                          <span className="action-btn-detail">{move.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              className={state.actionsRemaining === 0 ? 'btn btn-gold' : 'btn btn-secondary'}
              onClick={onEndActions}
            >
              {state.actionsRemaining === 0
                ? 'Done With Free Actions → Flip 1 Event'
                : `End Actions Early (${state.actionsRemaining} left) → Flip 1 Event`}
            </button>
          </div>

          {disabledHints.length > 0 && (
            <details className="disabled-hints-details">
              <summary>Why can’t I do other actions here? ({disabledHints.length})</summary>
              <ul className="disabled-hints-list">
                {disabledHints.map((hint, idx) => (
                  <li key={idx}>
                    <strong>{hint.label}:</strong> {hint.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {/* TOOL SUBSTEPS */}
      {state.phase === 'SUBSTEP' && sub && (
        <div className="substep-box">
          {sub.kind === 'ICE_COFFEE_PICK' && (
            <>
              <strong>
                Ice Coffee Boost — Pick 1 or 2 Cluttered Rooms ({sub.selectedSlots.length}/2 selected):
              </strong>
              <div className="move-quick-grid">
                {sub.eligibleSlots.map((slotIdx) => {
                  const selected = sub.selectedSlots.includes(slotIdx);
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      className={`btn btn-sm ${selected ? 'btn-gold' : 'btn-secondary'}`}
                      onClick={() =>
                        onSubstepChoice({ type: 'TOGGLE_ICE_COFFEE_SLOT', slotIndex: slotIdx })
                      }
                    >
                      {selected ? '✓ ' : ''}
                      {state.rooms[slotIdx].card.name}
                    </button>
                  );
                })}
              </div>
              <div className="start-cta-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={sub.selectedSlots.length === 0}
                  onClick={() => onSubstepChoice({ type: 'CONFIRM_ICE_COFFEE' })}
                >
                  Clear Selected ({sub.selectedSlots.length})
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onSubstepChoice({ type: 'CANCEL_SUBSTEP' })}
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {sub.kind === 'SNACK_SUMMONS_PICK' && (
            <>
              <strong>
                Strategic Snack Summons — Choose a Teammate to Join {activeRoom.card.name}:
              </strong>
              <div className="move-quick-grid">
                {sub.eligibleHelpers.map((hid) => {
                  const def = HELPER_DEFS[hid];
                  return (
                    <button
                      key={hid}
                      type="button"
                      className="action-btn-card"
                      onClick={() => onSubstepChoice({ type: 'PICK_SNACK_HELPER', helperId: hid })}
                    >
                      <img
                        src={assetUrl(def.avatarImage)}
                        alt={def.name}
                        className="pick-helper-avatar"
                        style={{ '--helper-color': def.accent } as React.CSSProperties}
                      />
                      <div className="action-btn-body">
                        <span className="action-btn-label">{def.name}</span>
                        <span className="action-btn-detail">
                          From {state.rooms[state.helpers[hid].slotIndex].card.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onSubstepChoice({ type: 'CANCEL_SUBSTEP' })}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* STEP 2A: READY TO FLIP EVENT */}
      {state.phase === 'EVENT_READY' && (
        <div className="event-deck-box ready-glow">
          <button
            type="button"
            className="physical-deck-stack clickable-deck"
            onClick={onFlipEvent}
            title="Click the Event Deck to flip the top card!"
          >
            <img
              src={assetUrl(SHARED_BACKS.eventsAndTools)}
              alt="Click to flip Friday Events Deck"
            />
            <span className="deck-count-badge">{state.eventDeck.length}</span>
          </button>
          <div className="action-btn-body" style={{ gap: 8 }}>
            <div>
              <strong>Friday Events Deck</strong>
              <div className="action-btn-detail">
                {state.eventDeck.length} card{state.eventDeck.length === 1 ? '' : 's'} left ·{' '}
                {state.eventDiscard.length} in Event Discard
              </div>
            </div>
            <button type="button" className="btn btn-gold" onClick={onFlipEvent}>
              Flip 1 Event Card <kbd className="kbd-hint">Space</kbd>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2B: EVENT RESOLVED -> NEXT HELPER / END OF ROUND CLOCK FLIP */}
      {state.phase === 'EVENT_RESOLVED' && state.lastEvent && (
        <div className="action-list">
          {state.lastEvent.reshuffledDiscard && (
            <div className="action-note-banner">
              Event Deck was empty — reshuffled the Event Discard Pile (Slow-Downs + spent Reusable
              Tools) into a fresh deck!
            </div>
          )}

          {state.lastEvent.drawnCard ? (
            <div className="event-reveal-box">
              <button
                type="button"
                className="event-reveal-card-btn"
                title="Click to inspect full Event card"
                onClick={() =>
                  onInspectCard({
                    title: state.lastEvent!.drawnCard!.card.title,
                    subtitle:
                      state.lastEvent!.drawnCard!.category === 'TOOL'
                        ? 'Household Tool'
                        : 'Friday Slow-Down',
                    frontImage: state.lastEvent!.drawnCard!.card.frontImage,
                    backImage: SHARED_BACKS.eventsAndTools,
                  })
                }
              >
                <img
                  src={assetUrl(state.lastEvent.drawnCard.card.frontImage)}
                  alt={state.lastEvent.drawnCard.card.title}
                />
              </button>
              <div className="event-notes-list">
                <strong>{state.lastEvent.drawnCard.card.title}</strong>
                {state.lastEvent.notes.map((note, idx) => (
                  <div key={idx} className={`event-note-pill ${note.kind}`}>
                    {note.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="event-notes-list">
              {state.lastEvent.notes.map((note, idx) => (
                <div key={idx} className={`event-note-pill ${note.kind}`}>
                  {note.text}
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn-primary" onClick={onAdvanceTurn}>
            {isFinalTurn
              ? state.clockShields.length > 0
                ? `End Round ${state.round} (Cousin Aviel Shields Clock! · ${state.clockShields.length} Shield${state.clockShields.length > 1 ? 's' : ''})`
                : `End Round ${state.round} & Flip Shabbat Clock`
              : `Next Helper: ${nextHelperName} →`}{' '}
            <kbd className="kbd-hint">Space</kbd>
          </button>
        </div>
      )}
    </section>
  );
}
