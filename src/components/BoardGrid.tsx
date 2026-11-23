import { assetUrl, HELPER_DEFS, ZONE_META } from '../data/cards';
import { getActionEvaluation } from '../engine/actions';
import { getHelpersInSlot } from '../engine/helpers';
import { GameState, LegalMove } from '../engine/types';
import { InspectedCard } from './CardInspectModal';

interface BoardGridProps {
  state: GameState;
  legalMoves: LegalMove[];
  onClickMoveSlot: (slotIndex: number) => void;
  onClickBoardAction: (actionId: string) => void;
  onClickSubstepSlot: (slotIndex: number) => void;
  onInspectCard: (card: InspectedCard) => void;
}

function getShortMoveLabel(move: LegalMove): string {
  return move.kind === 'TURBO_CRAWL' ? 'Turbo Crawl' : 'Walk (1)';
}

function getBoardPrompt(state: GameState): string {
  const activeName = HELPER_DEFS[state.activeHelperId].name;
  const activeRoomName = state.rooms[state.helpers[state.activeHelperId].slotIndex].card.name;
  const sub = state.pendingSubstep;

  if (state.phase === 'TURN') {
    if (state.actionsRemaining > 0) {
      const actionNum = 3 - state.actionsRemaining;
      return state.activeHelperId === 'MEKIMI'
        ? `Action ${actionNum}/2: Click any room to Turbo Crawl, or pick an action`
        : `Action ${actionNum}/2: Click a blue room to Walk, or pick an action`;
    }
    return `0 Actions left — take a FREE bonus action or flip 1 Event`;
  }
  if (state.phase === 'SUBSTEP' && sub) {
    switch (sub.kind) {
      case 'ICE_COFFEE_PICK':
        return 'Select 1 or 2 tilted Cluttered rooms to Clear';
      case 'SNACK_SUMMONS_PICK':
        return `Pick a teammate to summon into ${activeRoomName}`;
    }
  }
  if (state.phase === 'EVENT_READY') {
    return 'Click the Friday Events Deck to flip 1 card';
  }
  if (state.phase === 'EVENT_RESOLVED') {
    return state.turnInRound === 4
      ? `Review the Event, then end Round ${state.round} & flip the Clock`
      : `Review the Event, then pass the turn after ${activeName}`;
  }
  if (state.phase === 'WON') return 'Shabbat Shalom — all Chores complete!';
  return 'Shabbat Begins!';
}

