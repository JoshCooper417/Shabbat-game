import { assetUrl, GROUP_HELPERS, HELPER_DEFS, SHARED_BACKS } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { GameState, HelperId, LegalMove } from '../engine/types';
import { InspectedCard } from './CardInspectModal';
import { CoachBanner } from './CoachBanner';

interface ActionPanelProps {
  state: GameState;
  legalMoves: LegalMove[];
  coachEnabled: boolean;
  onChooseHelper: (helperId: HelperId) => void;
  onMove: (targetSlot: number) => void;
  onAction: (actionId: string) => void;
  onSkipAction: () => void;
  onSubstepChoice: (
    payload:
      | { type: 'PICK_TIDY_NEIGHBOR'; slotIndex: number | null }
      | { type: 'TOGGLE_ICE_COFFEE_SLOT'; slotIndex: number }
      | { type: 'CONFIRM_ICE_COFFEE' }
      | { type: 'PICK_SNACK_HELPER'; helperId: HelperId }
      | { type: 'TOGGLE_RECHARGE_TOOL'; toolId: string }
      | { type: 'CONFIRM_RECHARGE' }
      | { type: 'PICK_BACKUP_TOOL'; toolId: string }
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
  onChooseHelper,
  onMove,
  onAction,
  onSkipAction,
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

  const step1State =
    state.phase === 'MOVE' || state.phase === 'CHOOSE_HELPER' ? 'current' : 'done';
  const step2State =
    state.phase === 'ACT' || (state.phase === 'SUBSTEP' && sub?.kind !== 'BACKUP_TOOL_PICK')
      ? 'current'
      : state.phase === 'EVENT_READY' ||
          state.phase === 'EVENT_RESOLVED' ||
          (state.phase === 'SUBSTEP' && sub?.kind === 'BACKUP_TOOL_PICK') ||
          state.phase === 'WON' ||
          state.phase === 'LOST'
        ? 'done'
        : '';
  const step3State =
    state.phase === 'EVENT_READY' ||
    state.phase === 'EVENT_RESOLVED' ||
    (state.phase === 'SUBSTEP' && sub?.kind === 'BACKUP_TOOL_PICK')
      ? 'current'
      : '';

  return (
    <section className="action-panel" aria-label="Turn Actions">
      <div className="turn-banner">
        <div className="turn-helper-id">
          <img
            src={assetUrl(activeDef.avatarImage)}
            alt={activeDef.name}
            className="turn-helper-avatar"
            style={{ '--helper-color': activeDef.accent } as React.CSSProperties}
          />
          <div>
            <h2 className="turn-helper-title">
              {state.phase === 'CHOOSE_HELPER'
                ? `Group ${state.activeGroup}'s Turn`
                : `${activeDef.name}'s Turn`}
            </h2>
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
              subtitle: `Carry ${activeDef.carryLimit} Errand${activeDef.carryLimit > 1 ? 's' : ''}`,
              frontImage: activeDef.cardImage,
              backImage: SHARED_BACKS.helpers,
            })
          }
        >
          Power Card
        </button>
      </div>

      <div className="step-tracker">
        <div className={`step-pill ${step1State}`}>1. Move</div>
        <div className={`step-pill ${step2State}`}>2. Act</div>
        <div className={`step-pill ${step3State}`}>3. Event</div>
      </div>

      {coachEnabled && <CoachBanner state={state} legalMoves={legalMoves} />}

      {state.lastActionNote && state.phase !== 'SUBSTEP' && (
        <div className="action-note-banner">{state.lastActionNote}</div>
      )}

      {/* 1-2P GROUP MODE: CHOOSE HELPER */}
      {state.phase === 'CHOOSE_HELPER' && (
        <div className="substep-box">
          <strong>Choose a Ready Helper in Group {state.activeGroup}:</strong>
          <div className="move-quick-grid">
            {GROUP_HELPERS[state.activeGroup]
              .filter((id) => !state.helpers[id].resting)
              .map((id) => {
                const def = HELPER_DEFS[id];
                const loc = state.rooms[state.helpers[id].slotIndex].card.name;
                return (
                  <button
                    key={id}
                    type="button"
                    className="action-btn-card"
                    onClick={() => onChooseHelper(id)}
                  >
                    <img
                      src={assetUrl(def.avatarImage)}
                      alt={def.name}
                      className="helper-seat-avatar"
                      style={{ '--helper-color': def.accent } as React.CSSProperties}
                    />
                    <div className="action-btn-body">
                      <span className="action-btn-label">{def.name}</span>
                      <span className="action-btn-detail">Currently in {loc}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* STEP 1: MOVE */}
      {state.phase === 'MOVE' && (
        <div className="action-list">
          <div className="move-quick-grid">
            {legalMoves.map((move) => (
              <button
                key={move.targetSlot}
                type="button"
                className={`move-quick-btn ${move.kind === 'STAY' ? 'stay' : ''}`}
                onClick={() => onMove(move.targetSlot)}
              >
                <span className="action-btn-label">
                  {move.kind === 'STAY' ? 'Stay Put' : state.rooms[move.targetSlot].card.name}
                </span>
                <span className="action-btn-detail">{move.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: ACT */}
      {state.phase === 'ACT' && (
        <>
          <div className="action-list">
            {legal.map((action) => (
              <button
                key={action.id}
                type="button"
                className="action-btn-card"
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
                    {action.bonusTag && <span className="action-bonus-tag">{action.bonusTag}</span>}
                  </div>
                  <span className="action-btn-detail">{action.detail}</span>
                </div>
              </button>
            ))}

            <button type="button" className="btn btn-secondary" onClick={onSkipAction}>
              Skip Step 2 (Continue to Event)
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

      {/* SUBSTEPS */}
      {state.phase === 'SUBSTEP' && sub && (
        <div className="substep-box">
          {sub.kind === 'TIDY_NEIGHBOR_BONUS' && (
            <>
              <strong>Team Tidy Bonus — Clear 1 Next-Door Cluttered Room (Optional):</strong>
              <div className="move-quick-grid">
                {sub.eligibleSlots.map((slotIdx) => (
                  <button
                    key={slotIdx}
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onSubstepChoice({ type: 'PICK_TIDY_NEIGHBOR', slotIndex: slotIdx })}
                  >
                    Clear {state.rooms[slotIdx].card.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onSubstepChoice({ type: 'PICK_TIDY_NEIGHBOR', slotIndex: null })}
              >
                Skip Next-Door Bonus
              </button>
            </>
          )}

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
              <strong>Strategic Snack Summons — Choose a Teammate to Join {activeRoom.card.name}:</strong>
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
                        className="helper-token-avatar"
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

          {sub.kind === 'RECHARGE_PICK' && (
            <>
              <strong>
                {sub.source === 'RECHARGE_ACTION'
                  ? `Recharge: Pick up to ${sub.maxCount} Used Tool${sub.maxCount > 1 ? 's' : ''} (${sub.selectedToolIds.length}/${sub.maxCount})`
                  : 'Bonus Tool Recharge: Pick 1 Used Tool to Return to Ready!'}
              </strong>
              <div className="substep-card-grid">
                {state.toolDiscard.map((tool) => {
                  const selected = sub.selectedToolIds.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      className={`pick-card-btn ${selected ? 'selected' : ''}`}
                      onClick={() =>
                        onSubstepChoice({ type: 'TOGGLE_RECHARGE_TOOL', toolId: tool.id })
                      }
                    >
                      <img src={assetUrl(tool.frontImage)} alt={tool.title} />
                      <span className="pick-card-label">
                        {selected ? '✓ ' : ''}
                        {tool.title}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="start-cta-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={sub.selectedToolIds.length === 0}
                  onClick={() => onSubstepChoice({ type: 'CONFIRM_RECHARGE' })}
                >
                  Return to Ready ({sub.selectedToolIds.length})
                </button>
                {sub.canCancel && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onSubstepChoice({ type: 'CANCEL_SUBSTEP' })}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}

          {sub.kind === 'BACKUP_TOOL_PICK' && (
            <>
              {state.lastEvent && state.lastEvent.drawnCard && (
                <div className="event-reveal-box">
                  <button
                    type="button"
                    className="event-reveal-card-btn"
                    onClick={() =>
                      onInspectCard({
                        title: state.lastEvent!.drawnCard!.card.title,
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
                    {state.lastEvent.notes.map((n, i) => (
                      <div key={i} className={`event-note-pill ${n.kind}`}>
                        {n.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <strong>
                Room Flipped Blocked! Unlock {sub.remainingPicks} Backup Tool
                {sub.remainingPicks > 1 ? 's' : ''} to Ready:
              </strong>
              <div className="substep-card-grid">
                {state.backupTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="pick-card-btn"
                    onClick={() => onSubstepChoice({ type: 'PICK_BACKUP_TOOL', toolId: tool.id })}
                  >
                    <img src={assetUrl(tool.frontImage)} alt={tool.title} />
                    <span className="pick-card-label">Unlock {tool.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3A: READY TO FLIP EVENT */}
      {state.phase === 'EVENT_READY' && (
        <div className="event-deck-box">
          <img
            src={assetUrl(SHARED_BACKS.eventsAndTools)}
            alt="Friday Events Deck"
            className="event-deck-back-img"
          />
          <div className="action-btn-body" style={{ gap: 8 }}>
            <div>
              <strong>Friday Events Deck</strong>
              <div className="action-btn-detail">
                {state.eventDeck.length} card{state.eventDeck.length === 1 ? '' : 's'} remaining ·{' '}
                {state.slowDownDiscard.length} in Slow-Down Discard
              </div>
            </div>
            <button type="button" className="btn btn-gold" onClick={onFlipEvent}>
              Flip 1 Event Card
            </button>
          </div>
        </div>
      )}

      {/* STEP 3B: EVENT RESOLVED -> REST & NEXT TURN / END ROUND */}
      {state.phase === 'EVENT_RESOLVED' && state.lastEvent && (
        <div className="action-list">
          {state.lastEvent.reshuffledSlowDowns && (
            <div className="action-note-banner">
              Event Deck was empty — reshuffled only the Slow-Down Discard Pile to form a fresh deck!
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
                <div key={idx} className="event-note-pill">
                  {note.text}
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn-primary" onClick={onAdvanceTurn}>
            {isFinalTurn
              ? state.clockShield
                ? `Rest ${activeDef.name} & End Round (Early Prep Shields Clock!)`
                : `Rest ${activeDef.name} & End Round (Flip Shabbat Clock)`
              : `Rest ${activeDef.name} & Next Helper`}
          </button>
        </div>
      )}
    </section>
  );
}