export function BoardGrid({
  state,
  legalMoves,
  onClickMoveSlot,
  onClickBoardAction,
  onClickSubstepSlot,
  onInspectCard,
}: BoardGridProps) {
  const moveBySlot = new Map(legalMoves.map((m) => [m.targetSlot, m]));
  const sub = state.pendingSubstep;
  const activeSlot = state.helpers[state.activeHelperId].slotIndex;
  const highlightedEventSlots = new Set(state.lastEvent?.highlightedSlots ?? []);

  // Direct on-board quick Tidy/Unblock action in active room during TURN phase
  const { legal: legalActions } =
    state.phase === 'TURN' && state.actionsRemaining > 0
      ? getActionEvaluation(state)
      : { legal: [] };
  const directRoomAction = legalActions.find(
    (a) => a.type === 'TIDY_BLOCKED' || a.type === 'TIDY_CLUTTERED',
  );

  const isIceCoffeePick = state.phase === 'SUBSTEP' && sub?.kind === 'ICE_COFFEE_PICK';

  return (
    <section className="linen-playmat area-board" aria-label="The 3 by 3 House on the Shabbat Table">
      <div className="playmat-header">
        <div className="playmat-title-group">
          <h2 className="playmat-title">The 3×3 House</h2>
          <span className="playmat-legend">
            Upright = Clear · Tilted = Cluttered · Red = Blocked
          </span>
        </div>
        <span className="playmat-prompt">{getBoardPrompt(state)}</span>
      </div>

      <div className="house-grid">
        {state.rooms.map((room) => {
          const zone = ZONE_META[room.card.zone];
          const occupants = getHelpersInSlot(state, room.slotIndex);
          const move =
            state.phase === 'TURN' && state.actionsRemaining > 0
              ? moveBySlot.get(room.slotIndex)
              : undefined;

          const isIceCoffeeTarget =
            isIceCoffeePick && sub.eligibleSlots.includes(room.slotIndex);
          const isIceCoffeeSelected =
            isIceCoffeePick && sub.selectedSlots.includes(room.slotIndex);

          const isClickable = Boolean(move || isIceCoffeeTarget);
          const isUnreachableDuringPick = isIceCoffeePick && !isIceCoffeeTarget;
          const isEventHit = highlightedEventSlots.has(room.slotIndex);
          const isActiveRoom =
            room.slotIndex === activeSlot && state.phase !== 'WON' && state.phase !== 'LOST';

          const handleTileClick = () => {
            if (move) {
              onClickMoveSlot(room.slotIndex);
            } else if (isIceCoffeeTarget) {
              onClickSubstepSlot(room.slotIndex);
            }
          };

          const tileClasses = [
            'room-tile',
            room.state === 'CLUTTERED' ? 'cluttered' : '',
            room.state === 'BLOCKED' ? 'blocked' : '',
            isClickable ? 'clickable' : '',
            isUnreachableDuringPick ? 'dimmed-non-target' : '',
            isIceCoffeeSelected ? 'selected-substep' : '',
            isEventHit ? 'event-hit' : '',
            !isClickable && isActiveRoom ? 'active-room' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const crowdClass =
            occupants.length >= 3 ? 'crowd' : occupants.length === 2 ? 'duo' : 'solo';

          return (
            <div key={room.card.id} className="room-slot-wrap">
              <div
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                className={tileClasses}
                onClick={handleTileClick}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleTileClick();
                  }
                }}
              >
                <div className="room-top-bar">
                  <span className="zone-pill" style={{ backgroundColor: zone.color }}>
                    {zone.shortName}
                  </span>
                  <div className="room-top-right">
                    <button
                      type="button"
                      className="room-inspect-btn"
                      title={`Inspect ${room.card.name} full card`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectCard({
                          title: room.card.subtitle
                            ? `${room.card.name} (${room.card.subtitle})`
                            : room.card.name,
                          subtitle: `${zone.name} · Currently ${room.state}`,
                          frontImage: room.card.frontImage,
                          backImage: room.card.blockedImage,
                          startOnBack: room.state === 'BLOCKED',
                        });
                      }}
                    >
                      🔍
                    </button>
                  </div>
                </div>

                {/* Room Surface Artwork + Status Pill + Standing 3D Figurines */}
                <div className="room-art-wrap">
                  <div className={room.state === 'BLOCKED' ? 'room-blocked-cover' : 'room-art-box'}>
                    <img
                      src={assetUrl(
                        room.state === 'BLOCKED' ? room.card.blockedImage : room.card.artImage,
                      )}
                      alt={
                        room.state === 'BLOCKED'
                          ? `${room.card.name} — Red Blocked`
                          : room.card.name
                      }
                      className="room-art-img"
                    />

                    {/* Top-left action/move badge */}
                    {move && (
                      <span className="room-move-banner">{getShortMoveLabel(move)}</span>
                    )}
                    {isIceCoffeeTarget && (
                      <span className="room-move-banner substep">
                        {isIceCoffeeSelected ? '✓ Selected' : 'Select'}
                      </span>
                    )}

                    {/* Top-right room state / just-hit badge */}
                    <div className="room-art-right-badges">
                      {isEventHit && <span className="room-status-pill just-hit">⚡ Hit</span>}
                      {room.state === 'CLUTTERED' && (
                        <span className="room-status-pill cluttered">Cluttered</span>
                      )}
                      {room.state === 'BLOCKED' && (
                        <span className="room-status-pill blocked">Blocked</span>
                      )}
                    </div>
                  </div>

                  {occupants.length > 0 && (
                    <div
                      className={`figurines-stage ${crowdClass}`}
                      aria-label={`Helpers in ${room.card.name}: ${occupants.map((h) => HELPER_DEFS[h].name).join(', ')}`}
                    >
                      {occupants.map((hid) => {
                        const def = HELPER_DEFS[hid];
                        const hState = state.helpers[hid];
                        const isActive =
                          hid === state.activeHelperId &&
                          state.phase !== 'WON' &&
                          state.phase !== 'LOST';
                        const isMekimi = hid === 'MEKIMI';
                        const errandTooltip =
                          hState.carriedErrands.length > 0
                            ? `Carrying: ${hState.carriedErrands
                                .map((e) => `${e.title} → ${ZONE_META[e.endZone!].shortName}`)
                                .join('; ')}`
                            : undefined;

                        return (
                          <div
                            key={hid}
                            className={`figurine-piece ${isActive ? 'is-active' : ''} ${
                              isMekimi ? 'is-mekimi' : ''
                            }`}
                            style={{ '--helper-color': def.accent } as React.CSSProperties}
                            title={errandTooltip}
                          >
                            <div className="figurine-shadow" />
                            <img
                              src={assetUrl(def.figurineImage)}
                              alt={`${def.name} 3D figurine`}
                              className="figurine-sprite"
                            />
                            <div className="figurine-plate">
                              <span>{def.name}</span>
                              {hState.carriedErrands.length > 0 && (
                                <span className="figurine-errand-pip" title={errandTooltip}>
                                  📦{hState.carriedErrands.length}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="room-footer">
                  <div className="room-name-block">
                    <span className="room-name">{room.card.name}</span>
                    {room.card.subtitle && (
                      <span className="room-subtitle">{room.card.subtitle}</span>
                    )}
                  </div>

                  {isActiveRoom && directRoomAction && (
                    <button
                      type="button"
                      className="room-quick-act-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickBoardAction(directRoomAction.id);
                      }}
                    >
                      {directRoomAction.type === 'TIDY_BLOCKED' ? 'Unblock Room' : '✨ Tidy Room'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
